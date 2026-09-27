import { useEffect, useState } from "react";
import {
  ArrowRight,
  Factory,
  Package,
  Pause,
  Play,
  ShoppingBag,
  Users,
} from "lucide-react";
import { label, money, number, percent } from "./api";
import {
  Chart,
  Exports,
  Metric,
  Note,
  Panel,
  players,
  RoundTable,
} from "./components";

export function Dashboard({ result }) {
  const s = result.summary;
  const rows = result.rounds;
  return (
    <>
      <div className="result-banner">
        <div>
          <span className="status-dot" /> Simulation complete{" "}
          <span className="subtle">
            / {result.config.rounds} rounds / seed {result.config.seed}
          </span>
        </div>
        <Exports result={result} />
      </div>
      <div className="metrics">
        <Metric
          title="Supply chain profit"
          value={money(s.total_profit)}
          note="Net operating profit across all three players"
          prominent
        />
        <Metric
          title="Demand fulfilled"
          value={percent(s.fill_rate)}
          note={`${number(s.fulfilled)} of ${number(s.total_demand)} units`}
        />
        <Metric
          title="Average inventory"
          value={number(s.average_inventory)}
          note="Combined end-of-round units"
        />
        <Metric
          title="Stockout rounds"
          value={s.stockouts}
          note={`${number(s.lost)} units of lost demand`}
        />
      </div>
      <div className="grid-two">
        <Chart
          title="Inventory across the chain"
          subtitle="Closing stock · units per round"
          data={rows}
          area
          series={players.map((p) => [`${p}.inventory`, label(p)])}
        />
        <Chart
          title="Demand meets supply"
          subtitle="Customer demand and actual units fulfilled"
          data={rows}
          series={[
            ["demand", "Demand"],
            ["fulfilled", "Fulfilled"],
          ]}
        />
      </div>
      <div className="metrics secondary-metrics">
        {players.map((n) => (
          <Metric
            key={n}
            title={`${label(n)} profit`}
            value={money(s[`${n}_profit`])}
            note="Revenue less player costs"
          />
        ))}
        <Metric
          title="Service level"
          value={percent(s.service_level)}
          note="Rounds without lost demand"
        />
      </div>
      <div className="grid-two">
        <Chart
          title="Cumulative profit by player"
          subtitle="Internal purchases are costs to the buyer"
          data={rows}
          series={players.map((p) => [`${p}.cumulative_profit`, label(p)])}
        />
        <Chart
          title="Where costs accumulate"
          subtitle="External costs only · internal transfers cancel"
          x="name"
          bar
          data={[
            "production_cost",
            "holding_cost",
            "shortage_cost",
            "ordering_cost",
            "transport_cost",
          ].map((k) => ({ name: label(k.replace("_cost", "")), cost: s[k] }))}
          series={[["cost", "Cost (₹)"]]}
        />
        <Chart
          title="Lost demand over time"
          subtitle="A nonzero bar marks a stockout round"
          data={rows}
          bar
          series={[["lost", "Lost units"]]}
        />
        <Chart
          title="Orders & production"
          subtitle="Watch variations propagate upstream"
          data={rows}
          series={[
            ["retailer_order", "Retailer orders"],
            ["supplier_order", "Supplier orders"],
            ["production", "Production"],
          ]}
        />
      </div>
      <div className="metrics secondary-metrics">
        <Metric
          title="Ending inventory"
          value={number(s.total_inventory)}
          note="Units remaining after the final round"
        />
        <Metric
          title="Holding costs"
          value={money(s.holding_cost)}
          note="All three players combined"
        />
        <Metric
          title="Shortage costs"
          value={money(s.shortage_cost)}
          note="Retailer lost-demand penalties"
        />
        <Metric
          title="Inventory turnover"
          value={number(s.inventory_turnover)}
          note="Horizon COGS / average inventory value"
        />
      </div>
      <div className="grid-two">
        <StrategyChart rows={rows} />
        <Chart
          title="Player utilities by round"
          subtitle="One-period net operating profit"
          data={rows}
          series={players.map((p) => [`${p}.profit`, label(p)])}
        />
      </div>
      <Panel title="What this run tells us">
        <p>
          The {label(result.config.game_type).toLowerCase()} model fulfilled{" "}
          <strong>{percent(s.fill_rate)}</strong> of demand and earned{" "}
          <strong>{money(s.total_profit)}</strong>. The retailer action with the
          highest observed mean profit was{" "}
          <strong>{label(result.action_performance[0].action)}</strong> (
          {money(result.action_performance[0].average_profit)} over{" "}
          {result.action_performance[0].rounds} rounds). This association does
          not establish that it caused better outcomes.
        </p>
        <Bullwhip result={result} />
      </Panel>
    </>
  );
}

