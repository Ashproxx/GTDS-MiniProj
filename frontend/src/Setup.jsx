import { Play, RotateCcw } from "lucide-react";
import { label } from "./api";
import { Note, Panel } from "./components";

const groups = [
  [
    "Market & experiment",
    [
      ["rounds", "Simulation rounds", 1, 100],
      ["seed", "Random seed", 0, 4294966296],
      ["demand_mean", "Mean demand / round"],
      ["demand_std", "Demand deviation"],
      ["discount", "Discount factor δ", 0, 1, 0.01],
    ],
  ],
  [
    "Manufacturer",
    [
      ["capacity", "Production capacity (units)"],
      ["production_cost", "Unit production cost (₹)"],
      ["manufacturer_inventory", "Initial inventory"],
      ["manufacturer_holding", "Holding cost / unit / round (₹)"],
      ["wholesale_price", "Wholesale price (₹)"],
    ],
  ],
  [
    "Supplier / distributor",
    [
      ["supplier_inventory", "Initial inventory"],
      ["supplier_holding", "Holding cost / unit / round (₹)"],
      ["ordering_cost", "Fixed replenishment cost (₹)"],
      ["supplier_price", "Selling price to retailer (₹)"],
      ["storage_capacity", "Storage capacity (units)"],
      ["transport_cost", "Transport cost / shipped unit (₹)"],
    ],
  ],
  [
    "Retailer",
    [
      ["retailer_inventory", "Initial inventory"],
      ["retail_price", "Retail price (₹)"],
      ["retailer_holding", "Holding cost / unit / round (₹)"],
      ["shortage_cost", "Penalty / lost unit (₹)"],
      ["reorder_point", "Reorder point (units)"],
      ["safety_stock", "Safety stock (units)"],
    ],
  ],
];

export default function Setup({
  config,
  setConfig,
  defaults,
  products,
  run,
  busy,
}) {
  const set = (key, value) => setConfig((c) => ({ ...c, [key]: value }));
  const select = (key, options) => (
    <label key={key}>
      {label(key)}
      <select value={config[key]} onChange={(e) => set(key, e.target.value)}>
        {options.map((v) => (
          <option key={v} value={v}>
            {label(v)}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(config);
      }}
    >
      <div className="section-intro">
        <div>
          <span className="eyebrow">DESIGN YOUR EXPERIMENT</span>
          <h2>A few inputs. A whole supply chain.</h2>
          <p>
            Prices use ₹ for the demo. All quantities are units; costs accrue
            each round.
          </p>
        </div>
        <button type="button" onClick={() => setConfig({ ...defaults })}>
          <RotateCcw size={15} /> Reset defaults
        </button>
      </div>
      <Panel
        title="Simulation model"
        subtitle="Start with the defaults, then change one variable at a time."
      >
        <div className="form-grid">
          <label>
            Simulation name
            <input
              required
              maxLength={120}
              value={config.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </label>
          <label>
            Product
            <select
              value={config.product}
              onChange={(e) =>
                setConfig({
                  ...defaults,
                  ...products.find((p) => p.name === e.target.value).parameters,
                  product: e.target.value,
                })
              }
            >
              {products.map((p) => (
                <option key={p.name}>{p.name}</option>
              ))}
            </select>
          </label>
          {select("game_type", ["baseline", "repeated", "bayesian"])}
          {select("strategy", [
            "conservative",
            "balanced",
            "aggressive",
            "adaptive",
          ])}
          {select("mechanism", [
            "adaptive",
            "tit_for_tat",
            "always_cooperate",
            "always_defect",
          ])}
          {select("distribution", ["normal", "uniform", "poisson"])}
          {select("season", ["normal", "festival", "peak", "off"])}
        </div>
        <Note>
          Mechanism and discount factor apply to repeated games. Baseline uses a
          fixed reorder point. Bayesian agents maximize expected utility over
          three candidate inventory levels. Poisson variance equals its mean.
        </Note>
      </Panel>
      {groups.map(([title, fields]) => (
        <Panel title={title} key={title}>
          <div className="form-grid">
            {fields.map(
              ([
                key,
                text,
                min = 0,
                max = key.includes("cost") ||
                key.includes("price") ||
                key.includes("holding")
                  ? 1000000
                  : 100000,
                step = key.includes("cost") ||
                key.includes("price") ||
                key.includes("holding") ||
                key.startsWith("demand_")
                  ? 0.1
                  : 1,
              ]) => (
                <label key={key}>
                  {text}
                  <input
                    type="number"
                    required
                    min={min}
                    max={key.startsWith("demand_") ? 10000 : max}
                    step={step}
                    value={config[key]}
                    onChange={(e) =>
                      set(
                        key,
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                  />
                </label>
              ),
            )}
          </div>
        </Panel>
      ))}
      <Panel
        title="Demand beliefs & manual observations"
        subtitle="Probabilities must be positive and sum to 1. They describe LOW, MEDIUM and HIGH market regimes."
      >
        <div className="form-grid">
          {["LOW", "MEDIUM", "HIGH"].map((state, i) => (
            <label key={state}>
              {state} probability
              <input
                type="number"
                min="0.001"
                max="1"
                step="0.001"
                required
                value={config.priors[i]}
                onChange={(e) =>
                  set(
                    "priors",
                    config.priors.map((p, j) =>
                      i === j ? Number(e.target.value) : p,
                    ),
                  )
                }
              />
            </label>
          ))}
        </div>
        <label className="wide-label">
          Manual demand (optional; exactly {config.rounds} comma-separated
          nonnegative integers)
          <input
            placeholder="Leave blank for seeded random demand"
            value={config.manual_demand.join(",")}
            onChange={(e) =>
              set(
                "manual_demand",
                e.target.value === ""
                  ? []
                  : e.target.value.split(",").map((v) => v.trim()),
              )
            }
          />
        </label>
        <Note>
          Hidden demand regimes persist with probability 0.8. Seasonal demand is
          known; the sudden-spike scenario is unannounced. Replenishment arrives
          within the current round.
        </Note>
      </Panel>
      <div className="form-footer">
        <span>
          Active scenario: <strong>{label(config.scenario)}</strong>
        </span>
        <button className="primary" disabled={busy} type="submit">
          <Play size={17} /> {busy ? "Running simulation…" : "Run simulation"}
        </button>
      </div>
    </form>
  );
}
