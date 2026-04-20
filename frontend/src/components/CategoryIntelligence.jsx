import { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";

const IS_LOCAL = typeof window !== "undefined" && window.location.hostname === "localhost";
// Local: call CI server directly (bypasses Vite proxy which has no CI server locally)
// Production: use relative path routed via Vercel rewrites
const API_BASE = IS_LOCAL
  ? "https://87-99-154-201.nip.io/api"
  : "/api/ci";
const CHAT_URL = IS_LOCAL
  ? "https://87-99-154-201.nip.io/api/chat"
  : "/api/ci/chat";

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtMoney(n) {
  if (n == null) return "-";
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${Number(n).toFixed(2)}`;
}
function fmtNum(n) { return n != null ? Number(n).toLocaleString() : "-"; }
function fmtPct(n) { return n != null ? `${Number(n).toFixed(1)}%` : "-"; }

// ── Topic detection (fallback when API topic is absent) ───────────────────────
function detectTopic(text) {
  const t = text.toLowerCase();
  if (/oos|out.of.stock|stockout|supply|availability/.test(t)) return "oos";
  if (/pric|gap|elasticity|nb.*pl|pl.*nb/.test(t)) return "pricing";
  if (/promo|promotion|roi|bogo|deal|lift|tpr|discount/.test(t)) return "promo";
  if (/assort|sku|range|listing|delist|catalog/.test(t)) return "assortment";
  if (/revenue|sales|trend|basket|performance|week|growth/.test(t)) return "revenue";
  return null;
}

// ── Retailer config ────────────────────────────────────────────────────────────
const RETAILERS = [
  { id: "kroger",  label: "Kroger",  color: "#3b82f6" },
  { id: "publix",  label: "Publix",  color: "#22c55e" },
  { id: "walmart", label: "Walmart", color: "#f59e0b" },
  { id: "target",  label: "Target",  color: "#ef4444" },
  { id: "costco",  label: "Costco",  color: "#a855f7" },
  { id: "admin",   label: "Admin",   color: "#38bdf8" },
];

// ── Claude API (streaming — right panel unchanged) ────────────────────────────
async function askClaude(messages, onChunk, dailySnap, dataSummary, tenantId) {
  const d = dailySnap || {};
  const retailerName = tenantId === "admin" ? "All Retailers (Orlando MSA)" : (tenantId || "kroger").charAt(0).toUpperCase() + (tenantId || "kroger").slice(1);
  const system = `You are an expert Category Management AI for the Circe Category Intelligence platform, serving ${retailerName}. You have live data covering Orlando MSA, 2024-2025 across 5 retailers (Kroger, Publix, Walmart, Target, Costco) and 5 categories: Beverages, Dairy & Eggs, Frozen Pizza, Paper & Cleaning, Snacks.

Current snapshot (${d.date || "Dec 30, 2025"}):
- Revenue: ${fmtMoney(d.total_revenue)} | Transactions: ${fmtNum(d.total_transactions)} | Avg basket: $${d.avg_basket || "37.00"}
- PL penetration: ${fmtPct(d.pl_penetration_pct)} | Gross margin: ${fmtPct(d.gross_margin_pct)}
- OOS rate: ${fmtPct(d.oos_rate_pct)} | Top category: ${d.top_category ? `${d.top_category.category} (${fmtMoney(d.top_category.revenue)})` : "Paper & Cleaning"}

Be sharp, specific, and data-grounded. Use **bold** for key numbers. Keep responses focused — 3-5 sentences plus a "→ Next:" line. The left panel updates to show relevant charts.

IMPORTANT — data availability:
- 5 categories ONLY: Beverages, Dairy & Eggs, Frozen Pizza, Paper & Cleaning, Snacks
- Data covers 2024-01-01 to 2025-12-30 (2 years, Orlando MSA)
- "Yesterday" = Dec 30, 2025
- Super Bowl Sunday 2025 = Feb 9, 2025 | Super Bowl Sunday 2024 = Feb 11, 2024
- For admin tenant: cross-retailer comparisons are available (all 5 retailers)
${dataSummary ? `
━━━ ACTUAL DATA RETRIEVED FROM DATABASE ━━━
${dataSummary}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESPONSE INSTRUCTIONS:
- Answer using the EXACT numbers from the data above — do not estimate.
- Lead with the headline figure.
- Call out top/bottom performers with specific values.
- Give 1-2 sentences of strategic interpretation.
- End with a "→ Next:" action suggestion.
- Never say you lack data — it is provided above.` : `
- Answer based on the snapshot above.
- NEVER say data is unavailable — 2 years of Orlando MSA data exists.`}`;

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system }),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`API error ${resp.status}${errText ? ": " + errText.slice(0, 120) : ""}`);
  }
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of dec.decode(value).split("\n")) {
      if (!line.startsWith("data: ")) continue;
      try {
        const ev = JSON.parse(line.slice(6));
        if (ev.type === "content_block_delta" && ev.delta?.text) { full += ev.delta.text; onChunk(full); }
      } catch {}
    }
  }
  return full;
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#060d1a", border: "1px solid #1a3a5c", borderRadius: 6, padding: "0.45rem 0.7rem", fontSize: "0.7rem", fontFamily: "monospace" }}>
      <div style={{ color: "#e2e8f0", marginBottom: 3 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}</div>)}
    </div>
  );
}

// ── Markdown renderer (unchanged) ─────────────────────────────────────────────
function MD({ text, accent }) {
  return (
    <div style={{ lineHeight: 1.65 }}>
      {text.split("\n").map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: "0.3rem" }} />;
        if (line.startsWith("→")) return (
          <div key={i} style={{ marginTop: "0.55rem", padding: "0.35rem 0.7rem", borderLeft: `2px solid ${accent}`, background: "rgba(56,189,248,0.05)", fontSize: "0.76rem", color: accent, borderRadius: "0 4px 4px 0" }}>{line}</div>
        );
        const html = line
          .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${accent}">$1</strong>`)
          .replace(/`(.+?)`/g, `<code style="background:rgba(255,255,255,0.05);padding:1px 4px;border-radius:3px;font-size:0.8em;font-family:monospace">$1</code>`);
        return <p key={i} style={{ margin: "0.1rem 0" }} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
}

