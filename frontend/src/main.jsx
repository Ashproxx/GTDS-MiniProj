import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  ChartNoAxesCombined,
  ChevronRight,
  CircleHelp,
  Factory,
  FlaskConical,
  GitCompareArrows,
  History as HistoryIcon,
  Home,
  Layers3,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  Network,
  Package,
  Play,
  Settings2,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { api } from "./api";
import { About, Comparison, History, Theory } from "./Analysis";
import { Dashboard, GameResults, Report, SupplyChain } from "./Results";
import Setup from "./Setup";
import { Empty, Note, Panel } from "./components";
import "./style.css";

const navigation = [
  ["home", "Overview", Home],
  ["dashboard", "Dashboard", LayoutDashboard],
  ["simulation", "Simulation setup", Settings2],
  ["supply-chain", "Supply chain", Network],
  ["repeated", "Repeated game", Layers3],
  ["bayesian", "Bayesian game", ChartNoAxesCombined],
  ["comparison", "Strategy comparison", GitCompareArrows],
  ["scenarios", "Scenarios", FlaskConical],
  ["history", "History", HistoryIcon],
  ["theory", "Game theory", BookOpen],
  ["about", "About project", CircleHelp],
];
const go = (page) => {
  window.location.hash = page;
};

function App() {
  const [page, setPage] = useState(location.hash.slice(1) || "home");
  const [defaults, setDefaults] = useState(null);
  const [config, setConfig] = useState(null);
  const [products, setProducts] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [result, setResult] = useState(null);
  const [comparisons, setComparisons] = useState([]);
  const [experiment, setExperiment] = useState(null);
  const [history, setHistory] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const change = () => {
      setPage(location.hash.slice(1) || "home");
      setMenu(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  async function initialize() {
    setError("");
    try {
      const [data, presets] = await Promise.all([
        api("/defaults"),
        api("/scenarios"),
      ]);
      setDefaults(data.config);
      setConfig(data.config);
      setProducts(data.products);
      setScenarios(presets);
    } catch (e) {
      setError(
        `Backend connection failed. Start FastAPI on port 8000. ${e.message}`,
      );
    }
  }
  useEffect(() => {
    initialize();
  }, []);
  async function work(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function refresh(append = false) {
    const rows = await api(
      `/simulations?limit=100&offset=${append ? history.length : 0}`,
    );
    setHistory((h) => (append ? [...h, ...rows] : rows));
    setHasMore(rows.length === 100);
  }
  useEffect(() => {
    if (page === "history" && defaults) work(() => refresh());
  }, [page, defaults]);
  function run(c = config, destination = "dashboard") {
    work(async () => {
      const data = await api("/simulations/run", c);
      setResult(data);
      go(destination);
    });
  }
  const demo = () => run({ ...defaults, name: "Demo simulation" });
  const runAll = () =>
    work(async () => {
      const data = await api("/simulations/compare", config);
      setComparisons(data);
      setResult(
        data.find((r) => r.config.game_type === config.game_type) || data[0],
      );
      go("comparison");
    });
  const title =
    navigation.find((n) => n[0] === page)?.[1] ||
    (page === "report" ? "Simulation report" : "Page not found");
  const descriptions = {
    dashboard: "The whole chain. A clearer picture.",
    simulation: "Build a repeatable inventory experiment.",
    "supply-chain": "See how decisions move through the network.",
    repeated: "Explore the value of long-term coordination.",
    bayesian: "Turn uncertainty into informed decisions.",
    comparison: "Same conditions. Different decisions.",
    scenarios: "One supply chain. Eight ways to challenge it.",
    history: "Every run has a story. Keep yours.",
    theory: "The ideas behind every decision.",
    about: "A small project for a complex problem.",
  };

  return (
    <div className="app-shell">
      <a
        href="#content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("content").focus();
        }}
      >
        Skip to content
      </a>
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <a href="#home" className="brand">
          <span className="brand-mark">
            <Boxes size={27} />
          </span>
          <span>
            CHAINLAB<small>THE STRATEGY WORKSPACE</small>
          </span>
        </a>
        <div className="sidebar-label">
          WORKSPACE <span>01</span>
        </div>
        <nav aria-label="Main navigation">
          {navigation.map(([key, text, Icon], i) => (
            <a
              className={`${page === key ? "active" : ""} ${i === 4 || i === 9 ? "nav-gap" : ""}`}
              href={`#${key}`}
              key={key}
            >
              <Icon size={18} />
              {text}
              {page === key && <span className="active-mark" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="lab-icon">
            <FlaskConical size={20} />
          </div>
          <strong>Built to explore.</strong>
          <p>
            Test a hypothesis.
            <br />
            Follow the evidence.
          </p>
          <a href="#theory">
            Explore the models <ArrowRight size={14} />
          </a>
        </div>
        <div className="local-badge">
          <span className="status-dot" /> LOCAL SIMULATION LAB
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Toggle navigation"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            <span className="academic-badge">
              <span /> ACADEMIC PROJECT
            </span>
            <span className="avatar">SC</span>
          </div>
        </header>
        <main id="content" tabIndex="-1">
          <div className="page-heading">
            <div>
              <span className="eyebrow">SUPPLY CHAIN INTELLIGENCE</span>
              <h1>{title}</h1>
              <p>
                {descriptions[page] ||
                  "Inventory optimization through repeated & Bayesian game theory."}
              </p>
            </div>
            {page !== "home" && (
              <button
                className="primary no-print"
                disabled={busy || !defaults}
                onClick={demo}
              >
                <Play size={15} /> Run demo
              </button>
            )}
          </div>
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              {!defaults ? (
                <button onClick={initialize}>Retry connection</button>
              ) : (
                <button aria-label="Dismiss error" onClick={() => setError("")}>
                  <X size={16} />
                </button>
              )}
            </div>
          )}
          {busy && (
            <div className="busy" role="status">
              <LoaderCircle className="spin" size={18} /> Running your
              experiment…
            </div>
          )}
          {!config ? (
            !error && (
              <div className="empty" role="status">
                Connecting to the simulation engine…
              </div>
            )
          ) : (
            <>
              {page === "home" && <HomePage demo={demo} busy={busy} selectBaseline={() => setConfig(c => ({...c, game_type: 'baseline'}))} />}
              {page === "simulation" && (
                <Setup
                  {...{ config, setConfig, defaults, products, run, busy }}
                />
              )}
              {page === "dashboard" &&
                (result ? (
                  <Dashboard result={result} />
                ) : (
                  <Empty run={demo} busy={busy} />
                ))}
              {page === "supply-chain" &&
                (result ? (
                  <SupplyChain result={result} />
                ) : (
                  <Empty run={demo} busy={busy} />
                ))}
              {["repeated", "bayesian"].includes(page) && (
                <GameResults {...{ result, config, run, busy }} type={page} />
              )}
              {page === "comparison" && (
                <Comparison
                  results={comparisons}
                  {...{ runAll, busy, experiment }}
                  runExperiment={(count) =>
                    work(async () =>
                      setExperiment(
                        await api("/experiments", { config, count }),
                      ),
                    )
                  }
                />
              )}
              {page === "scenarios" && (
                <>
                  <Note>
                    Loading a scenario resets setup to sensible defaults,
                    applies the scenario parameters, and opens the editable
                    form.
                  </Note>
                  <div className="scenario-grid">
                    {scenarios.map((s, i) => (
                      <Panel
                        key={s.id}
                        title={s.name}
                        subtitle={`EXPERIMENT 0${i + 1}`}
                      >
                        <div className={`scenario-art art-${i % 3}`}>
                          <ChartNoAxesCombined size={45} />
                          <span>{String(i + 1).padStart(2, "0")}</span>
                        </div>
                        <p>{s.description}</p>
                        <button
                          onClick={() => {
                            setConfig({
                              ...defaults,
                              ...s.parameters,
                              name: s.name,
                            });
                            go("simulation");
                          }}
                        >
                          Load scenario <ArrowRight size={15} />
                        </button>
                      </Panel>
                    ))}
                  </div>
                </>
              )}
              {page === "history" && (
                <History
                  rows={history}
                  {...{ busy, hasMore }}
                  refresh={() => work(() => refresh())}
                  loadMore={() => work(() => refresh(true))}
                  open={(id) =>
                    work(async () => {
                      const data = await api(`/simulations/${id}`);
                      setResult(data);
                      setConfig(data.config);
                      go("dashboard");
                    })
                  }
                  remove={(id) =>
                    work(async () => {
                      await api(`/simulations/${id}`, null, "DELETE");
                      await refresh();
                    })
                  }
                  compare={(ids) =>
                    work(async () => {
                      setComparisons(
                        await Promise.all(
                          ids.map((id) => api(`/simulations/${id}`)),
                        ),
                      );
                      go("comparison");
                    })
                  }
                />
              )}
              {page === "theory" && <Theory result={result} />}
              {page === "about" && <About />}
              {page === "report" &&
                (result ? (
                  <Report result={result} />
                ) : (
                  <Empty run={demo} busy={busy} />
                ))}
              {!navigation.some((n) => n[0] === page) && page !== "report" && (
                <Panel title="Page not found">
                  <a href="#home">Return to overview</a>
                </Panel>
              )}
            </>
          )}
          <footer>
            CHAINLAB{" "}
            <span>Supply Chain Inventory Optimization Using Game Theory</span>
            <a href="#about">
              About this project <ArrowRight size={13} />
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}

function HomePage({ demo, busy, selectBaseline }) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-tag">
            <Sparkles size={13} /> SMALL DECISIONS. SYSTEM-WIDE IMPACT.
          </span>
          <h2>
            Better decisions.
            <br />A stronger
            <br />
            <em>supply chain.</em>
          </h2>
          <p>
            Explore how manufacturers, suppliers and retailers balance
            inventory, uncertainty and each other.
          </p>
          <div className="button-row">
            <button className="primary light" disabled={busy} onClick={demo}>
              Demo simulation <ArrowRight size={17} />
            </button>
            <a className="hero-link" href="#simulation">
              Start simulation <ChevronRight size={16} />
            </a>
          </div>
          <span className="hero-footnote">
            30 rounds · 3 strategic players · 1 connected system
          </span>
        </div>
        <div className="hero-visual">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="visual-label">A CONNECTED DECISION NETWORK</span>
          <div className="network-node node-m">
            <Factory />
            <div>
              <small>01 / PRODUCE</small>
              <strong>Manufacturer</strong>
            </div>
            <span className="node-indicator" />
          </div>
          <div className="network-link link-one" />
          <div className="network-node node-s">
            <Package />
            <div>
              <small>02 / DISTRIBUTE</small>
              <strong>Supplier</strong>
            </div>
            <span className="node-indicator" />
          </div>
          <div className="network-link link-two" />
          <div className="network-node node-r">
            <ShoppingBag />
            <div>
              <small>03 / FULFILL</small>
              <strong>Retailer</strong>
            </div>
            <span className="node-indicator" />
          </div>
          <div className="market-pill">
            CUSTOMERS <span>Uncertain demand</span>
          </div>
          <span className="visual-caption">
            Inventory flows downstream.
            <br />
            Decisions ripple in every direction.
          </span>
        </div>
      </section>
      <div className="home-links">
        <a href="#dashboard">
          <LayoutDashboard size={23} />
          <span>
            <strong>Open dashboard</strong>
            <small>Trace every metric to a decision.</small>
          </span>
          <ArrowRight size={18} />
        </a>
        <a href="#theory">
          <BookOpen size={23} />
          <span>
            <strong>Learn game theory</strong>
            <small>Understand the models as you explore.</small>
          </span>
          <ArrowRight size={18} />
        </a>
        <a href="#scenarios">
          <FlaskConical size={23} />
          <span>
            <strong>Change the conditions</strong>
            <small>Eight ready-to-run market scenarios.</small>
          </span>
          <ArrowRight size={18} />
        </a>
      </div>
      <div className="section-intro">
        <div>
          <span className="eyebrow">THREE LENSES. ONE SUPPLY CHAIN.</span>
          <h2>What happens when players think differently?</h2>
        </div>
      </div>
      <div className="model-grid">
        {[
          [
            "01",
            "The baseline",
            "A fixed reorder policy. A useful starting point for every comparison.",
            "simulation",
            "Fixed rules",
          ],
          [
            "02",
            "The repeated game",
            "Players remember outcomes and respond to one another over time.",
            "repeated",
            "Strategic memory",
          ],
          [
            "03",
            "The Bayesian game",
            "Players use probabilities to choose actions under demand uncertainty.",
            "bayesian",
            "Learning from evidence",
          ],
        ].map(([n, title, text, page, tag]) => (
          <a href={`#${page}`} className="model-card" key={n} onClick={n === '01' ? selectBaseline : undefined}>
            <div>
              <span className="model-index">{n}</span>
              <ArrowRight size={19} />
            </div>
            <span className="tag">{tag}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </a>
        ))}
      </div>
      <Note>
        No predetermined winners. Run all three models on the same demand
        sequence and discover the trade-offs yourself.
      </Note>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
