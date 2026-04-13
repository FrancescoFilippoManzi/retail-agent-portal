import React from "react";

const s = {
  wrap: { padding: "16px 20px" },
  title: { fontSize: 13, fontWeight: 600, color: "#8b949e", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" },
  chartRow: { display: "flex", gap: 16 },
  chart: { flex: 1, background: "#161b22", border: "1px solid #21262d", borderRadius: 8, padding: "10px 14px" },
  chartTitle: { fontSize: 11, color: "#8b949e", marginBottom: 6 },
  bars: { display: "flex", alignItems: "flex-end", gap: 2, height: 60 },
  bar: { flex: 1, minWidth: 3, borderRadius: "2px 2px 0 0", transition: "height 0.3s" },
  axis: { display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: "#30363d" }
};

function MiniBar({ data, color, label, formatter }) {
  if (!data?.length) return null;
  const max = Math.max(...data, 1);
  const show = data.slice(-26); // last 26 weeks

  return (
    <div style={s.chart}>
      <div style={s.chartTitle}>{label}</div>
      <div style={s.bars}>
        {show.map((v, i) => (
          <div key={i} style={{
            ...s.bar,
            height: `${Math.max(2, (v / max) * 100)}%`,
            background: color,
            opacity: 0.7 + (i / show.length) * 0.3
          }} title={`Wk ${data.length - show.length + i + 1}: ${formatter(v)}`} />
        ))}
      </div>
      <div style={s.axis}>
        <span>Wk{data.length - show.length + 1}</span>
        <span>{formatter(data[data.length - 1])}</span>
        <span>Wk{data.length}</span>
      </div>
    </div>
  );
}

export default function HistoryChart({ krogerKPIs }) {
  const fmt$ = v => `$${(v / 1000).toFixed(1)}k`;
  const fmtPct = v => `${v?.toFixed(1)}%`;

  return (
    <div style={s.wrap}>
      <div style={s.title}>Kroger Performance Trend (last 26 weeks)</div>
      <div style={s.chartRow}>
        <MiniBar data={krogerKPIs.weeklyRevenue}     color="#1f6feb" label="Weekly Revenue"      formatter={fmt$} />
        <MiniBar data={krogerKPIs.weeklyMargin}      color="#3fb950" label="Weekly Margin"       formatter={fmt$} />
        <MiniBar data={krogerKPIs.weeklyMarketShare} color="#58a6ff" label="Market Share %"      formatter={fmtPct} />
      </div>
    </div>
  );
}
