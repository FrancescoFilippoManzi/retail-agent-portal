import React, { useState } from "react";

export const STRATEGIES = [
  {
    id: "balanced",
    label: "Balanced Strategy",
    icon: "⚖",
    color: "#58a6ff",
    bg: "#0d1d3a",
    border: "#1f4080",
    desc: "Optimize revenue, margin, and market share in equal measure. No single metric is sacrificed."
  },
  {
    id: "maximize_margin",
    label: "Maximize Margin $",
    icon: "💰",
    color: "#3fb950",
    bg: "#0d2a18",
    border: "#1a5c2a",
    desc: "Margin dollars above all. Prefer price increases over promos; only discount when volume clearly lifts total margin."
  },
  {
    id: "maximize_share",
    label: "Maximize Market Share",
    icon: "📈",
    color: "#e3b341",
    bg: "#2a1f0a",
    border: "#5c4010",
    desc: "Win volume aggressively. Competitive pricing and promo intensity. Revenue secondary; guardrails still apply."
  },
  {
    id: "maximize_pl",
    label: "Maximize PL Penetration",
    icon: "🏷",
    color: "#bf91f3",
    bg: "#1a0d2a",
    border: "#4a2080",
    desc: "Grow Kroger private label share. Keep name brand prices firm; reduce name brand promo frequency to widen PL price gap."
  }
];

const s = {
  sidebar: {
    width: 260, flexShrink: 0, background: "#0d1117",
    borderLeft: "1px solid #21262d", display: "flex",
    flexDirection: "column", padding: "20px 16px", gap: 12, overflowY: "auto"
  },
  sideTitle: { fontSize: 11, fontWeight: 700, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 },
  card: {
    border: "1px solid #21262d", borderRadius: 8, padding: "10px 12px",
    cursor: "pointer", transition: "all 0.15s"
  },
  cardHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  icon: { fontSize: 16 },
  label: { fontSize: 12, fontWeight: 700 },
  desc: { fontSize: 11, lineHeight: 1.5, color: "#8b949e" },
  divider: { borderTop: "1px solid #21262d", margin: "4px 0" },
  runBtn: {
    width: "100%", padding: "11px 0", border: "none", borderRadius: 8,
    fontSize: 13, fontWeight: 800, cursor: "pointer", letterSpacing: "0.04em"
  },
  weekBadge: {
    background: "#161b22", border: "1px solid #30363d", borderRadius: 6,
    padding: "6px 10px", fontSize: 11, color: "#8b949e", textAlign: "center"
  }
};

export default function RunStrategySidebar({ currentWeek, totalWeeks, onRun, disabled }) {
  const [selected, setSelected] = useState("balanced");
  const strategy = STRATEGIES.find(s => s.id === selected);

  const progress = totalWeeks > 0 ? Math.round((currentWeek / totalWeeks) * 100) : 0;

  return (
    <div style={s.sidebar}>
      <div>
        <div style={s.sideTitle}>FY 2026 Simulation</div>
        {currentWeek > 0 && (
          <div style={s.weekBadge}>
            Week {currentWeek} / {totalWeeks} &nbsp;·&nbsp; {progress}% complete
            <div style={{ marginTop: 5, height: 3, background: "#21262d", borderRadius: 2 }}>
              <div style={{ height: "100%", borderRadius: 2, background: "#1f6feb", width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      <div style={s.divider} />

      <div style={s.sideTitle}>Circe's Objective</div>

      {STRATEGIES.map(strat => {
        const active = selected === strat.id;
        return (
          <div
            key={strat.id}
            style={{
              ...s.card,
              background: active ? strat.bg : "#161b22",
              border: `1px solid ${active ? strat.border : "#21262d"}`,
            }}
            onClick={() => setSelected(strat.id)}
          >
            <div style={s.cardHeader}>
              <span style={s.icon}>{strat.icon}</span>
              <span style={{ ...s.label, color: active ? strat.color : "#c9d1d9" }}>{strat.label}</span>
            </div>
            {active && <div style={s.desc}>{strat.desc}</div>}
          </div>
        );
      })}

      <div style={s.divider} />

      <div style={{ fontSize: 10, color: "#8b949e", lineHeight: 1.5 }}>
        All strategies respect active guardrails. Resets simulation to Week 1.
      </div>

      <button
        style={{
          ...s.runBtn,
          background: disabled ? "#21262d" : strategy.bg,
          color: disabled ? "#8b949e" : strategy.color,
          border: `1px solid ${disabled ? "#30363d" : strategy.border}`,
          cursor: disabled ? "not-allowed" : "pointer"
        }}
        onClick={() => !disabled && onRun(selected)}
        disabled={disabled}
      >
        {strategy.icon} Run with Circe →
      </button>
    </div>
  );
}
