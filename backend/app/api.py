import csv
import io
import logging
from datetime import timezone

import numpy as np
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select

from .database import Session, Simulation
from .game_theory import find_nash_equilibria
from .models import Config, ExperimentRequest, NashRequest
from .scenarios import PRODUCTS, SCENARIOS
from .simulation import NAMES, simulate

router = APIRouter(prefix='/api')
logger = logging.getLogger(__name__)


def record(row: Simulation, detail=True) -> dict:
    data = row.result if detail else {'config': row.result['config'], 'summary': row.result['summary']}
    return {**data, 'id': row.id, 'name': row.name, 'created_at': row.created_at.replace(tzinfo=timezone.utc).isoformat()}


def save(result: dict) -> dict:
    with Session.begin() as session:
        row = Simulation(name=result['config']['name'], result=result)
        session.add(row)
        session.flush()
        saved = record(row)
    logger.info('Saved simulation %s', saved['id'])
    return saved


def csv_response(rows: list[dict], filename: str) -> Response:
    output = io.StringIO(newline='')
    writer = csv.DictWriter(output, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
    return Response(output.getvalue(), media_type='text/csv', headers={'Content-Disposition': f'attachment; filename="{filename}"'})


@router.get('/defaults')
def defaults():
    return {'config': Config().model_dump(), 'products': PRODUCTS}


@router.get('/scenarios')
def scenarios():
    return SCENARIOS


@router.post('/simulations')
@router.post('/simulations/run')
def run(config: Config):
    return save(simulate(config))


@router.post('/simulations/compare')
def compare(config: Config):
    # Same seed and parameters guarantee the identical hidden states and demand observations.
    return [save(simulate(config.model_copy(update={'game_type': game}))) for game in ['baseline', 'repeated', 'bayesian']]


@router.post('/experiments')
def experiments(request: ExperimentRequest):
    metrics = ['total_profit', 'stockouts', 'service_level', 'fill_rate', 'average_inventory']
    summaries = []
    for game in ['baseline', 'repeated', 'bayesian']:
        samples = [simulate(request.config.model_copy(update={'seed': request.config.seed + i, 'game_type': game}), log_run=False)['summary'] for i in range(request.count)]
        summaries.append({'game_type': game, 'count': request.count, 'mean_profit': float(np.mean([s['total_profit'] for s in samples])),
                          'std_profit': float(np.std([s['total_profit'] for s in samples], ddof=1)),
                          **{'average_' + key: float(np.mean([s[key] for s in samples])) for key in metrics[1:]}})
    logger.info('Completed %s paired experiments for each of three models', request.count)
    return {'config': request.config.model_dump(), 'results': summaries}


@router.post('/game/repeated')
def repeated(config: Config):
    return run(config.model_copy(update={'game_type': 'repeated'}))


@router.post('/game/bayesian')
def bayesian(config: Config):
    return run(config.model_copy(update={'game_type': 'bayesian'}))


@router.post('/game/nash')
def nash(request: NashRequest):
    return {'equilibria': find_nash_equilibria(request.payoff_matrix)}


@router.get('/simulations')
def history(limit: int = Query(default=100, ge=1, le=500), offset: int = Query(default=0, ge=0)):
    with Session() as session:
        return [record(row, detail=False) for row in session.scalars(select(Simulation).order_by(Simulation.id.desc()).offset(offset).limit(limit))]


@router.get('/simulations/{simulation_id}')
def get_simulation(simulation_id: int):
    with Session() as session:
        row = session.get(Simulation, simulation_id)
        if row is None:
            raise HTTPException(404, 'Simulation not found.')
        return record(row)


@router.delete('/simulations/{simulation_id}')
def delete(simulation_id: int):
    with Session.begin() as session:
        row = session.get(Simulation, simulation_id)
        if row is None:
            raise HTTPException(404, 'Simulation not found.')
        session.delete(row)
    logger.info('Deleted simulation %s', simulation_id)
    return {'deleted': simulation_id}


@router.get('/simulations/{simulation_id}/csv')
def export_csv(simulation_id: int):
    result = get_simulation(simulation_id)
    rows = []
    for row in result['rounds']:
        flat = {key: value for key, value in row.items() if not isinstance(value, (list, dict))}
        flat.update({f'{name}_{key}': value for name in NAMES for key, value in row[name].items() if not isinstance(value, dict)})
        rows.append(flat)
    return csv_response(rows, f'simulation-{simulation_id}.csv')
