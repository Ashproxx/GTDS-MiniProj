import { useState } from "react";
import { ArrowRight, Download, FlaskConical, Play, Trash2 } from "lucide-react";
import { api, download, label, money, number, percent } from "./api";
import { Chart, Note, Panel } from "./components";

export function Comparison({
  results,
  runAll,
  busy,
  experiment,
  runExperiment,
}) {
  const [count, setCount] = useState(100);
  const data = results.map((r) => ({
    name: `${label(r.config.game_type)} #${r.id}`,
    ...r.summary,
  }));
  const winner = results.length
    ? results.reduce((a, b) =>
        a.summary.total_profit > b.summary.total_profit ? a : b,
      )
    : null;
  return (
    <>
      <Panel
        title="Let the results make the argument."
        subtitle="Compare baseline, repeated and Bayesian policies on identical demand."
      >
        <div className="button-row">
          <button className="primary" disabled={busy} onClick={runAll}>
            <Play size={16} /> Run all strategies
          </button>
          <span className="muted">
            Uses the current simulation setup and seed.
          </span>
        </div>
      </Panel>
      {results.length > 0 && (
        <>
          <Note>
            Highest realized profit among these runs:{" "}
            <strong>
              {label(winner.config.game_type)} #{winner.id}
            </strong>
            , {money(winner.summary.total_profit)}.{" "}
            {new Set(
              results.map((r) =>
                JSON.stringify({ ...r.config, name: "", game_type: "" }),
              ),
            ).size > 1
              ? "These historical configurations differ; this is not a controlled comparison."
              : "The inputs and demand sequence are matched."}{" "}
            Improvement is measured, not guaranteed.
          </Note>
          <Panel title="Side-by-side results">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    {data.map((r) => (
                      <th key={r.name}>{r.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["total_profit", "Total profit", money],
                    ["total_cost", "Total external cost", money],
                    ["holding_cost", "Holding costs", money],
                    ["shortage_cost", "Shortage costs", money],
                    ["stockouts", "Stockout rounds", number],
                    ["service_level", "Service level", percent],
                    ["fill_rate", "Demand fill rate", percent],
                    ["average_inventory", "Average inventory", number],
                  ].map(([key, title, format]) => (
                    <tr key={key}>
                      <td>{title}</td>
                      {data.map((r) => (
                        <td key={r.name}>{format(r[key])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <div className="grid-two">
            {[
              ["total_profit", "Profit comparison"],
              ["total_cost", "External cost comparison"],
              ["stockouts", "Stockout comparison"],
              ["service_level", "Service level comparison"],
              ["average_inventory", "Average inventory comparison"],
            ].map(([key, title]) => (
              <Chart
                key={key}
                title={title}
                data={data}
                x="name"
                bar
                probability={key === "service_level"}
                series={[[key, title.replace(" comparison", "")]]}
              />
            ))}
          </div>
          <Panel title="Did coordination reduce the bullwhip effect?">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Run</th>
                    <th>Retailer order ratio</th>
                    <th>Supplier order ratio</th>
                    <th>Production ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {label(r.config.game_type)} #{r.id}
                      </td>
                      {Object.values(r.summary.bullwhip).map((v, i) => (
                        <td key={i}>{number(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted">
              Lower variance ratios mean less amplification in these runs. N/A
              means zero demand variance.
            </p>
          </Panel>
        </>
      )}
      <Panel
        title="Experiment mode"
        subtitle="Repeat all three models with paired seeds and measure variation."
      >
        <form
          className="button-row"
          onSubmit={(e) => {
            e.preventDefault();
            runExperiment(count);
          }}
        >
          <label>
            Experiments per model
            <input
              type="number"
              min="2"
              max="100"
              required
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
          <button className="primary" disabled={busy}>
            <FlaskConical size={17} /> Run experiments
          </button>
        </form>
        <p className="muted">
          Each experiment uses seed + index. Sample standard deviation
          summarizes uncertainty across runs. With manual demand, every
          experiment has the same observations.
        </p>
        {experiment && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Runs</th>
                    <th>Mean profit</th>
                    <th>Profit std. dev.</th>
                    <th>Avg. stockouts</th>
                    <th>Avg. service level</th>
                    <th>Avg. inventory</th>
                  </tr>
                </thead>
                <tbody>
                  {experiment.results.map((r) => (
                    <tr key={r.game_type}>
                      <td>{label(r.game_type)}</td>
                      <td>{r.count}</td>
                      <td>{money(r.mean_profit)}</td>
                      <td>{money(r.std_profit)}</td>
                      <td>{number(r.average_stockouts)}</td>
                      <td>{percent(r.average_service_level)}</td>
                      <td>{number(r.average_average_inventory)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="button-row">
              <button
                onClick={() => {
                  const rows = experiment.results;
                  const keys = Object.keys(rows[0]);
                  download(
                    "experiment-summary.csv",
                    [
                      keys.join(","),
                      ...rows.map((r) => keys.map((k) => r[k]).join(",")),
                    ].join("\n"),
                    "text/csv",
                  );
                }}
              >
                <Download size={15} /> Experiment CSV
              </button>
              <button
                onClick={() =>
                  download(
                    "experiment-complete.json",
                    JSON.stringify(experiment, null, 2),
                  )
                }
              >
                Results & parameters JSON
              </button>
            </div>
          </>
        )}
      </Panel>
    </>
  );
}

export function History({
  rows,
  open,
  remove,
  compare,
  busy,
  refresh,
  loadMore,
  hasMore,
}) {
  const [selected, setSelected] = useState([]);
  const validSelection = selected.filter((id) => rows.some((r) => r.id === id));
  return (
    <Panel
      title="Your experiment notebook"
      subtitle="Stored locally in SQLite. Select runs to compare past experiments."
      action={
        <button disabled={busy} onClick={refresh}>
          Refresh
        </button>
      }
    >
      <div className="button-row">
        <button
          disabled={busy || validSelection.length < 2}
          onClick={() => compare(validSelection)}
        >
          Compare selected ({validSelection.length})
        </button>
      </div>
      {!rows.length ? (
        <p className="muted">
          No saved simulations yet. Run the demo to create your first entry.
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Select</th>
                <th>Simulation</th>
                <th>Created</th>
                <th>Model</th>
                <th>Rounds</th>
                <th>Profit</th>
                <th>Service level</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select simulation ${r.id}`}
                      checked={validSelection.includes(r.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...validSelection, r.id]
                            : validSelection.filter((id) => id !== r.id),
                        )
                      }
                    />
                  </td>
                  <td>
                    <strong>{r.name}</strong>
                    <br />
                    <span className="muted">
                      #{r.id} · {r.config.product}
                    </span>
                  </td>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                  <td>{label(r.config.game_type)}</td>
                  <td>{r.config.rounds}</td>
                  <td>{money(r.summary.total_profit)}</td>
                  <td>{percent(r.summary.service_level)}</td>
                  <td>
                    <div className="button-row">
                      <button disabled={busy} onClick={() => open(r.id)}>
                        Open
                      </button>
                      <button
                        className="icon-button danger"
                        aria-label={`Delete simulation ${r.id}`}
                        disabled={busy}
                        onClick={() => remove(r.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hasMore && (
        <button disabled={busy} onClick={loadMore}>
          Load older simulations
        </button>
      )}
    </Panel>
  );
}

const concepts = [
  [
    "Game theory",
    "The study of decisions whose outcomes depend on what other decision-makers do. A supplier’s order affects production; a retailer’s order affects the supplier.",
  ],
  [
    "Strategic player",
    "An independent decision-maker with its own actions and payoff. Here, manufacturer, supplier and retailer each track inventory and profit.",
  ],
  [
    "Strategy and payoff",
    "A strategy maps information to an action. A payoff measures the outcome: revenue minus production or purchases, holding, ordering, transport and shortage costs.",
  ],
  [
    "Cooperation and defection",
    "Cooperation here means using shared demand information to coordinate replenishment. Defection uses a self-focused, inflated target. These are explicit teaching policies, not moral judgments.",
  ],
  [
    "Repeated interaction",
    "Agents meet over many rounds and remember prior outcomes. Tit-for-Tat responds to a partner’s last action. Discount δ measures how much future utility matters.",
  ],
  [
    "Bayesian uncertainty",
    "Demand has a hidden LOW, MEDIUM or HIGH regime. Players maintain probabilities, select actions using expected utility, then update those probabilities from observed demand.",
  ],
  [
    "Expected utility",
    "EU(a) = Σ P(state) × U(a, state). The Bayesian model evaluates three candidate stock targets and selects the largest expected one-period payoff.",
  ],
  [
    "Nash equilibrium",
    "A combination of actions where no single player can improve their payoff by changing only their own action. A pure equilibrium may not exist.",
  ],
  [
    "Inventory optimization",
    "Balancing the cost of unsold stock against the cost of lost demand. High service levels usually require additional stock or capacity.",
  ],
  [
    "Bullwhip effect",
    "Small changes in consumer demand may cause larger changes in orders upstream. The variance ratio compares each order stream against customer demand.",
  ],
  [
    "Safety stock and reorder point",
    "Safety stock buffers uncertainty. The reorder point triggers replenishment. The baseline orders up to mean demand + safety stock when inventory reaches its reorder point.",
  ],
];

export function Theory({ result }) {
  const [matrix, setMatrix] = useState("[[[3,3],[0,5]],[[5,0],[1,1]]]");
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState("");
  const analysis = result?.analysis;
  async function calculate(e) {
    e.preventDefault();
    setError("");
    try {
      setAnswer(
        (await api("/game/nash", { payoff_matrix: JSON.parse(matrix) }))
          .equilibria,
      );
    } catch (e) {
      setAnswer(null);
      setError(e.message);
    }
  }
  return (
    <>
      <Panel
        title="Game theory, made tangible"
        subtitle="Three strategic players. A shared market. Different incentives."
      >
        <div className="concept-grid">
          {concepts.map(([title, body]) => (
            <details key={title}>
              <summary>{title}</summary>
              <p>{body}</p>
            </details>
          ))}
        </div>
      </Panel>
      <Panel
        title="Payoff matrix from the current configuration"
        subtitle="Supplier chooses low / high stock; retailer chooses low / high order. Each cell is (supplier payoff, retailer expected payoff)."
      >
        {analysis ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Supplier ↓ / Retailer →</th>
                    {analysis.levels.map((v, i) => (
                      <th key={i}>
                        {i ? "High" : "Low"} order ({v})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysis.matrix.map((row, i) => (
                    <tr key={i}>
                      <th>
                        {i ? "High" : "Low"} stock ({analysis.levels[i]})
                      </th>
                      {row.map(([s, r], j) => (
                        <td
                          key={j}
                          className={
                            analysis.equilibria.some(
                              ([a, b]) => a === i && b === j,
                            )
                              ? "equilibrium"
                              : ""
                          }
                        >
                          ({money(s)}, {money(r)})
                          {analysis.equilibria.some(
                            ([a, b]) => a === i && b === j,
                          ) && <span className="tag">Nash equilibrium</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Note>
              {analysis.equilibria.length
                ? `${analysis.equilibria.length} pure equilibrium / equilibria found using mutual best responses.`
                : "No pure Nash equilibrium exists in this matrix."}{" "}
              This one-period subgame starts without inventory and uses base
              demand beliefs. It is distinct from the full simulation.
            </Note>
          </>
        ) : (
          <p>Run a simulation to calculate a supply-chain payoff matrix.</p>
        )}
      </Panel>
      <Panel
        title="Try your own payoff matrix"
        subtitle="Rows are Player 1 actions, columns are Player 2 actions; each cell is [Player 1 payoff, Player 2 payoff]."
      >
        <form onSubmit={calculate}>
          <label>
            Payoff matrix as JSON
            <textarea
              rows="3"
              value={matrix}
              onChange={(e) => setMatrix(e.target.value)}
            />
          </label>
          <button className="primary">
            Find pure Nash equilibria <ArrowRight size={16} />
          </button>
        </form>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {answer && (
          <p>
            {answer.length
              ? answer
                  .map(([i, j]) => `Row ${i + 1}, column ${j + 1}`)
                  .join(" · ")
              : "No pure equilibrium. Mixed strategies are outside this mini project."}
          </p>
        )}
      </Panel>
      <Panel title="Inventory formulas">
        <div className="formula-strip">
          <div>
            <span>Economic order quantity</span>
            <strong>√(2DS / H)</strong>
          </div>
          <div>
            <span>Safety stock</span>
            <strong>Zσ√L</strong>
          </div>
          <div>
            <span>Reorder point</span>
            <strong>μL + safety stock</strong>
          </div>
        </div>
        <p className="muted">
          Use consistent time units. D = demand per period, S = order cost, H =
          holding cost per unit per period, L = lead time in periods. The
          reference calculations use Z = 1.65 and L = 1; the physical simulation
          has same-round delivery.
        </p>
        {result && (
          <p>
            Current reference values: EOQ{" "}
            <strong>{number(result.formulas.eoq)}</strong> · Safety stock{" "}
            <strong>{number(result.formulas.safety_stock)}</strong> · Reorder
            point <strong>{number(result.formulas.reorder_point)}</strong>.
            These are suggestions; the simulation uses your configured reorder
            point and safety stock.
          </p>
        )}
      </Panel>
    </>
  );
}

export function About() {
  return (
    <>
      <Panel
        title="Supply Chain Inventory Optimization Using Game Theory"
        subtitle="An interactive college mini project"
      >
        <p>
          Model manufacturers, suppliers and retailers as strategic players
          making inventory decisions under uncertain demand using repeated games
          and Bayesian games.
        </p>
        <div className="concept-grid">
          {[
            [
              "Aim & objectives",
              "Explore how strategic coordination affects profit, holding costs, stockouts and service. Compare against a fixed reorder policy on identical demand.",
            ],
            [
              "Methodology",
              "Configure a product and demand model, choose a policy, run a seeded simulation, inspect individual decisions, compare policies, and repeat across seeds.",
            ],
            [
              "System architecture",
              "React + Vite + Tailwind + Recharts → REST API → FastAPI + NumPy simulation engine → SQLite through SQLAlchemy. No external services or paid APIs.",
            ],
            [
              "Game models",
              "Repeated interaction with memory, Tit-for-Tat and discounted payoffs; Bayesian finite-action expected utility with likelihood-based belief updates; pure Nash best responses for a two-player subgame.",
            ],
            [
              "Inventory models",
              "Fixed reorder baseline, stock balance, holding and shortage costs, EOQ, safety stock, reorder-point reference values and variance amplification.",
            ],
            [
              "Expected outcomes",
              "Evidence of trade-offs, not a predetermined winner. A policy can gain service while losing profit. Compare identical inputs and multiple seeds before drawing conclusions.",
            ],
            [
              "Limitations",
              "One product per run, fixed prices, same-round shipments, lost sales, shared public observations, no terminal inventory salvage, and simplified policies. Initial stock is treated as a sunk asset. No full dynamic Bayesian equilibrium is claimed.",
            ],
            [
              "Future scope",
              "Add shipment lead times, backorders, private demand signals and calibrated product data when a research question requires them.",
            ],
          ].map(([title, body]) => (
            <div key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Note>
        All displayed analytics come from the Python simulation. Saved runs
        remain on this computer. The application works offline after
        dependencies are installed.
      </Note>
    </>
  );
}
