"""Small, inspectable inventory and game-theory calculations."""
from math import erf, exp, lgamma, log, sqrt

import numpy as np


def inventory_formulas(demand: float, ordering: float, holding: float, deviation: float, lead_time: float = 1, z: float = 1.65) -> dict:
    """All inputs use a consistent period; lead time is in periods."""
    safety = z * deviation * sqrt(lead_time)
    return {'eoq': sqrt(2 * demand * ordering / holding) if holding > 0 else None,
            'safety_stock': safety, 'reorder_point': demand * lead_time + safety, 'lead_time': lead_time}


def find_nash_equilibria(payoff_matrix: list) -> list[list[int]]:
    """Find mutual pure best responses, including ties; [] means no pure equilibrium."""
    matrix = np.asarray(payoff_matrix, dtype=float)
    if matrix.ndim != 3 or matrix.shape[2] != 2 or not np.isfinite(matrix).all():
        raise ValueError('Expected a finite rectangular matrix of payoff pairs.')
    return [[i, j] for i in range(len(matrix)) for j in range(len(matrix[0]))
            if matrix[i, j, 0] >= matrix[:, j, 0].max() - 1e-9
            and matrix[i, j, 1] >= matrix[i, :, 1].max() - 1e-9]


def expected_utility(probabilities: list, utilities: list) -> float:
    """EU(a) = sum of belief-weighted state utilities."""
    return float(np.dot(probabilities, utilities))


def update_beliefs(prior: list, observation: int, centers: list, deviation: float, distribution: str) -> list[float]:
    """Bayes rule using likelihoods matching the rounded, nonnegative demand generator."""
    likelihoods = []
    for mean in centers:
        if distribution == 'poisson':
            likelihood = (1.0 if observation == 0 else 0.0) if mean == 0 else exp(observation * log(mean) - mean - lgamma(observation + 1))
        elif deviation == 0:
            likelihood = float(observation == round(mean))
        else:
            low = -float('inf') if observation == 0 else observation - 0.5
            high = observation + 0.5
            if distribution == 'normal':
                cdf = lambda x: (1 + erf((x - mean) / (deviation * sqrt(2)))) / 2
            else:
                half_width = sqrt(3) * deviation
                cdf = lambda x: max(0.0, min(1.0, (x - mean + half_width) / (2 * half_width)))
            likelihood = max(0.0, cdf(high) - cdf(low))
        likelihoods.append(likelihood)
    weights = np.array(prior) * likelihoods
    # ponytail: out-of-model manual observations keep the prior; add robust likelihoods for real data.
    return (weights / weights.sum()).tolist() if weights.sum() > 1e-250 else list(prior)


def payoff_analysis(config) -> dict:
    """Compute a two-player, one-period inventory subgame, not a full-chain equilibrium."""
    levels = [round(config.demand_mean * 0.7), round(config.demand_mean * 1.3)]
    demands = [config.demand_mean * factor for factor in (0.65, 1, 1.35)]
    matrix = []
    for supply in levels:
        row = []
        for order in levels:
            shipped = min(supply, order, config.storage_capacity)
            supplier = (config.supplier_price - config.transport_cost) * shipped - config.wholesale_price * supply - config.supplier_holding * (supply - shipped) - (config.ordering_cost if supply else 0)
            retailer = expected_utility(config.priors, [config.retail_price * min(shipped, d) - config.supplier_price * shipped - config.retailer_holding * max(0, shipped - d) - config.shortage_cost * max(0, d - shipped) for d in demands])
            row.append([round(supplier, 2), round(retailer, 2)])
        matrix.append(row)
    return {'levels': levels, 'matrix': matrix, 'equilibria': find_nash_equilibria(matrix)}
