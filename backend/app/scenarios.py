"""Small configuration presets, applied visibly in the setup form."""
SCENARIOS = [
    {'id': 'stable', 'name': 'Stable demand', 'description': 'A steady market with moderate uncertainty.', 'parameters': {'scenario': 'stable', 'demand_std': 12}},
    {'id': 'spike', 'name': 'Sudden demand spike', 'description': 'An unannounced three-round demand shock halfway through.', 'parameters': {'scenario': 'spike'}},
    {'id': 'shortage', 'name': 'Supply shortage', 'description': 'Production falls to 30% capacity in the middle third.', 'parameters': {'scenario': 'shortage'}},
    {'id': 'holding', 'name': 'High holding cost', 'description': 'Expensive warehousing rewards lean inventory.', 'parameters': {'scenario': 'holding', 'manufacturer_holding': 3, 'supplier_holding': 6, 'retailer_holding': 9}},
    {'id': 'festival', 'name': 'Festival demand', 'description': 'Known seasonal demand is 50% above normal.', 'parameters': {'scenario': 'festival', 'season': 'festival'}},
    {'id': 'bullwhip', 'name': 'Bullwhip effect', 'description': 'Defecting agents amplify order changes upstream; compare coordination.', 'parameters': {'scenario': 'bullwhip', 'demand_std': 35, 'mechanism': 'always_defect', 'strategy': 'aggressive'}},
    {'id': 'capacity', 'name': 'Low manufacturing capacity', 'description': 'A bottleneck limits production to 60 units per round.', 'parameters': {'scenario': 'capacity', 'capacity': 60}},
    {'id': 'penalty', 'name': 'High shortage penalty', 'description': 'Lost customer demand carries a large penalty.', 'parameters': {'scenario': 'penalty', 'shortage_cost': 90}},
]

PRODUCTS = [
    {'name': 'Everyday essentials', 'parameters': {}},
    {'name': 'Seasonal apparel', 'parameters': {'demand_mean': 80, 'demand_std': 30, 'production_cost': 35, 'wholesale_price': 55, 'supplier_price': 75, 'retail_price': 120, 'retailer_holding': 3, 'shortage_cost': 30}},
    {'name': 'Consumer electronics', 'parameters': {'demand_mean': 40, 'demand_std': 12, 'production_cost': 150, 'wholesale_price': 200, 'supplier_price': 250, 'retail_price': 350, 'retailer_holding': 8, 'shortage_cost': 60, 'reorder_point': 40, 'safety_stock': 12}},
]
