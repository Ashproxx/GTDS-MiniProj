import csv
import io

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import api
from app.database import Base
from app.main import app


def test_health():
    with TestClient(app) as client:
        assert client.get('/api/health').json() == {'status': 'ok'}


@pytest.fixture
def client(tmp_path, monkeypatch):
    engine = create_engine(f'sqlite:///{tmp_path / "test.db"}')
    Base.metadata.create_all(engine)
    monkeypatch.setattr(api, 'Session', sessionmaker(engine))
    with TestClient(app) as test_client:
        yield test_client
    engine.dispose()


def test_run_history_exports_delete(client):
    response = client.post('/api/simulations/run', json={'rounds': 5})
    assert response.status_code == 200
    result = response.json()
    identifier = result['id']
    assert len(result['rounds']) == 5
    assert client.get('/api/simulations').json()[0]['id'] == identifier
    assert client.get(f'/api/simulations/{identifier}').json() == result
    rows = list(csv.DictReader(io.StringIO(client.get(f'/api/simulations/{identifier}/csv').text)))
    assert len(rows) == 5
    assert float(rows[-1]['cumulative_profit']) == result['summary']['total_profit']
    assert client.delete(f'/api/simulations/{identifier}').status_code == 200
    assert client.get(f'/api/simulations/{identifier}').status_code == 404
    assert client.get('/api/simulations').json() == []


def test_comparison_experiment_and_nash(client):
    results = client.post('/api/simulations/compare', json={'rounds': 3}).json()
    assert [r['config']['game_type'] for r in results] == ['baseline', 'repeated', 'bayesian']
    assert len({tuple(row['demand'] for row in r['rounds']) for r in results}) == 1
    experiment = client.post('/api/experiments', json={'count': 2, 'config': {'rounds': 3}}).json()
    assert len(experiment['results']) == 3
    assert all(r['std_profit'] >= 0 for r in experiment['results'])
    assert client.post('/api/game/nash', json={'payoff_matrix': [[[3, 3], [0, 5]], [[5, 0], [1, 1]]]}).json()['equilibria'] == [[1, 1]]
    assert client.post('/api/game/nash', json={'payoff_matrix': [[[1, 2]], []]}).status_code == 422
    assert client.post('/api/simulations/run', json={'priors': [1, 1, 1]}).status_code == 422
    assert client.post('/api/experiments', json={'count': 101}).status_code == 422
    assert client.post('/api/game/bayesian', json={'rounds': 1}).json()['config']['game_type'] == 'bayesian'
    assert client.post('/api/game/repeated', json={'rounds': 1}).json()['config']['game_type'] == 'repeated'
    assert len(client.get('/api/scenarios').json()) == 8


def test_nonfinite_and_malformed_inputs_return_validation_errors(client):
    response = client.post('/api/simulations/run', content='{"demand_mean":1e309}', headers={'Content-Type': 'application/json'})
    assert response.status_code == 422
    assert 'finite' in response.json()['detail'][0]['msg']
    assert client.post('/api/game/nash', content='{"payoff_matrix":[[[1e309,0]]]}', headers={'Content-Type': 'application/json'}).status_code == 422
    assert client.post('/api/simulations/run', content='broken', headers={'Content-Type': 'application/json'}).status_code == 422
