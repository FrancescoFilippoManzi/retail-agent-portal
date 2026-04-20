import React, { useState } from "react";
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, LineChart, Line,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, Cell
} from "recharts";

const SEASON_COLOR = { Winter: "#58a6ff", Spring: "#3fb950", Summer: "#e3b341", Fall: "#f0883e" };
const SEASON_BG    = { Winter: "#58a6ff18", Spring: "#3fb95018", Summer: "#e3b34118", Fall: "#f0883e18" };

// ── Shared tooltip style ───────────────────────────────────────────────────────
const TooltipStyle = { background: "#161b22", border: "1px solid #30363d", borderRadius: 8, fontSize: 12, color: "#e6edf3" };

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TooltipStyle}>
      <div style={{ padding: "6px 12px 4px", borderBottom: "1px solid #21262d", fontWeight: 700, color: "#58a6ff" }}>
        Week {label}
      </div>
      <div style={{ padding: "6px 12px 8px" }}>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, marginBottom: 2 }}>
            {p.name}: <strong>{formatter ? formatter(p.value, p.name) : p.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Season tick renderer ───────────────────────────────────────────────────────
function SeasonDot({ cx, cy, season }) {
  return <circle cx={cx} cy={cy} r={3} fill={SEASON_COLOR[season] ?? "#8b949e"} />;
}

// ── Expand overlay ─────────────────────────────────────────────────────────────
function ExpandedChart({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 500, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid #30363d" }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#e6edf3" }}>{title}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#8b949e", fontSize: 20, cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ flex: 1, padding: "24px 32px" }}>{children}</div>
    </div>
  );
}

// ── Week Drill-Down Modal ──────────────────────────────────────────────────────
function WeekDrillDown({ entry, onClose }) {
  if (!entry) return null;
  const { week, season, event, weekRevenue, weekMargin, weekMarginPct, weekMarketShare,
          weekUnits, priceIndex, plPenetration, skuResults } = entry;

  const sorted = [...(skuResults ?? [])].sort((a, b) => b.revenue - a.revenue);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, width: 680, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #21262d", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#e6edf3" }}>Week {week} Deep Dive</span>
            <span style={{ marginLeft: 10, fontSize: 12, color: SEASON_COLOR[season], background: SEASON_BG[season], padding: "2px 8px", borderRadius: 10 }}>{season}</span>
            {event && <span style={{ marginLeft: 6, fontSize: 11, color: "#e3b341", background: "#1f1a0a", padding: "2px 8px", borderRadius: 10, border: "1px solid #9e6a0366" }}>⚡ {event.label}</span>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8b949e", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* KPI strip */}
        <div style={{ display: "flex", borderBottom: "1px solid #21262d" }}>
          {[
            ["Revenue", `$${weekRevenue?.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
            ["Margin", `$${weekMargin?.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${weekMarginPct?.toFixed(1)}%)`],
            ["Mkt Share", `${weekMarketShare?.toFixed(1)}%`],
            ["Price Idx", priceIndex?.toFixed(3) ?? "—"],
            ["PL Pen.", `${plPenetration?.toFixed(1) ?? "—"}%`],
            ["Units", weekUnits?.toLocaleString()],
          ].map(([k, v]) => (
            <div key={k} style={{ flex: 1, padding: "10px 14px", borderRight: "1px solid #21262d" }}>
              <div style={{ fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e6edf3", marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* SKU breakdown */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 22px" }}>
          <div style={{ fontSize: 11, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>SKU Breakdown</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #21262d" }}>
                {["SKU", "Units", "Eff. Price", "Revenue", "Margin $", "Margin %"].map(h => (
                  <th key={h} style={{ padding: "5px 10px", textAlign: h === "SKU" ? "left" : "right", color: "#8b949e", fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid #161b22" }}>
                  <td style={{ padding: "6px 10px", color: "#c9d1d9" }}>{r.name}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right" }}>{r.units?.toLocaleString()}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right" }}>${r.effectivePrice?.toFixed(2)}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right" }}>${r.revenue?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right" }}>${r.marginDollars?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right", color: r.marginPct >= 35 ? "#3fb950" : r.marginPct >= 25 ? "#e3b341" : "#f85149" }}>
                    {r.marginPct?.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Chart Card wrapper ─────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, onExpand, children, height = 220 }) {
  return (
    <div style={{ background: "#161b22", border: "1px solid #21262d", borderRadius: 10, marginBottom: 16, overflow: "hidden" }}>
      <div style={{ padding: "12px 18px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e6edf3" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: "#8b949e", marginTop: 2 }}>{subtitle}</div>}
        </div>
        <button
          onClick={onExpand}
          title="Expand"
          style={{ background: "none", border: "1px solid #30363d", borderRadius: 5, color: "#8b949e", padding: "3px 8px", fontSize: 12, cursor: "pointer" }}
        >⤢</button>
      </div>
      <div style={{ padding: "8px 4px 12px", height }}>
        {children}
      </div>
    </div>
  );
}

// ── Scoreboard at top ──────────────────────────────────────────────────────────
function Scoreboard({ history, brief, krogerKPIs }) {
  if (!history.length || !brief) return null;
  const weeks = history.length;
  const totalRev = krogerKPIs.cumulativeRevenue;
  const totalMgn = krogerKPIs.cumulativeMargin;
  const avgMs = krogerKPIs.weeklyMarketShare.reduce((s, v) => s + v, 0) / weeks;
  const avgMgn = (totalMgn / totalRev) * 100;
  const weeklyRevTarget = brief.annualRevenueTarget / 52;
  const paceRev = (totalRev / (weeklyRevTarget * weeks)) * 100;

  const Tile = ({ label, actual, target, unit = "", format = v => v, good }) => {
    const ok = good != null ? good : actual >= target;
    return (
      <div style={{ flex: 1, background: "#0d1117", border: "1px solid #21262d", borderRadius: 8, padding: "10px 14px" }}>
        <div style={{ fontSize: 10, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: ok ? "#3fb950" : "#f85149" }}>{format(actual)}{unit}</div>
        <div style={{ fontSize: 11, color: "#8b949e", marginTop: 2 }}>Target: {format(target)}{unit}</div>
        <div style={{ marginTop: 6, height: 4, background: "#21262d", borderRadius: 2 }}>
          <div style={{ height: "100%", borderRadius: 2, background: ok ? "#3fb950" : "#f85149", width: `${Math.min(100, (actual / target) * 100)}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
      <Tile label={`Revenue Pace (${weeks}wk)`} actual={Math.round(paceRev)} target={100} unit="%" format={v => `${v}`} />
      <Tile label="Avg Gross Margin" actual={Math.round(avgMgn * 10) / 10} target={brief.marginTarget} unit="%" format={v => `${v}`} />
      <Tile label="Avg Market Share" actual={Math.round(avgMs * 10) / 10} target={brief.marketShareTarget} unit="%" format={v => `${v}`} />
      <Tile label="Cumulative Revenue" actual={Math.round(totalRev)} target={Math.round(weeklyRevTarget * weeks)} unit="" format={v => `$${(v/1000).toFixed(0)}k`} />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function PerformanceReport({ history, krogerKPIs, brief, retailer, category }) {
  const [expanded, setExpanded] = useState(null);
  const [drillEntry, setDrillEntry] = useState(null);

  if (!history?.length) {
    return (
      <div style={{ padding: 32, color: "#8b949e", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 16, color: "#e6edf3", marginBottom: 6 }}>No data yet</div>
        <div style={{ fontSize: 13 }}>Run the simulation or advance weeks to see performance data.</div>
      </div>
    );
  }

  // Prepare data
  const data = history.map(h => ({
    week: h.week,
    weekLabel: `W${h.week}`,
    season: h.season,
    revenue: Math.round(h.weekRevenue),
    margin: Math.round(h.weekMargin),
    marginPct: h.weekMarginPct,
    marketShare: h.weekMarketShare,
    priceIndex: h.priceIndex ?? 1.0,
    plPenetration: h.plPenetration ?? 17.5,
    event: h.event?.label ?? null,
    _entry: h
  }));

  const weeklyRevTarget = brief ? Math.round(brief.annualRevenueTarget / 52) : null;
  const weeklyMgnTarget = brief ? Math.round((brief.annualRevenueTarget / 52) * (brief.marginTarget / 100)) : null;

  function handleBarClick(payload) {
    if (payload?.activePayload?.[0]?.payload?._entry) {
      setDrillEntry(payload.activePayload[0].payload._entry);
    }
  }

  // Color bars by performance vs target
  function barColor(entry) {
    if (!weeklyRevTarget) return "#1f6feb";
    return entry.revenue >= weeklyRevTarget ? "#3fb950" : "#1f6feb";
  }

  // ── Chart definitions (reusable for expand mode) ───────────────────────────
  const RevenueMarginChart = ({ height = 220 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 20, left: 10, bottom: 0 }} onClick={handleBarClick} style={{ cursor: "pointer" }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
        <XAxis dataKey="weekLabel" tick={{ fill: "#8b949e", fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.floor(data.length / 12)} />
        <YAxis yAxisId="left" tick={{ fill: "#8b949e", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
        <YAxis yAxisId="right" orientation="right" tick={{ fill: "#8b949e", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
        <Tooltip content={<CustomTooltip formatter={(v, n) => n === "Margin %" ? `${v}%` : `$${v?.toLocaleString()}`} />} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
        {weeklyRevTarget && <ReferenceLine yAxisId="left" y={weeklyRevTarget} stroke="#58a6ff" strokeDasharray="4 2" label={{ value: "Rev target", fill: "#58a6ff", fontSize: 10 }} />}
        {weeklyMgnTarget && <ReferenceLine yAxisId="left" y={weeklyMgnTarget} stroke="#3fb950" strokeDasharray="4 2" label={{ value: "Mgn target", fill: "#3fb950", fontSize: 10 }} />}
        <Bar yAxisId="left" dataKey="revenue" name="Revenue" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={barColor(d)} fillOpacity={0.85} />)}
        </Bar>
        <Bar yAxisId="left" dataKey="margin" name="Margin $" fill="#238636" radius={[3, 3, 0, 0]} fillOpacity={0.75} />
        <Line yAxisId="right" type="monotone" dataKey="marginPct" name="Margin %" stroke="#e3b341" dot={false} strokeWidth={2} />
      </ComposedChart>
    </ResponsiveContainer>
  );

  const MarketShareChart = ({ height = 200 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 20, left: 10, bottom: 0 }} onClick={handleBarClick} style={{ cursor: "pointer" }}>
        <defs>
          <linearGradient id="msGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1f6feb" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#1f6feb" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
        <XAxis dataKey="weekLabel" tick={{ fill: "#8b949e", fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.floor(data.length / 12)} />
        <YAxis domain={["auto", "auto"]} tick={{ fill: "#8b949e", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
        <Tooltip content={<CustomTooltip formatter={v => `${v?.toFixed(2)}%`} />} />
        {brief && <ReferenceLine y={brief.marketShareTarget} stroke="#3fb950" strokeDasharray="5 3" label={{ value: `Target ${brief.marketShareTarget}%`, fill: "#3fb950", fontSize: 10 }} />}
        <Area type="monotone" dataKey="marketShare" name="Market Share" stroke="#1f6feb" fill="url(#msGrad)" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: "#1f6feb" }} />
      </AreaChart>
    </ResponsiveContainer>
  );

  const PriceIndexChart = ({ height = 200 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 20, left: 10, bottom: 0 }} onClick={handleBarClick} style={{ cursor: "pointer" }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
        <XAxis dataKey="weekLabel" tick={{ fill: "#8b949e", fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.floor(data.length / 12)} />
        <YAxis domain={["auto", "auto"]} tick={{ fill: "#8b949e", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(2)} />
        <Tooltip content={<CustomTooltip formatter={v => v?.toFixed(3)} />} />
        <ReferenceLine y={1.0} stroke="#30363d" strokeDasharray="2 2" label={{ value: "Parity", fill: "#30363d", fontSize: 10 }} />
        {brief && <ReferenceLine y={brief.priceIndexCeiling} stroke="#f85149" strokeDasharray="5 3" label={{ value: `Ceiling ${brief.priceIndexCeiling}`, fill: "#f85149", fontSize: 10 }} />}
        <Line type="monotone" dataKey="priceIndex" name="Price Index" stroke="#f0883e" strokeWidth={2} dot={(props) => {
          const { cx, cy, payload } = props;
          const over = brief && payload.priceIndex > brief.priceIndexCeiling;
          return <circle key={`dot-${payload.week}`} cx={cx} cy={cy} r={3} fill={over ? "#f85149" : "#f0883e"} />;
        }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );

  const PLChart = ({ height = 200 }) => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 20, left: 10, bottom: 0 }} onClick={handleBarClick} style={{ cursor: "pointer" }}>
        <defs>
          <linearGradient id="plGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6e40c9" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#6e40c9" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
        <XAxis dataKey="weekLabel" tick={{ fill: "#8b949e", fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.floor(data.length / 12)} />
        <YAxis domain={["auto", "auto"]} tick={{ fill: "#8b949e", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
        <Tooltip content={<CustomTooltip formatter={v => `${v?.toFixed(1)}%`} />} />
        {brief && <ReferenceLine y={brief.plPenetrationTarget} stroke="#bf91f3" strokeDasharray="5 3" label={{ value: `Target ${brief.plPenetrationTarget}%`, fill: "#bf91f3", fontSize: 10 }} />}
        <Area type="monotone" dataKey="plPenetration" name="PL Penetration" stroke="#6e40c9" fill="url(#plGrad)" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: "#6e40c9" }} />
      </AreaChart>
    </ResponsiveContainer>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "20px 24px", overflowY: "auto" }}>
      {/* Scoreboard */}
      <Scoreboard history={history} brief={brief} krogerKPIs={krogerKPIs} />

      {/* Hint */}
      <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 16 }}>
        FY 2026 · Paper Goods · Dallas/Uptown · Kroger &nbsp;·&nbsp;
        Click any bar or data point to drill into that week's SKU breakdown. Click ⤢ to expand a chart.
      </div>

      {/* Chart 1 — Revenue & Margin */}
      <ChartCard
        title="Weekly Revenue & Gross Margin"
        subtitle="Bars = $ | Line = margin % | Green bars = at or above weekly target"
        onExpand={() => setExpanded("revenue")}
        height={240}
      >
        <RevenueMarginChart height={220} />
      </ChartCard>

      {/* Chart 2 — Market Share */}
      <ChartCard
        title="Market Share %"
        subtitle="Kroger's share of Paper Goods category across all 6 retailers"
        onExpand={() => setExpanded("share")}
        height={220}
      >
        <MarketShareChart height={200} />
      </ChartCard>

      {/* Chart 3 — Price Index */}
      <ChartCard
        title="Price Index vs Market"
        subtitle="1.00 = price parity | Red dots = above your ceiling | Below 1.00 = Kroger cheaper than market"
        onExpand={() => setExpanded("priceIndex")}
        height={220}
      >
        <PriceIndexChart height={200} />
      </ChartCard>

      {/* Chart 4 — PL Penetration */}
      <ChartCard
        title="Private Label Penetration %"
        subtitle="Estimated % of category volume going to store brands — lower is better for national brand health"
        onExpand={() => setExpanded("pl")}
        height={220}
      >
        <PLChart height={200} />
      </ChartCard>

      {/* Expand modals */}
      {expanded === "revenue" && (
        <ExpandedChart title="Weekly Revenue & Gross Margin" onClose={() => setExpanded(null)}>
          <RevenueMarginChart height="100%" />
        </ExpandedChart>
      )}
      {expanded === "share" && (
        <ExpandedChart title="Market Share %" onClose={() => setExpanded(null)}>
          <MarketShareChart height="100%" />
        </ExpandedChart>
      )}
      {expanded === "priceIndex" && (
        <ExpandedChart title="Price Index vs Market" onClose={() => setExpanded(null)}>
          <PriceIndexChart height="100%" />
        </ExpandedChart>
      )}
      {expanded === "pl" && (
        <ExpandedChart title="Private Label Penetration %" onClose={() => setExpanded(null)}>
          <PLChart height="100%" />
        </ExpandedChart>
      )}

      {/* Week drill-down */}
      {drillEntry && <WeekDrillDown entry={drillEntry} onClose={() => setDrillEntry(null)} />}
    </div>
  );
}