// ── Query Result Chart ─────────────────────────────────────────────────────────
function QueryResultChart({ result, onDismiss }) {
  const ACCENT = "#38bdf8"; const GOLD = "#fbbf24"; const TEXT = "#6b8aaa";
  const BRIGHT = "#e2e8f0"; const PANEL = "#09131f"; const BORDER = "#0f2540";
  const WARN = "#f87171"; const PURPLE = "#a78bfa"; const GREEN = "#34d399";
  const COLORS = [ACCENT, GOLD, PURPLE, GREEN, WARN];

  if (!result?.answer_data?.length) return null;
  const rows = result.answer_data;
  const keys = Object.keys(rows[0]);
  const xKey = keys[0];
  const numKeys = keys.slice(1).filter(k => typeof rows[0][k] === "number");

  const card = { background: PANEL, border: `1px solid rgba(56,189,248,0.3)`, borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "0.75rem" };
  const lbl = { fontFamily: "monospace", fontSize: "0.58rem", color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" };

  const header = (
    <div style={lbl}>
      <span>Query Result · {result.row_count} row{result.row_count !== 1 ? "s" : ""}</span>
      {onDismiss && <button onClick={onDismiss} style={{ background: "none", border: "none", color: TEXT, cursor: "pointer", fontSize: "0.9rem", padding: 0 }}>×</button>}
    </div>
  );

  // KPI: single row or chart_type === "kpi"
  if (result.chart_type === "kpi" || rows.length === 1) {
    const cols = Math.min(keys.length, 4);
    return (
      <div style={card}>
        {header}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "0.5rem" }}>
          {keys.slice(0, 4).map((k, i) => {
            const v = rows[0][k];
            const disp = typeof v === "number"
              ? (k.includes("revenue") || k.includes("amount") || k.includes("cost") || k.includes("total") ? fmtMoney(v) : k.includes("pct") || k.includes("rate") || k.includes("share") ? fmtPct(v) : fmtNum(v))
              : v;
            return (
              <div key={i} style={{ borderRight: i < cols - 1 ? `1px solid ${BORDER}` : "none", paddingRight: "0.5rem" }}>
                <div style={{ fontFamily: "monospace", fontSize: "0.55rem", color: TEXT, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "0.2rem" }}>{k}</div>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1rem", color: BRIGHT, fontWeight: 700 }}>{disp}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (result.chart_type === "bar" && numKeys.length > 0) {
    return (
      <div style={card}>
        {header}
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={rows.slice(0, 20)} margin={{ left: -20 }}>
            <XAxis dataKey={xKey} tick={{ fontSize: 7, fill: TEXT, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 7, fill: TEXT }} axisLine={false} tickLine={false} />
            <Tooltip content={<Tip />} />
            {numKeys.slice(0, 2).map((k, i) => <Bar key={k} dataKey={k} fill={COLORS[i]} name={k} radius={[3, 3, 0, 0]} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (result.chart_type === "line" && numKeys.length > 0) {
    return (
      <div style={card}>
        {header}
        <ResponsiveContainer width="100%" height={110}>
          <LineChart data={rows.slice(0, 100)} margin={{ left: -20 }}>
            <XAxis dataKey={xKey} tick={{ fontSize: 7, fill: TEXT, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 7, fill: TEXT }} axisLine={false} tickLine={false} />
            <Tooltip content={<Tip />} />
            {numKeys.slice(0, 3).map((k, i) => <Line key={k} dataKey={k} stroke={COLORS[i]} strokeWidth={i === 0 ? 2 : 1.5} dot={false} name={k} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (result.chart_type === "scatter" && numKeys.length >= 2) {
    return (
      <div style={card}>
        {header}
        <ResponsiveContainer width="100%" height={110}>
          <ScatterChart margin={{ left: -20, right: 10 }}>
            <XAxis dataKey={numKeys[0]} name={numKeys[0]} tick={{ fontSize: 7, fill: TEXT }} axisLine={false} tickLine={false} />
            <YAxis dataKey={numKeys[1]} name={numKeys[1]} tick={{ fontSize: 7, fill: TEXT }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<Tip />} />
            <Scatter data={rows} fill={ACCENT} name="data" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Fallback table
  return (
    <div style={card}>
      {header}
      <div style={{ maxHeight: 80, overflowY: "auto" }}>
        {rows.slice(0, 5).map((row, i) => (
          <div key={i} style={{ display: "flex", gap: "0.5rem", fontSize: "0.68rem", color: TEXT, padding: "0.12rem 0", borderBottom: `1px solid ${BORDER}` }}>
            {keys.slice(0, 4).map(k => <span key={k} style={{ flex: 1, color: typeof row[k] === "number" ? ACCENT : TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row[k]}</span>)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Left-panel loading pulse ──────────────────────────────────────────────────
function PanelLoader() {
  const ACCENT = "#38bdf8"; const TEXT = "#6b8aaa";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0", marginBottom: "0.5rem" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, animation: `pulse 1.2s ${i * 0.18}s infinite` }} />
      ))}
      <span style={{ fontFamily: "monospace", fontSize: "0.6rem", color: TEXT, letterSpacing: "0.1em" }}>FETCHING DATA…</span>
    </div>
  );
}

// ── Error card (left panel only) ──────────────────────────────────────────────
function ErrorCard({ message, onDismiss }) {
  const WARN = "#f87171";
  return (
    <div style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: "0.65rem 0.9rem", display: "flex", gap: "0.6rem", alignItems: "flex-start", marginBottom: "0.6rem" }}>
      <span style={{ color: WARN, flexShrink: 0 }}>⚠</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "monospace", fontSize: "0.58rem", color: WARN, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>API Error</div>
        <div style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "#fca5a5" }}>{message}</div>
      </div>
      {onDismiss && <button onClick={onDismiss} style={{ background: "none", border: "none", color: WARN, cursor: "pointer", fontSize: "1rem", padding: 0 }}>×</button>}
    </div>
  );
}

// ── DataPanel ─────────────────────────────────────────────────────────────────
function DataPanel({ topic, isTransitioning, topicData, dailyData, apiLoading, apiError, onDismissError, queryResult, onDismissQuery }) {
  const ACCENT = "#38bdf8"; const GOLD = "#fbbf24"; const GREEN = "#34d399";
  const WARN = "#f87171"; const PURPLE = "#a78bfa";
  const PANEL = "#09131f"; const BORDER = "#0f2540";
  const TEXT = "#6b8aaa"; const BRIGHT = "#e2e8f0";

  const s = {
    wrap: { opacity: isTransitioning ? 0 : 1, transition: "opacity 0.35s ease", height: "100%", display: "flex", flexDirection: "column", gap: "0.75rem" },
    card: { background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "0.85rem 1rem" },
    lbl: { fontFamily: "monospace", fontSize: "0.58rem", color: TEXT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.6rem" },
    grid4: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" },
    kpi: { background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "0.6rem 0.7rem" },
    kLbl: { fontFamily: "monospace", fontSize: "0.56rem", color: TEXT, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.25rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    kVal: { fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1rem", color: BRIGHT, fontWeight: 700 },
  };

  const KpiRow = ({ items }) => (
    <div style={s.grid4}>
      {items.map((k, i) => (
        <div key={i} style={s.kpi}>
          <div style={s.kLbl}>{k.label}</div>
          <div style={s.kVal}>{k.value}</div>
          <div style={{ fontFamily: "monospace", fontSize: "0.62rem", color: k.up ? GREEN : WARN, marginTop: "0.15rem" }}>{k.delta}</div>
        </div>
      ))}
    </div>
  );

  const top = (
    <>
      {apiError && <ErrorCard message={apiError} onDismiss={onDismissError} />}
      {queryResult && !queryResult.error && <QueryResultChart result={queryResult} onDismiss={onDismissQuery} />}
      {apiLoading && <PanelLoader />}
    </>
  );

  // ── OOS ────────────────────────────────────────────────────────────────────
  if (topic === "oos") {
    const tk = topicData?.kpis || {};
    const byCategory = topicData?.by_category || [];
    const trend = topicData?.trend || [];
    const worst = byCategory[0] || {};
    return (
      <div style={s.wrap}>
        {top}
        <KpiRow items={[
          { label: "OOS Rate",       value: fmtPct(tk.oos_rate_pct),                                      delta: tk.date || "-",          up: false },
          { label: "Worst Category", value: worst.category || "-",                                         delta: fmtPct(worst.oos_pct),   up: false },
          { label: "Affected Cats",  value: byCategory.filter(r => (r.oos_pct || 0) > 0.5).length,        delta: "above 0.5%",            up: false },
          { label: "SKU Coverage",   value: fmtPct(100 - (tk.oos_rate_pct || 0)),                          delta: "availability",           up: true },
        ]} />
        <div style={{ ...s.card, flex: 1 }}>
          <div style={s.lbl}>OOS Rate Trend (%)</div>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="gWarn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={WARN} stopOpacity={0.3} /><stop offset="95%" stopColor={WARN} stopOpacity={0} /></linearGradient>
              </defs>
              <XAxis dataKey="week_id" tick={{ fontSize: 9, fill: TEXT, fontFamily: "monospace" }} axisLine={false} tickLine={false} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 9, fill: TEXT }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="oos_pct" stroke={WARN} strokeWidth={2} fill="url(#gWarn)" name="OOS %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={s.card}>
          <div style={s.lbl}>OOS Rate by Category</div>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={byCategory} margin={{ left: -25 }}>
              <XAxis dataKey="category" tick={{ fontSize: 8, fill: TEXT, fontFamily: "monospace" }} axisLine={false} tickLine={false} tickFormatter={v => v.split(" ")[0]} />
              <YAxis tick={{ fontSize: 8, fill: TEXT }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="oos_pct" radius={[3, 3, 0, 0]} name="OOS %">
                {byCategory.map((d, i) => <Cell key={i} fill={d.oos_pct > 2 ? WARN : d.oos_pct > 1 ? GOLD : ACCENT} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // ── Pricing ────────────────────────────────────────────────────────────────
  if (topic === "pricing") {
    const tk = topicData?.kpis || {};
    const gap = (topicData?.gap || []).slice(0, 8);
    const elasticity = topicData?.elasticity || [];
    const idx = tk.avg_price_index;
    return (
      <div style={s.wrap}>
        {top}
        <KpiRow items={[
          { label: "Avg Price Index",  value: idx != null ? `${idx}` : "-",                                     delta: "vs market",       up: (idx || 100) <= 105 },
          { label: "Price Premium",    value: idx != null ? `${idx > 100 ? "+" : ""}${(idx - 100).toFixed(1)}%` : "-", delta: "above market", up: (idx || 100) <= 100 },
          { label: "Categories",       value: gap.length,                                                        delta: "tracked",          up: true },
          { label: "Date",             value: tk.date || "-",                                                    delta: "latest data",      up: true },
        ]} />
        <div style={{ ...s.card, flex: 1 }}>
          <div style={s.lbl}>Own vs Market Avg Price by Category</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={gap} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 8, fill: TEXT }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <YAxis dataKey="category" type="category" tick={{ fontSize: 8, fill: TEXT, fontFamily: "monospace" }} axisLine={false} tickLine={false} width={80} tickFormatter={v => v.split(" ")[0]} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="own_avg_price" fill={ACCENT} name="Own $" radius={[0, 3, 3, 0]} />
              <Bar dataKey="market_avg_price" fill={GOLD} name="Market $" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={s.card}>
          <div style={s.lbl}>PL vs NB Avg Price by Category</div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={topicData?.pl_nb_price || []} margin={{ left: -20 }}>
              <XAxis dataKey="category" tick={{ fontSize: 7, fill: TEXT, fontFamily: "monospace" }} axisLine={false} tickLine={false} tickFormatter={v => v.split(" ")[0]} />
              <YAxis tick={{ fontSize: 7, fill: TEXT }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="pl_avg_price" fill={GOLD} name="PL $" radius={[3, 3, 0, 0]} />
              <Bar dataKey="nb_avg_price" fill={ACCENT} name="NB $" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // ── Promotions ─────────────────────────────────────────────────────────────
  if (topic === "promo" || topic === "promotions") {
    const tk = topicData?.kpis || {};
    const roi = [...(topicData?.roi || [])].sort((a, b) => (b.promo_revenue || 0) - (a.promo_revenue || 0));
    const weekly = topicData?.weekly || [];
    const best = roi[0] || {};
    return (
      <div style={s.wrap}>
        {top}
        <KpiRow items={[
          { label: "Total Discount",    value: fmtMoney(tk.total_discount_yesterday),  delta: "yesterday",     up: false },
          { label: "Promo Revenue %",   value: fmtPct(tk.promo_revenue_pct),           delta: "of total",      up: false },
          { label: "Best Promo Type",   value: best.promo_type || "-",                 delta: "by revenue",    up: true },
          { label: "Promo Types",       value: roi.length,                             delta: "active",        up: true },
        ]} />
        <div style={{ ...s.card, flex: 1 }}>
          <div style={s.lbl}>Promo Revenue by Type</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={roi} margin={{ left: -20 }}>
              <XAxis dataKey="promo_type" tick={{ fontSize: 8, fill: TEXT, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: TEXT }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="promo_revenue" radius={[4, 4, 0, 0]} name="Revenue $">
                {roi.map((d, i) => <Cell key={i} fill={(d.avg_margin_pct || 0) >= 40 ? GREEN : (d.avg_margin_pct || 0) >= 30 ? ACCENT : GOLD} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={s.card}>
          <div style={s.lbl}>Weekly Promo Revenue %</div>
          <ResponsiveContainer width="100%" height={90}>
            <AreaChart data={weekly} margin={{ left: -25 }}>
              <XAxis dataKey="week_id" tick={{ fontSize: 8, fill: TEXT, fontFamily: "monospace" }} axisLine={false} tickLine={false} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 8, fill: TEXT }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="promo_pct" stroke={GOLD} fill={GOLD} fillOpacity={0.35} name="Promo %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // ── Assortment ─────────────────────────────────────────────────────────────
  if (topic === "assortment") {
    const tk = topicData?.kpis || {};
    const radar = topicData?.radar || [];
    const tiers = topicData?.tiers || [];
    const radarData = radar.slice(0, 6).map(r => ({ metric: (r.category || "").split(" ")[0], score: Math.round(r.pl_pct || 0) }));
    const tierMap = {};
    tiers.forEach(r => {
      if (!tierMap[r.category]) tierMap[r.category] = { category: r.category, pl: 0, nb: 0 };
      if (r.brand_type === "PL") tierMap[r.category].pl = r.revenue || 0;
      else tierMap[r.category].nb = r.revenue || 0;
    });
    const tierChart = Object.values(tierMap).sort((a, b) => (b.pl + b.nb) - (a.pl + a.nb)).slice(0, 6);
    return (
      <div style={s.wrap}>
        {top}
        <KpiRow items={[
          { label: "Total SKUs",    value: fmtNum(tk.total_skus),                     delta: "in catalog",    up: true },
          { label: "PL SKU Share",  value: fmtPct(tk.pl_sku_share),                   delta: "of assortment", up: true },
          { label: "NB SKU Share",  value: fmtPct(100 - (tk.pl_sku_share || 0)),      delta: "of assortment", up: true },
          { label: "Categories",    value: radar.length,                              delta: "with revenue",  up: true },
        ]} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", flex: 1 }}>
          <div style={s.card}>
            <div style={s.lbl}>PL % by Top Category</div>
            <ResponsiveContainer width="100%" height={160}>
              <RadarChart data={radarData}>
                <PolarGrid stroke={BORDER} />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 8, fill: TEXT, fontFamily: "monospace" }} />
                <Radar name="PL %" dataKey="score" stroke={ACCENT} fill={ACCENT} fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div style={s.card}>
            <div style={s.lbl}>NB vs PL Revenue</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={tierChart} layout="vertical" margin={{ left: 5, right: 10 }}>
                <XAxis type="number" tick={{ fontSize: 8, fill: TEXT }} axisLine={false} tickLine={false} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 8, fill: TEXT }} axisLine={false} tickLine={false} width={60} tickFormatter={v => v.split(" ")[0]} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="nb" fill={ACCENT} name="NB $" radius={[0, 3, 3, 0]} />
                <Bar dataKey="pl" fill={GOLD} name="PL $" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // ── Competitive (legacy - redirect to revenue) ────────────────────────────
  if (topic === "competitive") {
    const tk = topicData?.kpis || {};
    const index = [...(topicData?.index || [])].sort((a, b) => (b.market_units || 0) - (a.market_units || 0));
    const trendRaw = topicData?.trend || [];
    const weekMap = {};
    trendRaw.forEach(r => {
      if (!weekMap[r.week_id]) weekMap[r.week_id] = { w: r.week_id.slice(5), sum: 0, cnt: 0 };
      weekMap[r.week_id].sum += r.pl_pct || 0;
      weekMap[r.week_id].cnt += 1;
    });
    const trend = Object.values(weekMap)
      .map(r => ({ w: r.w, pl_pct: Math.round(r.sum / r.cnt * 10) / 10 }))
      .sort((a, b) => a.w.localeCompare(b.w)).slice(-12);
    const top1 = index[0] || {};
    const avgPL = index.length ? (index.reduce((s, r) => s + (r.market_pl_pct || 0), 0) / index.length).toFixed(1) : 0;
    return (
      <div style={s.wrap}>
        {top}
        <KpiRow items={[
          { label: "Market Weeks",   value: fmtNum(tk.market_weeks_available),                    delta: "of data",       up: true },
          { label: "Categories",     value: index.length,                                          delta: "tracked",       up: true },
          { label: "Top by Volume",  value: (top1.category || "-").split(" ")[0],                  delta: fmtNum(top1.market_units) + " units", up: true },
          { label: "Avg Market PL%", value: fmtPct(avgPL),                                        delta: "across cats",   up: true },
        ]} />
        <div style={{ ...s.card, flex: 1 }}>
          <div style={s.lbl}>Market PL % by Category (Dec 2025)</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={index} margin={{ left: -20 }}>
              <XAxis dataKey="category" tick={{ fontSize: 8, fill: TEXT, fontFamily: "monospace" }} axisLine={false} tickLine={false} tickFormatter={v => v.split(" ")[0]} />
              <YAxis tick={{ fontSize: 8, fill: TEXT }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="market_pl_pct" radius={[4, 4, 0, 0]} name="PL %">
                {index.map((d, i) => <Cell key={i} fill={(d.market_pl_pct || 0) >= 30 ? GREEN : (d.market_pl_pct || 0) >= 20 ? ACCENT : GOLD} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={s.card}>
          <div style={s.lbl}>Market PL % Trend (weekly avg)</div>
          <ResponsiveContainer width="100%" height={90}>
            <LineChart data={trend} margin={{ left: -25 }}>
              <XAxis dataKey="w" tick={{ fontSize: 8, fill: TEXT, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: TEXT }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Line dataKey="pl_pct" stroke={ACCENT} strokeWidth={2} dot={false} name="Avg PL %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // ── Planogram ──────────────────────────────────────────────────────────────
  if (topic === "planogram") {
    const tk = topicData?.kpis || {};
    const compliance = topicData?.compliance || [];
    const below90 = compliance.filter(r => (r.compliance_pct || 0) < 90).length;
    return (
      <div style={s.wrap}>
        {top}
        <KpiRow items={[
          { label: "Avg Compliance", value: fmtPct(tk.avg_compliance_pct),  delta: "SKU coverage",    up: (tk.avg_compliance_pct || 0) >= 90 },
          { label: "Categories",     value: compliance.length,              delta: "tracked",         up: true },
          { label: "Below 90%",      value: below90,                        delta: "need attention",  up: below90 === 0 },
          { label: "Date",           value: tk.date || "-",                 delta: "latest data",     up: true },
        ]} />
        <div style={{ ...s.card, flex: 1 }}>
          <div style={s.lbl}>SKU Compliance by Category</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={compliance} margin={{ left: -20 }}>
              <XAxis dataKey="category" tick={{ fontSize: 8, fill: TEXT, fontFamily: "monospace" }} axisLine={false} tickLine={false} tickFormatter={v => v.split(" ")[0]} />
              <YAxis tick={{ fontSize: 8, fill: TEXT }} axisLine={false} tickLine={false} domain={[60, 100]} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="compliance_pct" radius={[3, 3, 0, 0]} name="Compliance %">
                {compliance.map((d, i) => <Cell key={i} fill={(d.compliance_pct || 0) >= 95 ? GREEN : (d.compliance_pct || 0) >= 85 ? ACCENT : WARN} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // ── Revenue / Default ──────────────────────────────────────────────────────
  const tk = topicData?.kpis || {};
  const weekly = topicData?.weekly || [];
  const byCat = topicData?.by_category || [];
  const d = dailyData || {};
  const wowTrend = d.wow_trend || [];
  return (
    <div style={s.wrap}>
      {top}
      <KpiRow items={[
        { label: "Total Revenue",  value: fmtMoney(tk.total_revenue),     delta: "2024-2025",   up: true },
        { label: "Transactions",   value: fmtNum(tk.total_transactions),   delta: "this period", up: true },
        { label: "Avg Basket",     value: tk.avg_basket ? `$${tk.avg_basket}` : "-", delta: "per visit", up: true },
        { label: "Gross Margin",   value: fmtPct(d.gross_margin_pct),     delta: "blended avg", up: true },
      ]} />
      <div style={{ ...s.card, flex: 1 }}>
        <div style={s.lbl}>Weekly Revenue Trend (last 52 weeks)</div>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={weekly}>
            <defs>
              <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ACCENT} stopOpacity={0.3} /><stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="week_id" tick={{ fontSize: 9, fill: TEXT, fontFamily: "monospace" }} axisLine={false} tickLine={false} tickFormatter={v => v.slice(5)} />
            <YAxis tick={{ fontSize: 9, fill: TEXT }} axisLine={false} tickLine={false} />
            <Tooltip content={<Tip />} />
            <Area type="monotone" dataKey="revenue" stroke={ACCENT} strokeWidth={2} fill="url(#gRev)" name="Revenue $" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
        <div style={s.card}>
          <div style={s.lbl}>Yesterday's Highlights</div>
          {d.top_category && [
            { name: "Top: " + d.top_category.category,    val: fmtMoney(d.top_category.revenue),    color: GREEN },
            { name: "Bottom: " + (d.bottom_category?.category || "-"), val: fmtMoney(d.bottom_category?.revenue), color: WARN },
            { name: "OOS Rate",        val: fmtPct(d.oos_rate_pct),        color: (d.oos_rate_pct || 0) < 5 ? GREEN : WARN },
            { name: "PL Penetration",  val: fmtPct(d.pl_penetration_pct),  color: GOLD },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.73rem", marginBottom: "0.25rem" }}>
              <span style={{ color: TEXT }}>{item.name}</span>
              <span style={{ fontFamily: "monospace", color: item.color, fontWeight: 600 }}>{item.val}</span>
            </div>
          ))}
        </div>
        <div style={s.card}>
          <div style={s.lbl}>Category Breakdown</div>
          {byCat.slice(0, 5).map((cat, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.73rem", marginBottom: "0.25rem" }}>
              <span style={{ color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>{cat.category}</span>
              <span style={{ fontFamily: "monospace", color: ACCENT, fontWeight: 600, flexShrink: 0 }}>{fmtMoney(cat.revenue)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Topic labels + suggestions ─────────────────────────────────────────────────
const TOPIC_LABELS = {
  revenue:    "Revenue & Trend",
  oos:        "Out-of-Stock Analysis",
  pricing:    "Pricing Intelligence",
  promo:      "Promotion Performance",
  assortment: "Assortment Intelligence",
};

const SUGG_DEFAULT = [
  "What was revenue yesterday?",
  "Which categories have the highest OOS rate?",
  "What is our PL penetration by category?",
  "Which promotions drove the most revenue?",
  "Show me Frozen Pizza weekly trend",
  "What is our price gap vs market?",
];

const SUGG_ADMIN = [
  "Compare PL penetration across all retailers",
  "Which retailer has highest gross margin?",
  "What were Walmart Beverage sales last week?",
  "Compare Frozen Pizza sales Super Bowl 2024 vs 2025",
  "What was revenue yesterday for Publix?",
  "Show PL share trend for all retailers",
];

// ═══════════════════════════════════════════════════════════════════════════════
export default function CategoryIntelligence({ retailer: retailerProp, category: categoryProp }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState("");
  const [topic, setTopic] = useState("revenue");
  const [transitioning, setTransitioning] = useState(false);
  const [topicData, setTopicData] = useState(null);
  const [dailyData, setDailyData] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [queryResult, setQueryResult] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState({});
  const [tenantId, setTenantId] = useState(retailerProp || "kroger");
  const bottomRef = useRef(null);
  const taRef = useRef(null);

  const ACCENT = "#38bdf8"; const BG = "#060d1a"; const PANEL = "#09131f";
  const BORDER = "#0f2540"; const TEXT = "#6b8aaa"; const BRIGHT = "#e2e8f0";
  const GREEN = "#34d399"; const WARN = "#f87171";
  const GOLD = "#fbbf24"; const PURPLE = "#a78bfa";

  const currentRetailer = RETAILERS.find(r => r.id === tenantId) || RETAILERS[0];
  const SUGG = tenantId === "admin" ? SUGG_ADMIN : SUGG_DEFAULT;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, stream]);

  // ── On mount + tenant change: load daily KPIs + revenue topic ─────────────
  useEffect(() => {
    const init = async () => {
      setApiLoading(true);
      try {
        const [dr, tr] = await Promise.all([
          fetch(`${API_BASE}/daily/${tenantId}`).then(r => r.json()),
          fetch(`${API_BASE}/topic/${tenantId}/revenue`).then(r => r.json()),
        ]);
        if (dr.detail) throw new Error(dr.detail);
        if (tr.detail) throw new Error(tr.detail);
        setDailyData(dr);
        setTopicData(tr);
      } catch (e) {
        setApiError(`Failed to load: ${e.message}`);
      } finally {
        setApiLoading(false);
      }
    };
    init();
  }, [tenantId]);

  // ── Fetch topic data ───────────────────────────────────────────────────────
  const fetchTopicData = useCallback(async (t, tid) => {
    const tenant = tid || tenantId;
    setApiLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/topic/${tenant}/${t}`).then(r => r.json());
      if (res.detail) throw new Error(res.detail);
      setTopicData(res);
    } catch (e) {
      setApiError(`Could not load ${t} data: ${e.message}`);
    } finally {
      setApiLoading(false);
    }
  }, [tenantId]);

  // ── Handle tenant change ───────────────────────────────────────────────────
  const changeTenant = useCallback((newTenant) => {
    setTenantId(newTenant);
    setMsgs([]);
    setStream("");
    setQueryResult(null);
    setFeedbackGiven({});
    setTopic("revenue");
  }, []);

  // ── Switch topic with fade ─────────────────────────────────────────────────
  const switchTopic = useCallback((newTopic, alsoFetch = true) => {
    setTransitioning(true);
    setTimeout(() => { setTopic(newTopic); setTransitioning(false); }, 320);
    if (alsoFetch) fetchTopicData(newTopic);
  }, [fetchTopicData]);

  // Pre-select topic based on category prop from landing page
  useEffect(() => {
    if (!categoryProp) return;
    const topicMap = {
      "Dairy & Eggs": "revenue",
      "Beverages":    "revenue",
      "Snacks":       "revenue",
      "Frozen Pizza": "promo",
      "Paper & Cleaning": "oos",
    };
    const t = topicMap[categoryProp] || "revenue";
    switchTopic(t, true);
  }, [categoryProp, switchTopic]);

  // Topic buttons — only valid topics for new DB
  const TOPIC_BUTTONS = ["revenue", "oos", "pricing", "promo", "assortment"];

  // ── Send message ───────────────────────────────────────────────────────────
  const send = useCallback(async (text) => {
    const q = text || input.trim();
    if (!q || loading) return;
    setInput("");
    setQueryResult(null);

    const userMsg = { role: "user", content: q };
    const history = [...msgs, userMsg];
    setMsgs(history);
    setLoading(true);
    setStream("");

    // Immediate local topic detect → switch panel while query runs
    const localTopic = detectTopic(q);
    if (localTopic) switchTopic(localTopic);

    // STEP A — Run data query first so Claude can answer with real numbers
    let dataSummary = "";
    try {
      const qResult = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, tenant_id: tenantId }),
      }).then(r => r.json());

      // Show result on left panel
      setQueryResult(qResult);
      if (qResult?.topic && !qResult?.error) {
        setTransitioning(true);
        setTimeout(() => { setTopic(qResult.topic); setTransitioning(false); }, 320);
        fetchTopicData(qResult.topic);
      }

      // STEP B — Format rows into a plain-text summary for Claude's system prompt
      if (qResult?.answer_data?.length) {
        const rows = qResult.answer_data;
        const cols = Object.keys(rows[0]);
        dataSummary = `Query returned ${rows.length} row${rows.length !== 1 ? "s" : ""}.\n`;
        rows.slice(0, 20).forEach((row, i) => {
          dataSummary += `Row ${i + 1}: ${cols.map(c => `${c}=${row[c]}`).join(", ")}\n`;
        });
        if (qResult.sql) dataSummary += `\nSQL used: ${qResult.sql}`;
      }
    } catch (_) {
      // query failure is non-fatal — Claude will still respond from its knowledge
    }

    // STEP C — Stream Claude answer with the query data injected
    try {
      const answer = await askClaude(
        history.map(m => ({ role: m.role, content: m.content })),
        chunk => setStream(chunk),
        dailyData,
        dataSummary,
        tenantId,
      );
      setMsgs([...history, { role: "assistant", content: answer }]);
      setStream("");
    } catch (e) {
      setMsgs([...history, { role: "assistant", content: `⚠️ ${e.message}` }]);
      setStream("");
    } finally {
      setLoading(false);
      taRef.current?.focus();
    }
  }, [input, loading, msgs, switchTopic, fetchTopicData, dailyData, tenantId]);

  // ── Feedback (thumbs up / down under each AI message) ──────────────────────
  const callFeedback = useCallback(async (msgIndex, wasHelpful) => {
    if (feedbackGiven[msgIndex]) return; // already voted
    setFeedbackGiven(prev => ({ ...prev, [msgIndex]: wasHelpful ? "up" : "down" }));
    // The question is always the preceding user message
    const question = msgs[msgIndex - 1]?.role === "user" ? msgs[msgIndex - 1].content : "";
    try {
      await fetch(`${API_BASE}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, sql: null, was_helpful: wasHelpful, correction: null, tenant_id: tenantId }),
      });
    } catch {} // fire-and-forget
  }, [msgs, feedbackGiven]);

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0, background: BG, fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: "0.84rem", color: TEXT, overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
      `}</style>

      {/* ══ LEFT: Data Panel ══════════════════════════════════════════════════ */}
      <div style={{ width: "52%", borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "0.85rem 1.3rem", borderBottom: `1px solid ${BORDER}`, background: PANEL, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "monospace", fontSize: "0.58rem", color: currentRetailer.color, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "0.15rem" }}>
              {currentRetailer.label} · Orlando MSA
            </div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.1rem", color: BRIGHT, fontWeight: 700 }}>
              {TOPIC_LABELS[topic] || "Category Intelligence"}
            </div>
          </div>
          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: apiLoading ? GOLD : GREEN, boxShadow: `0 0 7px ${apiLoading ? GOLD : GREEN}`, animation: "pulse 2s infinite", flexShrink: 0 }} />
              <span style={{ fontFamily: "monospace", fontSize: "0.6rem", color: apiLoading ? GOLD : GREEN }}>{apiLoading ? "LOADING…" : "LIVE · 2024-2025"}</span>
            </div>
            {topic && (
              <div style={{ fontFamily: "monospace", fontSize: "0.58rem", color: ACCENT, background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 4, padding: "2px 7px", animation: "slideIn 0.3s ease" }}>
                ⬡ {topic.toUpperCase()} VIEW
              </div>
            )}
          </div>
        </div>
        {/* Topic navigation tabs */}
        <div style={{ display: "flex", gap: "0.3rem", padding: "0.5rem 1.3rem 0", background: PANEL, borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
          {TOPIC_BUTTONS.map(t => (
            <button key={t} onClick={() => switchTopic(t)}
              style={{ background: topic === t ? "rgba(56,189,248,0.12)" : "none", border: `1px solid ${topic === t ? "rgba(56,189,248,0.4)" : "transparent"}`, color: topic === t ? ACCENT : TEXT, borderRadius: "4px 4px 0 0", padding: "0.25rem 0.6rem", cursor: "pointer", fontFamily: "monospace", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.08em", transition: "all 0.15s" }}>
              {t}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0.9rem 1.3rem" }}>
          <DataPanel
            topic={topic}
            isTransitioning={transitioning}
            topicData={topicData}
            dailyData={dailyData}
            apiLoading={apiLoading}
            apiError={apiError}
            onDismissError={() => setApiError(null)}
            queryResult={queryResult}
            onDismissQuery={() => setQueryResult(null)}
          />
        </div>
      </div>

      {/* ══ RIGHT: Chat ═══════════════════════════════════════════════════════ */}
      <div style={{ width: "48%", display: "flex", flexDirection: "column", background: PANEL }}>
        <div style={{ padding: "0.85rem 1.3rem", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "monospace", fontSize: "0.58rem", color: ACCENT, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.15rem" }}>AI Assistant · Circe Platform</div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.05rem", color: BRIGHT, fontWeight: 600 }}>Category Manager Chat</div>
          </div>
          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            {/* Tenant / Retailer Selector */}
            <div style={{ display: "flex", gap: "0.2rem", alignItems: "center" }}>
              {RETAILERS.map(r => (
                <button key={r.id} onClick={() => changeTenant(r.id)}
                  title={r.label}
                  style={{
                    background: tenantId === r.id ? `${r.color}20` : "none",
                    border: `1px solid ${tenantId === r.id ? r.color : BORDER}`,
                    color: tenantId === r.id ? r.color : TEXT,
                    borderRadius: 4,
                    padding: "0.18rem 0.45rem",
                    cursor: "pointer",
                    fontFamily: "monospace",
                    fontSize: "0.55rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    transition: "all 0.15s",
                    fontWeight: tenantId === r.id ? 700 : 400,
                  }}>
                  {r.label}
                </button>
              ))}
            </div>
            {msgs.length > 0 && (
              <button onClick={() => { setMsgs([]); setStream(""); setTopic("revenue"); setQueryResult(null); setFeedbackGiven({}); fetchTopicData("revenue"); }}
                style={{ background: "none", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 6, padding: "0.22rem 0.65rem", cursor: "pointer", fontFamily: "monospace", fontSize: "0.62rem" }}>
                Clear
              </button>
            )}
            <div style={{ fontFamily: "monospace", fontSize: "0.6rem", color: TEXT, background: BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "0.22rem 0.6rem" }}>
              {msgs.filter(m => m.role === "assistant").length} msg
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.1rem 1.3rem" }}>
          {msgs.length === 0 && !stream ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "1.3rem", textAlign: "center" }}>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.25rem", color: BRIGHT, fontWeight: 600, lineHeight: 1.35 }}>
                What's happening<br />in your category?
              </div>
              <div style={{ fontSize: "0.76rem", color: TEXT, maxWidth: 300, lineHeight: 1.7 }}>
                Ask a question — the data panel on the left will update with live charts and KPIs from the API.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center", maxWidth: 380 }}>
                {SUGG.map((s, i) => (
                  <button key={i} onClick={() => send(s)}
                    style={{ background: BG, border: `1px solid ${tenantId === "admin" ? "rgba(56,189,248,0.3)" : BORDER}`, color: tenantId === "admin" ? ACCENT : TEXT, borderRadius: 20, padding: "0.32rem 0.8rem", cursor: "pointer", fontFamily: "monospace", fontSize: "0.67rem", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = tenantId === "admin" ? "rgba(56,189,248,0.3)" : BORDER; e.currentTarget.style.color = tenantId === "admin" ? ACCENT : TEXT; }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {msgs.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: "0.65rem", marginBottom: "1rem", flexDirection: m.role === "user" ? "row-reverse" : "row", animation: "fadeUp 0.3s ease" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: m.role === "user" ? "#0d2040" : BG, border: `1px solid ${m.role === "user" ? "#1a4070" : BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: "0.58rem", color: m.role === "user" ? ACCENT : "#fbbf24" }}>
                    {m.role === "user" ? "FM" : "AI"}
                  </div>
                  {m.role === "assistant" ? (
                    <div style={{ maxWidth: "80%", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                      <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: "3px 13px 13px 13px", padding: "0.7rem 0.95rem", color: TEXT }}>
                        <MD text={m.content} accent={ACCENT} />
                      </div>
                      <div style={{ display: "flex", gap: "0.3rem", paddingLeft: "0.4rem" }}>
                        {(["up", "down"]).map(dir => {
                          const given = feedbackGiven[i];
                          const isThis = given === dir;
                          const isOther = given && given !== dir;
                          return (
                            <button key={dir}
                              onClick={() => callFeedback(i, dir === "up")}
                              disabled={!!given}
                              title={dir === "up" ? "Helpful" : "Not helpful"}
                              style={{
                                background: "none", border: "none", cursor: given ? "default" : "pointer",
                                fontSize: "0.75rem", padding: "0 0.15rem", lineHeight: 1,
                                opacity: isOther ? 0.25 : 1,
                                filter: isThis ? (dir === "up" ? "drop-shadow(0 0 4px #34d399)" : "drop-shadow(0 0 4px #f87171)") : "none",
                                transition: "all 0.2s",
                              }}>
                              {dir === "up" ? "👍" : "👎"}
                            </button>
                          );
                        })}
                        {feedbackGiven[i] && (
                          <span style={{ fontFamily: "monospace", fontSize: "0.55rem", color: feedbackGiven[i] === "up" ? GREEN : WARN, alignSelf: "center", marginLeft: "0.1rem" }}>
                            {feedbackGiven[i] === "up" ? "thanks" : "noted"}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ maxWidth: "80%", background: "#0a1e38", border: "1px solid #1a3a5c", borderRadius: "13px 3px 13px 13px", padding: "0.7rem 0.95rem", color: "#c8d8e8" }}>
                      <span style={{ lineHeight: 1.6, fontSize: "0.84rem" }}>{m.content}</span>
                    </div>
                  )}
                </div>
              ))}
              {(loading || stream) && (
                <div style={{ display: "flex", gap: "0.65rem", marginBottom: "1rem", animation: "fadeUp 0.3s ease" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: BG, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: "0.58rem", color: "#fbbf24" }}>AI</div>
                  <div style={{ maxWidth: "80%", background: BG, border: `1px solid ${BORDER}`, borderRadius: "3px 13px 13px 13px", padding: "0.7rem 0.95rem", color: TEXT }}>
                    {stream
                      ? <><MD text={stream} accent={ACCENT} /><span style={{ display: "inline-block", width: 6, height: 12, background: ACCENT, animation: "blink 1s step-end infinite", verticalAlign: "text-bottom", marginLeft: 2, borderRadius: 1 }} /></>
                      : <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "#2a4a6a", animation: "pulse 1.5s infinite" }}>Analyzing…</span>
                    }
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        <div style={{ padding: "0.9rem 1.3rem", borderTop: `1px solid ${BORDER}`, background: BG, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
            <textarea
              ref={taRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask about your category — performance, pricing, strategy, alerts…"
              rows={1}
              style={{ flex: 1, background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "0.65rem 0.9rem", color: BRIGHT, fontSize: "0.84rem", fontFamily: "'Georgia', serif", resize: "none", outline: "none", lineHeight: 1.55, minHeight: 40, maxHeight: 120, transition: "border-color 0.2s" }}
              onFocus={e => e.target.style.borderColor = ACCENT}
              onBlur={e => e.target.style.borderColor = BORDER}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{ background: loading || !input.trim() ? PANEL : ACCENT, border: `1px solid ${loading || !input.trim() ? BORDER : ACCENT}`, borderRadius: 10, padding: "0.65rem 1rem", color: loading || !input.trim() ? "#2a4a6a" : "#000", cursor: loading || !input.trim() ? "default" : "pointer", fontFamily: "monospace", fontSize: "0.75rem", fontWeight: 700, transition: "all 0.2s", whiteSpace: "nowrap" }}>
              {loading ? "…" : "Send →"}
            </button>
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "0.57rem", color: "#1a3a5a", marginTop: "0.45rem", textAlign: "center", letterSpacing: "0.07em" }}>
            ENTER TO SEND · SHIFT+ENTER NEW LINE · LEFT PANEL UPDATES WITH EACH QUESTION
          </div>
        </div>
      </div>
    </div>
  );
}