function StrategyChart({ rows }) {
  const data = rows.map((r) => ({
    round: r.round,
    ...Object.fromEntries(
      players.map((p) => [
        p,
        ["DEFECT", "AGGRESSIVE_ORDER", "HIGH_INVENTORY"].includes(r[p].action)
          ? 1
          : 0,
      ]),
    ),
  }));
  return (
    <Chart
      title="Strategy evolution"
      subtitle="1 = defect / aggressive / high inventory; 0 = other (see round table)"
      data={data}
      series={players.map((p) => [p, label(p)])}
    />
  );
}

export function Bullwhip({ result }) {
  return (
    <>
      <div className="formula-strip">
        {Object.entries(result.summary.bullwhip).map(([key, value]) => (
          <div key={key}>
            <span>{label(key)} amplification</span>
            <strong>{value == null ? "N/A" : `${number(value)}×`}</strong>
          </div>
        ))}
      </div>
      <p className="muted">
        Variance of orders or production ÷ variance of demand. Above 1 indicates
        amplification. N/A means demand had zero variance. Use the comparison
        page to test whether coordination helps.
      </p>
    </>
  );
}

export function GameResults({ result, type, run, busy, config }) {
  const correct = result?.config.game_type === type;
  return (
    <>
      <Panel
        title={
          type === "repeated"
            ? "Today’s decisions shape tomorrow’s response."
            : "Decide with beliefs. Learn from demand."
        }
        subtitle={
          type === "repeated"
            ? "Repeated interaction · memory · discounted utility"
            : "Hidden market regime · expected utility · Bayesian inference"
        }
      >
        <p>
          {type === "repeated"
            ? "Each agent remembers previous actions and shortages. Tit-for-Tat mirrors a partner’s previous defection; Adaptive weighs a short-term incentive against discounted future coordination surplus. Agents choose production and orders before demand is revealed."
            : "Each player evaluates LOW, MEDIUM and HIGH inventory actions using belief-weighted payoffs. The current demand is then revealed. Bayes’ rule updates beliefs, and the transition model predicts the next round’s prior."}
        </p>
        <button
          className="primary"
          disabled={busy}
          onClick={() => run({ ...config, game_type: type }, type)}
        >
          Run {label(type)} game <ArrowRight size={16} />
        </button>
      </Panel>
      {correct ? (
        <>
          <div className="result-banner">
            <span>
              {result.name} · {result.config.rounds} rounds
            </span>
            <Exports result={result} />
          </div>
          {type === "bayesian" ? (
            <>
              <Chart
                title="How demand beliefs evolve"
                subtitle="Posterior probability after each observation"
                data={result.rounds}
                probability
                series={[
                  ["low", "LOW"],
                  ["medium", "MEDIUM"],
                  ["high", "HIGH"],
                ]}
              />
              <div className="belief-flow">
                <div>
                  Initial prior
                  <br />
                  <strong>
                    {result.config.priors.map(percent).join(" / ")}
                  </strong>
                </div>
                <ArrowRight />
                <div>
                  Last observation
                  <br />
                  <strong>{result.rounds.at(-1).demand} units</strong>
                </div>
                <ArrowRight />
                <div>
                  Final posterior
                  <br />
                  <strong>
                    {result.rounds.at(-1).posterior.map(percent).join(" / ")}
                  </strong>
                </div>
              </div>
              <Panel
                title="Final-round expected payoffs"
                subtitle="Each player’s evaluated actions; expected versus realized utility can differ."
              >
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>LOW</th>
                        <th>MEDIUM</th>
                        <th>HIGH</th>
                        <th>Selected</th>
                        <th>Realized utility</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((n) => (
                        <tr key={n}>
                          <td>{label(n)}</td>
                          {Object.values(
                            result.rounds.at(-1)[n].candidates,
                          ).map((v, i) => (
                            <td key={i}>{money(v)}</td>
                          ))}
                          <td>{label(result.rounds.at(-1)[n].action)}</td>
                          <td>{money(result.rounds.at(-1)[n].profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </>
          ) : (
            <>
              <Chart
                title="Cumulative repeated-game payoff"
                subtitle={`Discount factor δ = ${result.config.discount}; V = Σ δᵗ U(t)`}
                data={result.rounds}
                series={players.map((p) => [
                  `${p}.discounted_profit`,
                  label(p),
                ])}
              />
              <StrategyChart rows={result.rounds} />
            </>
          )}
          <Panel
            title="Every round, every decision"
            subtitle="Actual simulation data, available as CSV"
          >
            <RoundTable rows={result.rounds} bayesian={type === "bayesian"} />
          </Panel>
        </>
      ) : (
        <Note>
          Run this model to inspect its own decisions.{" "}
          {result
            ? `The currently loaded result uses ${label(result.config.game_type)}.`
            : "No result is loaded yet."}
        </Note>
      )}
    </>
  );
}

export function SupplyChain({ result }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [result.id]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () =>
        setIndex((i) => {
          if (i >= result.rounds.length - 1) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        }),
      800,
    );
    return () => clearInterval(timer);
  }, [playing, result.rounds.length]);
  const row = result.rounds[Math.min(index, result.rounds.length - 1)];
  const icons = [Factory, Package, ShoppingBag];
  return (
    <>
      <Panel
        title="Follow the flow"
        subtitle="Replay a completed simulation, one round at a time."
      >
        <div className="playback">
          <button
            className="primary"
            onClick={() => {
              if (index === result.rounds.length - 1) setIndex(0);
              setPlaying(!playing);
            }}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}{" "}
            {playing ? "Pause" : "Play"}
          </button>
          <label htmlFor="round-slider">
            Round {index + 1} / {result.rounds.length}
          </label>
          <input
            id="round-slider"
            type="range"
            min="0"
            max={result.rounds.length - 1}
            value={index}
            onChange={(e) => {
              setPlaying(false);
              setIndex(Number(e.target.value));
            }}
          />
        </div>
      </Panel>
      <div className={`chain-grid ${playing ? "playing" : ""}`}>
        {players.map((name, i) => {
          const p = row[name];
          const Icon = icons[i];
          return (
            <div className="chain-card" key={name}>
              <div className="chain-icon">
                <Icon size={26} />
              </div>
              <small>PLAYER 0{i + 1}</small>
              <h2>{label(name)}</h2>
              <span className="tag">{label(p.action)}</span>
              <div className="stock-number">
                {number(p.inventory)}
                <span>units in stock</span>
              </div>
              <dl>
                {[
                  ["Order / production", p.quantity],
                  ["Received / produced", p.received],
                  ["Shipped / sold", p.shipped],
                  ["Unit price", money(p.price)],
                  ["Revenue", money(p.revenue)],
                  ["Total costs", money(p.revenue - p.profit)],
                  ["Round profit", money(p.profit)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="flow-arrow">
                <ArrowRight />
              </div>
            </div>
          );
        })}
        <div className="chain-card customer">
          <Users size={30} />
          <small>THE MARKET</small>
          <h2>Customers</h2>
          <div className="stock-number">
            {row.demand}
            <span>units demanded</span>
          </div>
          <dl>
            <div>
              <dt>Fulfilled</dt>
              <dd>{row.fulfilled}</dd>
            </div>
            <div>
              <dt>Lost</dt>
              <dd>{row.lost}</dd>
            </div>
            <div>
              <dt>Hidden regime</dt>
              <dd>{row.hidden_state}</dd>
            </div>
          </dl>
        </div>
      </div>
      <Note>
        The physical sequence is production → manufacturer shipment → supplier
        shipment → customer sale. Orders flow upstream first. Arrows animate
        during replay; the values are stored simulation results.
      </Note>
      <Panel title="Bullwhip effect">
        <Bullwhip result={result} />
      </Panel>
      <Chart
        title="Demand variation versus upstream decisions"
        data={result.rounds}
        series={[
          ["demand", "Demand"],
          ["retailer_order", "Retailer orders"],
          ["supplier_order", "Supplier orders"],
          ["production", "Production"],
        ]}
      />
    </>
  );
}

export function Report({ result }) {
  return (
    <>
      <div className="report-title">
        <span className="eyebrow">SIMULATION REPORT</span>
        <h1>Supply Chain Inventory Optimization Using Game Theory</h1>
        <p>
          {result.name} · {new Date(result.created_at).toLocaleString()} · Run #
          {result.id}
        </p>
        <button className="primary no-print" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>
      <Dashboard result={result} />
      <Panel title="Simulation parameters">
        <dl className="parameter-grid">
          {Object.entries(result.config).map(([k, v]) => (
            <div key={k}>
              <dt>{label(k)}</dt>
              <dd>{Array.isArray(v) ? v.join(", ") || "None" : String(v)}</dd>
            </div>
          ))}
        </dl>
      </Panel>
      <Note>
        Model limitations: same-round replenishment, fixed prices, lost sales,
        shared public demand observations, no terminal inventory salvage.
        Game-theoretic agents use teaching heuristics and finite one-step
        actions, not a solved full-chain dynamic equilibrium.
      </Note>
    </>
  );
}
