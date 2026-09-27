import math

import numpy as np
import pytest
from pydantic import ValidationError

from app.game_theory import expected_utility, find_nash_equilibria, inventory_formulas, update_beliefs
from app.models import Config
from app.players import RetailerPlayer
from app.simulation import generate_demand, simulate


@pytest.mark.parametrize('distribution', ['normal', 'poisson', 'uniform'])
def test_demand_repeatability_and_bounds(distribution):
    c = Config(distribution=distribution)
    assert generate_demand(c) == generate_demand(c)
    assert all(row['demand'] >= 0 for row in generate_demand(c))


@pytest.mark.parametrize('game_type', ['baseline', 'repeated', 'bayesian'])
def test_physical_and_money_conservation(game_type):
    c = Config(game_type=game_type)
    result = simulate(c)
    for row in result['rounds']:
        for name in ['manufacturer', 'supplier', 'retailer']:
            p = row[name]
            assert p['inventory'] == p['beginning_inventory'] + p['received'] - p['shipped']
            assert p['inventory'] >= 0
        assert row['production'] <= c.capacity
        assert row['supplier']['inventory'] <= c.storage_capacity
        assert row['fulfilled'] + row['lost'] == row['demand']
        assert row['total_profit'] == pytest.approx(sum(row[n]['profit'] for n in ['manufacturer', 'supplier', 'retailer']))
        external_cost = row['production'] * c.production_cost + sum(row[n][k] for n in ['manufacturer', 'supplier', 'retailer'] for k in ['holding_cost', 'shortage_cost', 'ordering_cost', 'transport_cost'])
        assert row['total_profit'] == pytest.approx(row['fulfilled'] * c.retail_price - external_cost)
        assert sum(row['posterior']) == pytest.approx(1)
    assert result['summary']['total_profit'] == pytest.approx(sum(r['total_profit'] for r in result['rounds']))


def test_formulas_and_utility():
    assert inventory_formulas(100, 25, 2, 20)['eoq'] == 50
    assert inventory_formulas(100, 25, 0, 20)['eoq'] is None
    p = RetailerPlayer(10, 3, 8, 1, shortage=2)
    assert p.calculate_utility(7, 2, 5, 3)['profit'] == 39
    assert expected_utility([0.25, 0.5, 0.25], [0, 100, 200]) == 100


def test_bayesian_inference_and_best_action():
    prior = [0.25, 0.5, 0.25]
    posterior = update_beliefs(prior, 135, [65, 100, 135], 10, 'normal')
    assert posterior[2] > 0.99
    assert update_beliefs(prior, 500, [65, 100, 135], 0, 'normal') == prior
    c = Config(game_type='bayesian')
    player = RetailerPlayer(0, 45, 70, 1.5, shortage=20)
    decision = player.choose_action([65, 100, 135], c, 1000)
    assert decision['expected_utility'] == max(decision['candidates'].values())


def test_repeated_memory_and_discount():
    c = Config(game_type='repeated', mechanism='tit_for_tat')
    p = RetailerPlayer(0, 45, 70, 1)
    assert p.choose_action([100] * 3, c, 1000, 'DEFECT')['action'] == 'DEFECT'
    assert p.choose_action([100] * 3, c, 1000, 'COOPERATE')['action'] != 'DEFECT'
    p.observe_market(200)
    assert p.forecast == 130
    result = simulate(c)
    assert result['summary']['discounted_profit']['retailer'] == pytest.approx(sum(c.discount**i * r['retailer']['profit'] for i, r in enumerate(result['rounds'])))


def test_nash():
    assert find_nash_equilibria([[(3, 3), (0, 5)], [(5, 0), (1, 1)]]) == [[1, 1]]
    assert find_nash_equilibria([[(1, -1), (-1, 1)], [(-1, 1), (1, -1)]]) == []
    assert len(find_nash_equilibria([[(0, 0)] * 2] * 2)) == 4


@pytest.mark.parametrize('bad', [{'rounds': 0}, {'priors': [0.2, 0.2, 0.2]}, {'capacity': -1}, {'demand_mean': math.inf}, {'manual_demand': [4]}, {'supplier_inventory': 601}, {'unexpected': 1}])
def test_validation(bad):
    with pytest.raises(ValidationError):
        Config(**bad)


def test_comparisons_no_future_leakage_and_zero_demand():
    results = [simulate(Config(game_type=g)) for g in ['baseline', 'repeated', 'bayesian']]
    assert all([r['demand'] for r in result['rounds']] == [r['demand'] for r in results[0]['rounds']] for result in results)
    for game in ['repeated', 'bayesian']:
        first = simulate(Config(rounds=1, game_type=game, manual_demand=[1]))['rounds'][0]
        second = simulate(Config(rounds=1, game_type=game, manual_demand=[1000]))['rounds'][0]
        assert [first[n]['quantity'] for n in ['manufacturer', 'supplier', 'retailer']] == [second[n]['quantity'] for n in ['manufacturer', 'supplier', 'retailer']]
    empty = simulate(Config(demand_mean=0, demand_std=0))['summary']
    assert empty['fill_rate'] == 1 and empty['bullwhip']['production'] is None
