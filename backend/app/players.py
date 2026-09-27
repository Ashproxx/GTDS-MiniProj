"""Three independent agents sharing the same accounting and decision rules."""
from dataclasses import dataclass, field

import numpy as np

from .game_theory import expected_utility, update_beliefs


@dataclass
class Player:
    inventory: int
    cost: float
    price: float
    holding: float
    shortage: float = 0
    ordering: float = 0
    transport: float = 0
    profit: float = 0
    strategy: str = 'balanced'
    historical_actions: list = field(default_factory=list)
    historical_profit: list = field(default_factory=list)
    beliefs: list = field(default_factory=lambda: [0.25, 0.5, 0.25])
    forecast: float = 100
    last_shortage: int = 0

    def choose_action(self, needs: list, config, limit: int, partner_action: str = 'COOPERATE') -> dict:
        """Choose before observing current demand; Bayesian actions maximize one-period EU."""
        expected = expected_utility(self.beliefs, needs)
        factor = {'conservative': 0.8, 'balanced': 1, 'aggressive': 1.25, 'adaptive': 1}[self.strategy]
        if config.game_type == 'baseline':
            target = round(config.demand_mean + config.safety_stock)
            quantity = max(0, target - self.inventory) if self.inventory <= config.reorder_point else 0
            action = 'FIXED_REORDER'
        elif config.game_type == 'bayesian':
            candidates = [min(limit, max(0, round(need + config.safety_stock * factor - self.inventory))) for need in needs]
            payoffs = [expected_utility(self.beliefs, [self.calculate_utility(min(self.inventory + q, d), q, max(0, self.inventory + q - d), max(0, d - self.inventory - q))['profit'] for d in needs]) for q in candidates]
            best = int(np.argmax(payoffs))
            quantity, action = candidates[best], ['LOW_INVENTORY', 'MEDIUM_INVENTORY', 'HIGH_INVENTORY'][best]
            return {'quantity': quantity, 'action': action, 'expected_utility': payoffs[best], 'candidates': dict(zip(['LOW', 'MEDIUM', 'HIGH'], payoffs))}
        else:
            if config.mechanism == 'always_cooperate':
                action = 'COOPERATE'
            elif config.mechanism == 'always_defect':
                action = 'DEFECT'
            elif config.mechanism == 'tit_for_tat':
                action = 'DEFECT' if partner_action == 'DEFECT' else 'COOPERATE'
            else:
                # One-step incentive versus discounted future coordination surplus.
                margin = max(0, self.price - self.cost)
                continuation = config.discount * margin * expected / max(0.05, 1 - config.discount)
                temptation = self.holding * config.safety_stock + margin * self.last_shortage
                action = 'COOPERATE' if continuation >= temptation else 'DEFECT'
            target = (expected if action == 'COOPERATE' else self.forecast * 1.25) * factor + config.safety_stock
            if self.strategy == 'adaptive':
                target += min(self.last_shortage, config.demand_mean * 0.5)
            if config.scenario == 'bullwhip' and action == 'DEFECT':
                target += max(0, expected - self.forecast) * 2
            quantity = max(0, round(target - self.inventory))
            if action == 'COOPERATE' and self.strategy in ('aggressive', 'conservative', 'balanced'):
                action = {'aggressive': 'AGGRESSIVE_ORDER', 'conservative': 'CONSERVATIVE_ORDER', 'balanced': 'BALANCED'}[self.strategy]
        return {'quantity': min(limit, quantity), 'action': action, 'expected_utility': None, 'candidates': {}}

    def calculate_utility(self, sold: float, received: float, ending: float, unmet: float) -> dict:
        revenue = self.price * sold
        purchase = self.cost * received
        holding = self.holding * ending
        shortage = self.shortage * unmet
        ordering = self.ordering if received > 0 else 0
        transport = self.transport * sold
        return {'revenue': revenue, 'purchase_cost': purchase, 'holding_cost': holding,
                'shortage_cost': shortage, 'ordering_cost': ordering, 'transport_cost': transport,
                'profit': revenue - purchase - holding - shortage - ordering - transport}

    def update_inventory(self, received: int, sold: int):
        if received < 0 or sold < 0 or sold > self.inventory + received:
            raise ValueError('Invalid inventory movement.')
        self.inventory += received - sold

    def observe_market(self, demand: float):
        self.forecast = 0.7 * self.forecast + 0.3 * demand

    def update_strategy(self, action: str, profit: float, unmet: int):
        self.historical_actions.append(action)
        self.historical_profit.append(profit)
        self.profit += profit
        self.last_shortage = unmet

    def update_beliefs(self, observation: int, centers: list, config):
        self.beliefs = update_beliefs(self.beliefs, observation, centers, config.demand_std, config.distribution)


class ManufacturerPlayer(Player):
    """Chooses production and sells to the supplier."""


class SupplierPlayer(Player):
    """Chooses purchases and sells to the retailer."""


class RetailerPlayer(Player):
    """Chooses replenishment and fulfills final customer demand."""
