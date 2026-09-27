"""Seeded, same-period physical flows with explicit profit accounting."""
import logging

import numpy as np

from .game_theory import inventory_formulas, payoff_analysis
from .models import Config
from .players import ManufacturerPlayer, RetailerPlayer, SupplierPlayer

logger = logging.getLogger(__name__)
NAMES = ['manufacturer', 'supplier', 'retailer']
STATES = ['LOW', 'MEDIUM', 'HIGH']


def demand_centers(config: Config, round_index: int) -> list[float]:
    multiplier = {'normal': 1, 'festival': 1.5, 'peak': 1.8, 'off': 0.65}[config.season]
    return [config.demand_mean * multiplier * f for f in (0.65, 1, 1.35)]


def generate_demand(config: Config) -> list[dict]:
    """Hidden state persists with probability .8; otherwise it is redrawn from the base prior."""
    rng = np.random.default_rng(config.seed)
    state = int(rng.choice(3, p=config.priors))
    trajectory = []
    for t in range(config.rounds):
        if t and rng.random() >= 0.8:
            state = int(rng.choice(3, p=config.priors))
        centers = demand_centers(config, t)
        mean = centers[state]
        if config.scenario == 'spike' and config.rounds // 2 <= t < config.rounds // 2 + 3:
            mean *= 2
        if config.distribution == 'poisson':
            demand = int(rng.poisson(mean))
        elif config.distribution == 'uniform':
            width = np.sqrt(3) * config.demand_std
            demand = round(rng.uniform(mean - width, mean + width))
        else:
            demand = round(rng.normal(mean, config.demand_std))
        trajectory.append({'demand': config.manual_demand[t] if config.manual_demand else max(0, demand), 'hidden_state': STATES[state], 'centers': centers})
    return trajectory


