# Model notes for the viva

This is a discrete-period teaching simulation, not an industrial optimizer or proof of a full supply-chain equilibrium.

## Round sequence

1. Each agent starts with its own stock, cumulative profit, action/profit history and forecast.
2. Bayesian agents predict this round's prior from their last posterior. Other agents use the configured base beliefs.
3. Retailer chooses an order; supplier chooses an order; manufacturer chooses production. No agent sees realized demand at this stage.
4. Production is bounded by manufacturing capacity. Shipments are bounded by stock, orders and supplier storage space.
5. Customer demand is revealed, the retailer sells available units and unmet demand is lost.
6. Each player accounts for stock and profit, remembers the outcome, and updates its forecast. Bayesian players update beliefs from the public demand observation.

All deliveries arrive within the same round. There are no backorders or shipment queues. Prices are configurable but fixed during a run. One product is simulated at a time.

## Inventory and financial accounting

`ending stock = beginning stock + received - shipped`

For the manufacturer, received means newly produced units. For the retailer, shipped means customer sales.

`utility = revenue - production/purchase - holding - shortage - ordering - transport`

- Manufacturer pays unit production cost for new production and holding cost for remaining stock.
- Supplier pays the wholesale price for units received, a fixed ordering cost when a shipment arrives, transport cost per unit shipped and holding cost.
- Retailer pays supplier price for units received, holding cost and a penalty per unit of lost demand.
- Internal wholesale and supplier payments cancel in total-chain profit. Total external costs include production, holding, ordering, transport and shortage costs.
- Initial inventories are sunk assets: their earlier purchase/production expenses are not charged again. There is no terminal salvage revenue. These are horizon operating profits, not audited accounting statements.
- Fill rate is fulfilled units / demanded units. It is defined as 100% when total demand is zero.
- Service level is the fraction of rounds with no lost demand; it differs from fill rate.
- Average inventory uses combined closing stock across rounds.
- Turnover uses customer units sold × production cost divided by average beginning/ending inventory value, with **every stage valued at production cost**. It is horizon-specific, not annualized. A zero denominator produces N/A.

Reference formulas: `EOQ = sqrt(2DS/H)`, `SS = Zσsqrt(L)`, `ROP = μL + SS`. D and H use the same period. The reference tool uses Z=1.65, L=1; the actual same-round model uses configured safety stock and reorder point. H=0 makes EOQ undefined (N/A). These reference numbers do not silently override user configuration.

## Common uncertain demand

All models use the exact same generator. A local NumPy RNG is seeded per run. LOW, MEDIUM and HIGH regimes have means `0.65μ`, `μ`, `1.35μ`, multiplied by the selected season. The initial state is drawn from the configured prior. With probability 0.8 the state persists; otherwise it is redrawn from that prior.

Given the regime mean m:

- Normal: round a Normal(m, σ) draw and clamp below at zero.
- Uniform: round a Uniform(m−sqrt(3)σ, m+sqrt(3)σ) draw and clamp below at zero.
- Poisson: draw Poisson(m). The deviation field is unused for the distribution itself.

The mixture and clipping mean the overall observed mean/deviation can differ from the input base parameters. Manual nonnegative integer observations replace generated demand. Manual input must contain exactly one value per round. Hidden regime labels still refer to the synthetic trajectory and need not explain a manual observation.

The spike scenario doubles the true mean for three rounds at the midpoint, without telling the decision rules. The supply-shortage scenario reduces production capacity to 30% during the middle third. Other presets visibly change costs, season, capacity or mechanisms in the setup form.

## Baseline

Each player uses a fixed reorder point and orders/produces up to `μ + safety_stock` when current inventory is at or below the configured reorder point. This deliberately simple policy does not learn the demand regime or adjust for seasonality. Capacity and storage constraints still apply.

## Repeated game

The three agents have local memories, with these selectable common mechanisms:

- **Always Cooperate**: use expected downstream needs plus safety stock.
- **Always Defect**: use 1.25 times the player's smoothed local forecast plus safety stock.
- **Tit-for-Tat**: start cooperative; defect if the selected partner defected in the previous round. Manufacturer and retailer observe supplier; supplier observes retailer. An all-cooperative population stays cooperative.
- **Adaptive**: compare a heuristic discounted continuation surplus `δ × positive_margin × expected_needs / max(0.05, 1−δ)` against `holding × safety_stock + positive_margin × previous_unmet`. Cooperate when continuation is at least temptation. The 0.05 denominator floor bounds this teaching heuristic near δ=1; it is not a solved infinite-horizon game.

Conservative, balanced and aggressive profiles scale targets by 0.8, 1 or 1.25. The adaptive profile adds a bounded buffer after unmet orders/demand. Cooperating players observe public customer demand; defecting players use local downstream demand. Forecasts use `0.7 old + 0.3 observation`. The bullwhip preset adds amplification of positive order changes for defectors.

Actual discounted payoff is calculated without the heuristic floor: `V_i = Σ δ^t U_i(t)`, starting at t=0. The mechanism's continuation calculation is an incentive heuristic; it does not certify an equilibrium.

## Bayesian game

Each agent evaluates three candidate quantities targeting low/medium/high expected needs plus a safety buffer, minus its current stock, and clipped to its available capacity. The retailer uses the three demand regime centers. Upstream players use hypothetical state-dependent downstream replenishment needs.

`EU(a) = Σ_s belief(s) × utility(a, s)`

The largest one-period expected utility wins; ties choose the first/lowest candidate. Expected utility evaluates regime **centers**, rather than integrating over all within-regime demand noise. It assumes the candidate order can arrive in full. Actual shipments may be smaller because an upstream player has different incentives or limited stock. Expected and actual utilities therefore need not match.

Belief update after observing demand d:

`posterior(s) = prior(s) × likelihood(d | s) / Σ_k prior(k) × likelihood(d | k)`

The likelihood matches the observation distribution: probability mass in the rounding bin for Normal/Uniform (with all negative draws combined into observation zero), or the Poisson PMF. Zero deviation becomes a point mass. The next-round prediction is `0.8 posterior + 0.2 base_prior`, matching the hidden-state transition. Impossible out-of-model observations or numerical underflow keep the prior instead of producing NaNs. All agents share the same public signal, so their beliefs coincide. This is a finite-action Bayesian decision game, not a claimed Bayesian Nash equilibrium with private types.

## Nash analysis

The displayed supplier/retailer subgame uses two requested levels (0.7μ and 1.3μ), zero initial stock and configured base state probabilities. Supplier purchases are clipped to storage capacity. Each payoff is computed using configured prices and costs. This illustrative subgame does not reproduce the entire multi-round supply chain.

For each cell, the solver checks whether Player 1 has the largest payoff in its column and Player 2 has the largest payoff in its row. Ties are retained. An empty list means there is no pure equilibrium; mixed equilibria are outside scope. The custom-matrix API accepts 1–20 rows/columns of finite payoff pairs.

## Comparing evidence

`bullwhip ratio = variance(orders or production) / variance(customer demand)`

Zero demand variance gives N/A. A lower ratio means less amplification in that run. Do not assume every policy reduces it.

Run All Strategies holds parameters, seed, latent states and observed demands constant. Experiment mode repeats all models using seeds `seed + index`, reports means and **sample** profit standard deviation, and does not write hundreds of records to history. A historical comparison with differing configurations is labeled uncontrolled. A best observed action is descriptive, not a causal claim.

Experiment downloads regenerate the original bounded, seeded experiment on the backend. This keeps native CSV/JSON downloads reliable without adding a separate batch-history table. Changing the setup after an experiment does not change its export configuration.
