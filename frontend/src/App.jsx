import React, { useState, useEffect, Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, background: "#1a0000", color: "#ff6b6b", fontFamily: "monospace", fontSize: 13, whiteSpace: "pre-wrap" }}>
          <strong>CategoryIntelligence crashed:</strong>{"\n\n"}
          {this.state.error.message}{"\n\n"}
          {this.state.error.stack}
        </div>
      );
    }
    return this.props.children;
  }
}
import LoginPage from "./components/LoginPage.jsx";
import { getState, advanceWeek, resetSim } from "./api.js";
import KPIBar from "./components/KPIBar.jsx";
import MarketGrid from "./components/MarketGrid.jsx";
import CircePanel from "./components/CircePanel.jsx";
import ActionPanel from "./components/ActionPanel.jsx";
import PerformanceReport from "./components/PerformanceReport.jsx";
import CategoryBrief from "./components/CategoryBrief.jsx";
import RunModal from "./components/RunModal.jsx";
import RunStrategySidebar from "./components/RunStrategySidebar.jsx";
import { loadBrief } from "./components/CategoryBrief.jsx";
import { getSeason } from "./season.js";
import CategoryIntelligence from "./components/CategoryIntelligence.jsx";

const s = {
  app: { display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" },
  topBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 20px", background: "#161b22", borderBottom: "1px solid #21262d", flexShrink: 0
  },
  logo: { fontSize: 16, fontWeight: 800, color: "#e31837", letterSpacing: "0.12em" },
  logoSub: { fontSize: 11, color: "#8b949e", marginLeft: 10 },
  resetBtn: {
    padding: "4px 12px", background: "transparent", border: "1px solid #30363d",
    borderRadius: 5, color: "#8b949e", fontSize: 11, cursor: "pointer"
  },
  body: { flex: 1, display: "flex", overflow: "hidden", minHeight: 0 },
  left: { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", minWidth: 0 },
  right: { width: 340, flexShrink: 0, overflow: "hidden" },
  tabs: { display: "flex", borderBottom: "1px solid #21262d", background: "#161b22", flexShrink: 0 },
  tab: { padding: "9px 20px", fontSize: 12, cursor: "pointer", color: "#8b949e", border: "none", background: "none", whiteSpace: "nowrap" },
  tabActive: { color: "#e6edf3", borderBottom: "2px solid #1f6feb" },
  loading: { display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#8b949e", fontSize: 16 }
};

export default function App() {
  const [authed, setAuthed] = useState(() => localStorage.getItem("circe_auth") === "true");
  const [user, setUser] = useState(() => localStorage.getItem("circe_user") ?? "");
  const [state, setState] = useState(null);
  const [tab, setTab] = useState("brief");
  const [advancing, setAdvancing] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [runStrategy, setRunStrategy] = useState("balanced");
  const [brief, setBrief] = useState(() => loadBrief());

  useEffect(() => {
    getState().then(s => setState({ ...s, season: getSeason(s.week) }));
  }, []);

  async function handleAdvance(decisions) {
    setAdvancing(true);
    const newState = await advanceWeek(decisions);
    setState({ ...newState, season: getSeason(newState.week) });
    setAdvancing(false);
    setTab("market");
  }

  async function handleReset() {
    if (!confirm("Reset simulation to Week 0?")) return;
    const fresh = await resetSim();
    setState({ ...fresh, season: getSeason(0) });
    setTab("brief");
  }

  async function handleRunComplete() {
    const fresh = await getState();
    setState({ ...fresh, season: getSeason(fresh.week) });
  }

  function handleRunClose() {
    setShowRunModal(false);
    setTab("history");
  }

  if (!authed) return <LoginPage onLogin={(email) => { setAuthed(true); setUser(email); }} />;
  if (!state) return <div style={s.loading}>Loading simulation…</div>;

  const TABS = [
    { id: "brief",   label: "Category Brief" },
    { id: "market",  label: "Market Grid" },
    { id: "actions", label: "Kroger Decisions" },
    { id: "history",      label: "Performance Report" },
    { id: "intelligence", label: "Category Intelligence" },
  ];

  // History tab doesn't show Circe panel (full width report)
  const showCirce = tab !== "history" && tab !== "brief" && tab !== "intelligence";

  return (
    <div style={s.app}>
      {showRunModal && (
        <RunModal onComplete={handleRunComplete} onClose={handleRunClose} strategy={runStrategy} />
      )}

      {/* Top bar */}
      <div style={s.topBar}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={s.logo}>CIRCE</span>
          <span style={s.logoSub}>FY 2026 Category Simulation · {state.marketName} · Paper Goods</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {state.lastEvent && (
            <span style={{ fontSize: 11, color: "#e3b341", background: "#1f1a0a", padding: "3px 10px", borderRadius: 12, border: "1px solid #9e6a03" }}>
              ⚡ {state.lastEvent.label}
            </span>
          )}
          <span style={{ fontSize: 11, color: "#8b949e" }}>{user}</span>
          <button style={s.resetBtn} onClick={handleReset}>Reset</button>
          <button style={{ ...s.resetBtn, borderColor: "#f8514933", color: "#f85149" }}
            onClick={() => { localStorage.removeItem("circe_auth"); localStorage.removeItem("circe_user"); setAuthed(false); }}>
            Sign out
          </button>
        </div>
      </div>

      {/* KPI bar */}
      <KPIBar state={state} />

      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map(({ id, label }) => (
          <button key={id} style={{ ...s.tab, ...(tab === id ? s.tabActive : {}) }} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div style={s.body}>
        <div style={{ ...s.left, ...((tab === "history" || tab === "intelligence") ? { maxWidth: "100%" } : {}), ...(tab === "intelligence" ? { overflowY: "hidden" } : {}) }}>

          {tab === "brief" && (
            <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
              <div style={{ flex: 1, overflowY: "auto" }}>
                <CategoryBrief onBriefChange={setBrief} />
              </div>
              <RunStrategySidebar
                currentWeek={state.week}
                totalWeeks={state.totalWeeks}
                onRun={(strategy) => { setRunStrategy(strategy); setShowRunModal(true); }}
                disabled={advancing}
              />
            </div>
          )}

          {tab === "market" && (
            <MarketGrid skus={state.skus} />
          )}

          {tab === "actions" && (
            <ActionPanel
              skus={state.skus}
              week={state.week}
              totalWeeks={state.totalWeeks}
              onAdvance={handleAdvance}
              loading={advancing}
            />
          )}

          {tab === "history" && (
            <PerformanceReport
              history={state.history}
              krogerKPIs={state.krogerKPIs}
              brief={brief}
            />
          )}

          {tab === "intelligence" && <ErrorBoundary><CategoryIntelligence /></ErrorBoundary>}
        </div>

        {/* Circe panel — hidden on brief and history tabs */}
        {showCirce && (
          <div style={s.right}>
            <CircePanel state={state} disabled={advancing} />
          </div>
        )}
      </div>
    </div>
  );
}
