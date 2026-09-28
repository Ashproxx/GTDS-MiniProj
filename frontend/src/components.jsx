import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, Info, Play, Download } from "lucide-react";
import { label, money, number, percent } from "./api";

export const colors = ["#227360", "#f19d54", "#8197c6", "#c95e66"];
export const players = ["manufacturer", "supplier", "retailer"];

export function Panel({ title, subtitle, children, className = "", action }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Chart({
  title,
  subtitle,
  data,
  series,
  x = "round",
  bar = false,
  area = false,
  probability = false,
}) {
  const domain = probability
    ? [0, 1]
    : bar
      ? [(min) => Math.min(0, min), (max) => Math.max(0, max)]
      : ["auto", "auto"];
  return (
    <Panel title={title} subtitle={subtitle}>
      <div
        className="chart"
        role="img"
        aria-label={`${title}. ${subtitle || ""} Exact values are available in tables and CSV exports.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 14, left: 0, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 5"
              vertical={false}
              stroke="#e8ece8"
            />
            <XAxis
              dataKey={x}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#7a8881" }}
              minTickGap={20}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#7a8881" }}
              width={60}
              domain={domain}
              tickFormatter={(v) =>
                probability
                  ? `${Math.round(v * 100)}%`
                  : Math.abs(v) >= 1000
                    ? `${number(v / 1000)}k`
                    : number(v)
              }
            />
            <Tooltip
              formatter={(v) => (probability ? percent(v) : number(v))}
              contentStyle={{ borderRadius: 10, border: "1px solid #dce5df" }}
            />
            <Legend
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
            />
            {series.map(([key, name], i) =>
              bar ? (
                <Bar
                  key={key}
                  dataKey={key}
                  name={name}
                  fill={colors[i % colors.length]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  isAnimationActive={false}
                />
              ) : area ? (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={name}
                  stroke={colors[i % colors.length]}
                  fill={colors[i % colors.length]}
                  fillOpacity={0.08}
                  strokeWidth={2.5}
                  isAnimationActive={false}
                />
              ) : (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={name}
                  stroke={colors[i % colors.length]}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              ),
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export function Metric({ title, value, note, prominent = false }) {
  return (
    <div className={`metric ${prominent ? "prominent" : ""}`}>
      <div className="metric-title">
        {title}
        <ArrowUpRight size={16} />
      </div>
      <strong>{value}</strong>
      <span>{note}</span>
    </div>
  );
}

export function Empty({
  run,
  busy,
  title = "Your next decision starts here.",
}) {
  return (
    <div className="empty panel">
      <div className="empty-icon">
        <Play />
      </div>
      <h2>{title}</h2>
      <p>
        Run the 30-round demo to see real inventory, profit and strategy data.
      </p>
      <button disabled={busy} onClick={run} className="primary">
        <Play size={16} /> Run demo simulation
      </button>
    </div>
  );
}

export function Note({ children }) {
  return (
    <div className="note">
      <Info size={17} />
      <div>{children}</div>
    </div>
  );
}

export function Exports({ result }) {
  return (
    <div className="button-row no-print">
      <a className="button" href={`/api/simulations/${result.id}/csv`} download>
        <Download size={15} /> CSV
      </a>
      <a className="button" href={`/api/simulations/${result.id}`} download={`simulation-${result.id}.json`}>
        JSON
      </a>
      <a className="button" href="#report">
        Printable report
      </a>
    </div>
  );
}

export function RoundTable({ rows, bayesian = false }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Round</th>
            <th>Demand</th>
            {bayesian ? (
              <>
                <th>Prior L / M / H</th>
                <th>Posterior L / M / H</th>
                <th>Retailer action</th>
                <th>Expected utility</th>
                <th>Actual utility</th>
              </>
            ) : (
              <>
                {players.map((n) => (
                  <th key={n}>{label(n)} action</th>
                ))}
                <th>Inventory</th>
                <th>Manufacturer π</th>
                <th>Supplier π</th>
                <th>Retailer π</th>
              </>
            )}
            <th>System utility</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.round}>
              <td>{r.round}</td>
              <td>{r.demand}</td>
              {bayesian ? (
                <>
                  <td>{r.prior.map(percent).join(" / ")}</td>
                  <td>{r.posterior.map(percent).join(" / ")}</td>
                  <td>{label(r.retailer.action)}</td>
                  <td>{money(r.retailer.expected_utility)}</td>
                  <td>{money(r.retailer.profit)}</td>
                </>
              ) : (
                <>
                  {players.map((n) => (
                    <td key={n}>
                      <span
                        className={`tag ${r[n].action === "DEFECT" ? "warning" : ""}`}
                      >
                        {label(r[n].action)}
                      </span>
                    </td>
                  ))}
                  <td>{r.total_inventory}</td>
                  {players.map((n) => (
                    <td key={n}>{money(r[n].profit)}</td>
                  ))}
                </>
              )}
              <td>{money(r.total_profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
