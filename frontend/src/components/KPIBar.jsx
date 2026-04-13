import React from "react";

const s = {
  bar: { display: "flex", gap: 2, padding: "10px 20px", background: "#161b22", borderBottom: "1px solid #30363d" },
  tile: { flex: 1, background: "#0d1117", border: "1px solid #21262d", borderRadius: 6, padding: "8px 14px" },
  label: { fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 },
  value: { fontSize: 20, fontWeight: 700, color: "#e6edf3" },
  sub: { fontSize: 11, color: "#8b949e", marginTop: 2 }
};

function fmt(n) { return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n?.toFixed(0) ?? 0}`; }
function fmtPct(n) { return `${n?.toFixed(1) ?? 0}%`; }
function trend(arr) {
  if (!arr || arr.length < 2) return null;
  const delta = arr[arr.length - 1] - arr[arr.length - 2];
  return { delta, up: delta >= 0 };
}

export default function KPIBar({ state }) {
  const { krogerKPIs, week, totalWeeks } = state;
  const weeklyRev = krogerKPIs.weeklyRevenue;
  const weeklyMgn = krogerKPIs.weeklyMargin;
  const weeklyMs  = krogerKPIs.weeklyMarketShare;
  const weeklyUnits = krogerKPIs.weeklyUnits;

  const lastRev = weeklyRev[weeklyRev.length - 1] ?? 0;
  const lastMgn = weeklyMgn[weeklyMgn.length - 1] ?? 0;
  const lastMs  = weeklyMs[weeklyMs.length - 1] ?? 0;
  const lastUnits = weeklyUnits[weeklyUnits.length - 1] ?? 0;
  const lastMgnPct = lastRev > 0 ? (lastMgn / lastRev) * 100 : 0;

  const revT = trend(weeklyRev);
  const mgnT = trend(weeklyMgn);
  const msT  = trend(weeklyMs);

  const Arrow = ({ t }) => t ? (
    <span style={{ color: t.up ? "#3fb950" : "#f85149", marginLeft: 4 }}>
      {t.up ? "▲" : "▼"}
    </span>
  ) : null;

  return (
    <div style={s.bar}>
      <div style={s.tile}>
        <div style={s.label}>Week</div>
        <div style={s.value}>{week} <span style={{ fontSize: 13, color: "#8b949e" }}>/ {totalWeeks}</span></div>
        <div style={s.sub}>Season: {state.season ?? "—"}</div>
      </div>
      <div style={s.tile}>
        <div style={s.label}>This Week Revenue</div>
        <div style={s.value}>{fmt(lastRev)} <Arrow t={revT} /></div>
        <div style={s.sub}>Cumulative: {fmt(krogerKPIs.cumulativeRevenue)}</div>
      </div>
      <div style={s.tile}>
        <div style={s.label}>This Week Margin</div>
        <div style={s.value}>{fmt(lastMgn)} <Arrow t={mgnT} /></div>
        <div style={s.sub}>{fmtPct(lastMgnPct)} margin | Cumulative: {fmt(krogerKPIs.cumulativeMargin)}</div>
      </div>
      <div style={s.tile}>
        <div style={s.label}>Market Share</div>
        <div style={s.value}>{fmtPct(lastMs)} <Arrow t={msT} /></div>
        <div style={s.sub}>Units sold: {lastUnits.toLocaleString()}</div>
      </div>
    </div>
  );
}
