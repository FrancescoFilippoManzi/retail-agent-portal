import React, { useState, useEffect, Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, background: "#1a0000", color: "#ff6b6b", fontFamily: "monospace", fontSize: 13, whiteSpace: "pre-wrap" }}>
          <strong>Component crashed:</strong>{"\n\n"}
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
import AgentPanel from "./components/AgentPanel.jsx";
import RecommendationsPanel from "./components/RecommendationsPanel.jsx";
import AgentOverview from "./components/AgentOverview.jsx";
import CategoryResetPanel from "./components/CategoryResetPanel.jsx";
import CIrceLogo from "./components/CIrceLogo.jsx";
import LandingPage from "./components/LandingPage.jsx";
import PricingPromoAgent from "./components/PricingPromoAgent";

// ─── Navigation structure ─────────────────────────────────────────────────────
// Each group has either a direct `leaf` tab or `subtabs` with a `defaultTab`.
const NAV_GROUPS = [
  {
    id: "intelligence",
    label: "Category AI Companion",
    leaf: "intelligence",
  },
  {
    id: "dashboard",
    label: "Category Dashboard",
    defaultTab: "brief",
    subtabs: [
      { id: "brief",  label: "Category Brief" },
      { id: "market", label: "Market Grid" },
    ],
  },
  {
    id: "agentsGroup",
    label: "Circe Agents",
    defaultTab: "agents",
    subtabs: [
      { id: "agents",          label: "Agents" },
      { id: "recommendations", label: "Recommendations" },
      { id: "howItWorks",      label: "How It Works" },
      { id: "categoryReset",   label: "Category Reset" },
    ],
  },
  {
    id: "simulator",
    label: "Category Performance Simulator",
    defaultTab: "actions",
    subtabs: [
      { id: "actions", label: "Kroger Decisions" },
      { id: "history", label: "Performance Report" },
    ],
  },
  {
    id: "pricing",
    label: "Pricing & Promo",
    leaf: "pricing",
  },
];

// Derive which top group owns a leaf tab
function groupOf(leafTab) {
  for (const g of NAV_GROUPS) {
    if (g.leaf === leafTab) return g.id;
    if (g.subtabs?.some(s => s.id === leafTab)) return g.id;
  }
  return NAV_GROUPS[0].id;
}

// Resolve a group id or leaf id to a leaf tab id
function resolveLeafTab(tabId) {
  for (const g of NAV_GROUPS) {
    if (g.leaf === tabId) return tabId;
    if (g.subtabs?.some(s => s.id === tabId)) return tabId;
    if (g.id === tabId) return g.leaf || g.defaultTab;
  }
  return tabId;
}

// Leaf tabs that take full width (no Circe panel on the right)
const FULL_WIDTH_LEAVES = new Set([
  "intelligence", "agents", "recommendations", "howItWorks", "categoryReset", "history", "brief", "pricing",
]);

