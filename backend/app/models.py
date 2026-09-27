"""Validated, bounded inputs for a small local teaching simulator."""
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Nonnegative = Annotated[float, Field(ge=0, le=1_000_000)]
Units = Annotated[int, Field(ge=0, le=100_000)]
GameType = Literal['baseline', 'repeated', 'bayesian']


class Config(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    name: str = Field(default='Demo simulation', min_length=1, max_length=120)
    product: Literal['Everyday essentials', 'Seasonal apparel', 'Consumer electronics'] = 'Everyday essentials'
    rounds: int = Field(default=30, ge=1, le=100)
    seed: int = Field(default=42, ge=0, le=2**32 - 1000)
    game_type: GameType = 'repeated'
    strategy: Literal['conservative', 'balanced', 'aggressive', 'adaptive'] = 'adaptive'
    mechanism: Literal['tit_for_tat', 'always_cooperate', 'always_defect', 'adaptive'] = 'adaptive'
    distribution: Literal['normal', 'uniform', 'poisson'] = 'normal'
    demand_mean: float = Field(default=100, ge=0, le=10_000)
    demand_std: float = Field(default=20, ge=0, le=10_000)
    season: Literal['normal', 'festival', 'peak', 'off'] = 'normal'
    scenario: Literal['stable', 'spike', 'shortage', 'holding', 'festival', 'bullwhip', 'capacity', 'penalty'] = 'stable'
    manual_demand: list[Units] = Field(default_factory=list, max_length=100)
    capacity: Units = 180
    production_cost: Nonnegative = 20
    manufacturer_inventory: Units = 150
    manufacturer_holding: Nonnegative = 0.5
    wholesale_price: Nonnegative = 32
    supplier_inventory: Units = 120
    supplier_holding: Nonnegative = 1
    ordering_cost: Nonnegative = 25
    supplier_price: Nonnegative = 45
    storage_capacity: Units = 600
    transport_cost: Nonnegative = 1
    retailer_inventory: Units = 100
    retail_price: Nonnegative = 70
    retailer_holding: Nonnegative = 1.5
    shortage_cost: Nonnegative = 20
    reorder_point: Units = 100
    safety_stock: Units = 30
    discount: float = Field(default=0.95, ge=0, le=1)
    priors: list[Annotated[float, Field(gt=0, le=1)]] = Field(default_factory=lambda: [0.25, 0.5, 0.25], min_length=3, max_length=3)

    @model_validator(mode='after')
    def consistent(self):
        if abs(sum(self.priors) - 1) > 1e-6:
            raise ValueError('LOW, MEDIUM and HIGH probabilities must sum to 1.')
        if self.supplier_inventory > self.storage_capacity:
            raise ValueError('Supplier initial inventory exceeds storage capacity.')
        if self.manual_demand and len(self.manual_demand) != self.rounds:
            raise ValueError('Manual demand must contain exactly one value per round.')
        return self


class ExperimentRequest(BaseModel):
    config: Config = Field(default_factory=Config)
    count: int = Field(default=100, ge=2, le=100)


class NashRequest(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)
    payoff_matrix: list[list[tuple[float, float]]] = Field(min_length=1, max_length=20)

    @model_validator(mode='after')
    def rectangular(self):
        width = len(self.payoff_matrix[0])
        if not 1 <= width <= 20 or any(len(row) != width for row in self.payoff_matrix):
            raise ValueError('Use a rectangular matrix with 1–20 rows and columns.')
        return self