def simulate(config: Config, *, log_run: bool = True) -> dict:
    if log_run:
        logger.info('Simulation start: %s, %s rounds, seed %s', config.game_type, config.rounds, config.seed)
    m = ManufacturerPlayer(config.manufacturer_inventory, config.production_cost, config.wholesale_price, config.manufacturer_holding)
    s = SupplierPlayer(config.supplier_inventory, config.wholesale_price, config.supplier_price, config.supplier_holding, ordering=config.ordering_cost, transport=config.transport_cost)
    r = RetailerPlayer(config.retailer_inventory, config.supplier_price, config.retail_price, config.retailer_holding, shortage=config.shortage_cost)
    players = [m, s, r]
    for player in players:
        player.strategy, player.beliefs, player.forecast = config.strategy, list(config.priors), config.demand_mean
    rows = []
    cumulative = 0
    discounted = {name: 0.0 for name in NAMES}
    for t, market in enumerate(generate_demand(config)):
        if t and config.game_type == 'bayesian':
            for player in players:
                player.beliefs = [0.8 * p + 0.2 * base for p, base in zip(player.beliefs, config.priors)]
        prior = list(r.beliefs)
        start = [p.inventory for p in players]
        needs = market['centers']
        previous = [p.historical_actions[-1] if t else 'COOPERATE' for p in players]
        rd = r.choose_action(needs, config, 100_000, previous[1])
        # Propagate hypothetical state-dependent downstream orders, never the realized demand.
        supplier_needs = [max(0, round(d + config.safety_stock - r.inventory)) for d in needs] if config.game_type == 'bayesian' else [rd['quantity']] * 3
        sd = s.choose_action(supplier_needs, config, max(0, config.storage_capacity - s.inventory), previous[2])
        manufacturer_needs = [max(0, round(d + config.safety_stock - s.inventory)) for d in supplier_needs] if config.game_type == 'bayesian' else [sd['quantity']] * 3
        capacity = config.capacity
        if config.scenario == 'shortage' and config.rounds // 3 <= t < 2 * config.rounds // 3:
            capacity = round(capacity * 0.3)
        md = m.choose_action(manufacturer_needs, config, capacity, previous[1])
        production = md['quantity']
        ms = min(m.inventory + production, sd['quantity'])
        sr = min(s.inventory + ms, rd['quantity'])
        demand = market['demand']  # Reveal only after all three decisions are fixed.
        sold = min(r.inventory + sr, demand)
        movements = [(production, ms, max(0, sd['quantity'] - ms)), (ms, sr, max(0, rd['quantity'] - sr)), (sr, sold, demand - sold)]
        row = {'round': t + 1, 'demand': demand, 'fulfilled': sold, 'lost': demand - sold,
               'hidden_state': market['hidden_state'], 'prior': prior, 'production': production,
               'supplier_order': sd['quantity'], 'retailer_order': rd['quantity'], 'manufacturer_shipment': ms, 'supplier_shipment': sr}
        round_profit = 0
        for name, player, decision, (received, shipped, unmet), beginning in zip(NAMES, players, [md, sd, rd], movements, start):
            player.update_inventory(received, shipped)
            utility = player.calculate_utility(shipped, received, player.inventory, unmet)
            player.update_strategy(decision['action'], utility['profit'], unmet)
            player.observe_market(demand if config.game_type == 'repeated' and decision['action'] != 'DEFECT' else shipped + unmet)
            if config.game_type == 'bayesian':
                player.update_beliefs(demand, needs, config)
            discounted[name] += config.discount**t * utility['profit']
            row[name] = {**utility, **decision, 'inventory': player.inventory, 'beginning_inventory': beginning,
                         'received': received, 'shipped': shipped, 'unmet': unmet, 'price': player.price,
                         'cumulative_profit': player.profit, 'discounted_profit': discounted[name]}
            round_profit += utility['profit']
        cumulative += round_profit
        row.update(total_profit=round_profit, cumulative_profit=cumulative, total_inventory=sum(p.inventory for p in players),
                   posterior=list(r.beliefs), low=r.beliefs[0], medium=r.beliefs[1], high=r.beliefs[2])
        rows.append(row)
    total_demand = sum(row['demand'] for row in rows)
    fulfilled = sum(row['fulfilled'] for row in rows)
    average_inventory = float(np.mean([row['total_inventory'] for row in rows]))
    # Consolidated COGS and all stages of inventory use production cost, eliminating transfer markups.
    average_value = float(np.mean([sum((row[name]['beginning_inventory'] + row[name]['inventory']) / 2 for name in NAMES) * config.production_cost for row in rows]))
    costs = {key: sum(row[name][key] for row in rows for name in NAMES) for key in ['holding_cost', 'shortage_cost', 'ordering_cost', 'transport_cost']}
    costs['production_cost'] = sum(row['production'] for row in rows) * config.production_cost
    demand_variance = float(np.var([row['demand'] for row in rows]))
    ratios = {key: float(np.var([row[key] for row in rows])) / demand_variance if demand_variance else None for key in ['retailer_order', 'supplier_order', 'production']}
    summary = {'total_profit': cumulative, **{name + '_profit': p.profit for name, p in zip(NAMES, players)},
               'total_demand': total_demand, 'fulfilled': fulfilled, 'lost': total_demand - fulfilled,
               'fill_rate': fulfilled / total_demand if total_demand else 1,
               'service_level': sum(row['lost'] == 0 for row in rows) / len(rows),
               'stockouts': sum(row['lost'] > 0 for row in rows), 'average_inventory': average_inventory,
               'total_inventory': rows[-1]['total_inventory'], 'inventory_turnover': fulfilled * config.production_cost / average_value if average_value else None,
               'total_cost': sum(costs.values()), **costs, 'bullwhip': ratios, 'discounted_profit': discounted}
    actions = {}
    for row in rows:
        action = row['retailer']['action']
        actions.setdefault(action, []).append(row['retailer']['profit'])
    action_performance = [{'action': action, 'rounds': len(values), 'average_profit': float(np.mean(values))} for action, values in actions.items()]
    result = {'config': config.model_dump(), 'rounds': rows, 'summary': summary,
              'action_performance': sorted(action_performance, key=lambda x: x['average_profit'], reverse=True),
              'formulas': inventory_formulas(config.demand_mean, config.ordering_cost, config.retailer_holding, config.demand_std),
              'analysis': payoff_analysis(config)}
    if log_run:
        logger.info('Simulation complete: profit %.2f, fill rate %.1f%%', cumulative, summary['fill_rate'] * 100)
    return result