const s = {
  app: { display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" },
  topBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 20px", background: "#161b22", borderBottom: "1px solid #21262d", flexShrink: 0,
  },
  logoSub: { fontSize: 11, color: "#8b949e", marginLeft: 10 },
  resetBtn: {
    padding: "4px 12px", background: "transparent", border: "1px solid #30363d",
    borderRadius: 5, color: "#8b949e", fontSize: 11, cursor: "pointer",
  },
  body: { flex: 1, display: "flex", overflow: "hidden", minHeight: 0 },
  left: { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", minWidth: 0 },
  right: { width: 340, flexShrink: 0, overflow: "hidden" },
  // Top-group tab bar
  topTabs: {
    display: "flex", borderBottom: "1px solid #21262d",
    background: "#161b22", flexShrink: 0,
  },
  topTab: {
    padding: "9px 18px", fontSize: 12, cursor: "pointer",
    color: "#8b949e", border: "none", background: "none", whiteSpace: "nowrap",
  },
  topTabActive: { color: "#e6edf3", borderBottom: "2px solid #1f6feb" },
  // Subtab bar
  subTabs: {
    display: "flex", borderBottom: "1px solid #21262d",
    background: "#0d1117", flexShrink: 0, paddingLeft: 12,
  },
  subTab: {
    padding: "6px 16px", fontSize: 11, cursor: "pointer",
    color: "#6e7681", border: "none", background: "none", whiteSpace: "nowrap",
  },
  subTabActive: { color: "#cdd9e5", borderBottom: "2px solid #388bfd" },
  loading: { display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#8b949e", fontSize: 16 },
};

export default function App() {
  const [authed, setAuthed]         = useState(() => localStorage.getItem("circe_auth") === "true");
  const [user, setUser]             = useState(() => localStorage.getItem("circe_user") ?? "");
  const [state, setState]           = useState(null);
  const [showLanding, setShowLanding] = useState(true);
  const [tab, setTab]               = useState("intelligence"); // leaf tab ID
  const [advancing, setAdvancing]   = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [runStrategy, setRunStrategy]   = useState("balanced");
  const [brief, setBrief]           = useState(() => loadBrief());
  const [retailer, setRetailer]     = useState("kroger");
  const [category, setCategory]     = useState("Snacks");
  const [navHidden, setNavHidden]   = useState(false);

  useEffect(() => {
    getState().then(s => setState({ ...s, season: getSeason(s.week) }));
  }, []);

  async function handleAdvance(decisions) {
    setAdvancing(true);
    const newState = await advanceWeek(decisions);
    setState({ ...newState, season: getSeason(newState.week) });
    setAdvancing(false);
    setTab("market"); // → Category Dashboard > Market Grid
  }

  async function handleReset() {
    if (!confirm("Reset simulation to Week 0?")) return;
    const fresh = await resetSim();
    setState({ ...fresh, season: getSeason(0) });
    setTab("brief"); // → Category Dashboard > Category Brief
  }

  async function handleRunComplete() {
    const fresh = await getState();
    setState({ ...fresh, season: getSeason(fresh.week) });
  }

  function handleRunClose() {
    setShowRunModal(false);
    setTab("history"); // → Category Performance Simulator > Performance Report
  }

  if (!authed) return <LoginPage onLogin={(email) => { setAuthed(true); setUser(email); setShowLanding(true); }} />;
  if (!state)  return <div style={s.loading}>Loading simulation…</div>;

  if (showLanding) {
    return (
      <LandingPage
        onEnter={() => setShowLanding(false)}
        onNavigate={(leafTab, ret, cat, isolated) => {
          if (ret) setRetailer(ret);
          if (cat) setCategory(cat);
          setTab(resolveLeafTab(leafTab));
          setNavHidden(!!isolated);
          setShowLanding(false);
        }}
      />
    );
  }

  const activeGroup   = groupOf(tab);
  const activeGroupDef = NAV_GROUPS.find(g => g.id === activeGroup);
  const showSubTabs   = !!activeGroupDef?.subtabs;
  const showCirce     = !FULL_WIDTH_LEAVES.has(tab);

  function handleTopTabClick(group) {
    if (group.leaf) {
      setTab(group.leaf);
    } else {
      setTab(group.defaultTab);
    }
  }

  return (
    <div style={s.app}>
      {showRunModal && (
        <RunModal onComplete={handleRunComplete} onClose={handleRunClose} strategy={runStrategy} />
      )}

      {/* Top bar */}
      <div style={s.topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <CIrceLogo width={72} color="#e8a020" />
          <span style={s.logoSub}>FY 2026 · {state.marketName} · Paper Goods</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {state.lastEvent && (
            <span style={{ fontSize: 11, color: "#e3b341", background: "#1f1a0a", padding: "3px 10px", borderRadius: 12, border: "1px solid #9e6a03" }}>
              ⚡ {state.lastEvent.label}
            </span>
          )}
          <span style={{ fontSize: 11, color: "#8b949e" }}>{user}</span>
          <button style={{ ...s.resetBtn, borderColor: "#d4a24c44", color: "#d4a24c" }} onClick={() => { setNavHidden(false); setShowLanding(true); }}>⌂ Home</button>
          <button style={s.resetBtn} onClick={handleReset}>Reset</button>
          <button style={{ ...s.resetBtn, borderColor: "#f8514933", color: "#f85149" }}
            onClick={() => { localStorage.removeItem("circe_auth"); localStorage.removeItem("circe_user"); setAuthed(false); }}>
            Sign out
          </button>
        </div>
      </div>

      {/* KPI bar — simulation tabs only */}
      {["brief", "market", "actions", "history"].includes(tab) && <KPIBar state={state} />}

      {/* Top-level group tabs — hidden in isolated mode */}
      {!navHidden ? (
        <>
          <div style={s.topTabs}>
            {NAV_GROUPS.map(group => (
              <button
                key={group.id}
                style={{ ...s.topTab, ...(activeGroup === group.id ? s.topTabActive : {}) }}
                onClick={() => handleTopTabClick(group)}
              >
                {group.label}
              </button>
            ))}
          </div>
          {/* Subtab bar — only shown when the active group has subtabs */}
          {showSubTabs && (
            <div style={s.subTabs}>
              {activeGroupDef.subtabs.map(sub => (
                <button
                  key={sub.id}
                  style={{ ...s.subTab, ...(tab === sub.id ? s.subTabActive : {}) }}
                  onClick={() => setTab(sub.id)}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ ...s.topTabs, padding: "0 16px", gap: 0 }}>
          <button
            style={{ background: "none", border: "none", color: "#d4a24c", cursor: "pointer", fontSize: 12, padding: "8px 0", letterSpacing: "0.02em" }}
            onClick={() => { setNavHidden(false); setShowLanding(true); }}
          >
            ← Back to Home
          </button>
          <span style={{ fontSize: 11, color: "#8b949e", marginLeft: 16, fontFamily: "monospace" }}>
            {retailer.charAt(0).toUpperCase() + retailer.slice(1)} · {category} · Pricing &amp; Promo
          </span>
        </div>
      )}

      {/* Context reminder bar — below nav, above content */}
      {!navHidden && (
        <div style={{
          padding: "3px 20px", background: "#09131f", borderBottom: "1px solid #0f2540",
          fontFamily: "monospace", fontSize: "0.65rem", color: "#fbbf24",
          letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0,
        }}>
          <span>⊞</span>
          <span style={{ textTransform: "uppercase" }}>{retailer.toUpperCase()}</span>
          <span style={{ color: "#1e3a5f" }}>·</span>
          <span>{category}</span>
        </div>
      )}

      {/* Body */}
      <div style={s.body}>
        <div style={{
          ...s.left,
          ...(FULL_WIDTH_LEAVES.has(tab) ? { maxWidth: "100%" } : {}),
          ...((tab === "intelligence" || tab === "pricing") ? { overflowY: "hidden" } : {}),
        }}>

          {/* Category Dashboard */}
          {tab === "brief" && (
            <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
              <div style={{ flex: 1, overflowY: "auto" }}>
                <CategoryBrief onBriefChange={setBrief} retailer={retailer} category={category} />
              </div>
              <RunStrategySidebar
                currentWeek={state.week}
                totalWeeks={state.totalWeeks}
                onRun={(strategy) => { setRunStrategy(strategy); setShowRunModal(true); }}
                disabled={advancing}
              />
            </div>
          )}
          {tab === "market" && <MarketGrid skus={state.skus} retailer={retailer} category={category} />}

          {/* Category Performance Simulator */}
          {tab === "actions" && (
            <ActionPanel
              skus={state.skus}
              week={state.week}
              totalWeeks={state.totalWeeks}
              onAdvance={handleAdvance}
              loading={advancing}
              retailer={retailer}
              category={category}
            />
          )}
          {tab === "history" && (
            <PerformanceReport
              history={state.history}
              krogerKPIs={state.krogerKPIs}
              brief={brief}
              retailer={retailer}
              category={category}
            />
          )}

          {/* Category AI Companion */}
          {tab === "intelligence" && <ErrorBoundary><CategoryIntelligence retailer={retailer} category={category} /></ErrorBoundary>}

          {/* Circe Agents */}
          {tab === "agents"          && <AgentPanel retailer={retailer} category={category} />}
          {tab === "recommendations" && <RecommendationsPanel retailer={retailer} category={category} />}
          {tab === "howItWorks"      && <AgentOverview />}
          {tab === "categoryReset"   && <CategoryResetPanel />}

          {/* Pricing & Promo Agent */}
          {tab === "pricing" && <ErrorBoundary><PricingPromoAgent retailer={retailer} category={category} onBackHome={() => { setNavHidden(false); setShowLanding(true); }} /></ErrorBoundary>}
        </div>

        {showCirce && (
          <div style={s.right}>
            <CircePanel state={state} disabled={advancing} />
          </div>
        )}
      </div>
    </div>
  );
}
