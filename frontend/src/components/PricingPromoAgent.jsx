import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";

const IS_LOCAL = typeof window !== "undefined" && window.location.hostname === "localhost";
const API_BASE = IS_LOCAL
  ? "http://localhost:8003/api"
  : "https://87-99-154-201.nip.io/api";
const CHAT_URL = IS_LOCAL
  ? "http://localhost:8003/api/chat"
  : "https://87-99-154-201.nip.io/api/chat";
const BG = "#060d1a";
const PANEL = "#09131f";
const BORDER = "#0f2540";
const ACCENT = "#38bdf8";
const GOLD = "#fbbf24";
const GREEN = "#34d399";
const WARN = "#f87171";
const PURPLE = "#a78bfa";
const TEXT = "#6b8aaa";
const BRIGHT = "#e2e8f0";

const RETAILERS = [
  { id: 1, name: "Kroger", tenant: "kroger" },
  { id: 2, name: "Target", tenant: "target" },
  { id: 3, name: "Publix", tenant: "publix" },
  { id: 4, name: "Costco", tenant: "costco" },
  { id: 5, name: "Walmart", tenant: "walmart" },
];

const CATEGORIES = ["Dairy & Eggs", "Beverages", "Snacks", "Frozen Pizza", "Paper & Cleaning"];

const SUGGESTION_CHIPS = [
  "What's my highest priority action this week?",
  "How do I close the share gap by Q4?",
  "Which SKUs should I promote for Memorial Day?",
  "What's the risk if Walmart runs BOGO on paper?",
  "Optimize my $30K weekly promo budget",
  "Which price changes protect margin the most?",
  "Which segment should I target for PL trial?",
  "Why are Deal Stackers risky for BOGO promos?",
];

const s = (obj) => Object.entries(obj).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

function fmt(n, prefix = "$", decimals = 0) {
  if (n === undefined || n === null) return "—";
  if (Math.abs(n) >= 1000000) return prefix + (n / 1000000).toFixed(1) + "M";
  if (Math.abs(n) >= 1000) return prefix + (n / 1000).toFixed(1) + "K";
  return prefix + n.toFixed(decimals);
}

function pct(n, decimals = 1) {
  if (n === undefined || n === null) return "—";
  return (n >= 0 ? "+" : "") + n.toFixed(decimals) + "%";
}

function urgencyColor(urgency) {
  if (urgency === "high") return WARN;
  if (urgency === "medium") return GOLD;
  return GREEN;
}

function cardBorderColor(rec) {
  if (rec.recommendation_urgency === "high") return WARN;
  if (rec.recommendation_urgency === "medium") return GOLD;
  if (rec.chosen_option === "A") return GREEN;
  return TEXT;
}

// ─── Segment Bar ───────────────────────────────────────────────────────────
function SegmentBar({ segments, compact }) {
  if (!segments) return null;
  const sorted = [...segments].sort((a, b) => b.pct_of_buyers - a.pct_of_buyers);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {sorted.map((seg) => (
        <div key={seg.segment_id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: compact ? 70 : 100, fontSize: "0.65rem", color: TEXT, textAlign: "right", flexShrink: 0 }}>
            {compact ? seg.segment_name.split(" ")[0] : seg.segment_name}
          </div>
          <div style={{ flex: 1, height: 8, background: "#0f2540", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${seg.pct_of_buyers * 100}%`, height: "100%", background: seg.color, borderRadius: 4 }} />
          </div>
          <div style={{ width: 35, fontSize: "0.65rem", color: BRIGHT }}>{(seg.pct_of_buyers * 100).toFixed(0)}%</div>
          <div style={{ width: 42, fontSize: "0.65rem", color: seg.color, fontFamily: "monospace" }}>{seg.elasticity.toFixed(2)}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Objective Progress Bars ────────────────────────────────────────────────
function ObjectiveProgress({ objectives }) {
  if (!objectives) return null;
  const ach = objectives.current_achievement || {};
  const items = [
    { label: "Revenue", pct: ach.revenue_pct || 0, color: ACCENT },
    { label: "Margin", pct: ach.margin_pct || 0, color: GREEN },
    { label: "Share", pct: ach.share_pct || 0, color: PURPLE },
  ];
  return (
    <div style={{ display: "flex", gap: 12, padding: "8px 12px", background: PANEL, borderBottom: `1px solid ${BORDER}` }}>
      {items.map((item) => (
        <div key={item.label} style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: "0.62rem", color: TEXT }}>{item.label}</span>
            <span style={{ fontSize: "0.62rem", color: BRIGHT }}>{item.pct.toFixed(1)}%</span>
          </div>
          <div style={{ height: 5, background: BORDER, borderRadius: 3 }}>
            <div style={{ width: `${Math.min(100, item.pct)}%`, height: "100%", background: item.color, borderRadius: 3 }} />
          </div>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", paddingLeft: 8, borderLeft: `1px solid ${BORDER}` }}>
        <span style={{ fontSize: "0.7rem", color: GOLD, fontFamily: "monospace" }}>
          {(ach.overall_score || 0).toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// ─── Segment Filter Cards ───────────────────────────────────────────────────
function SegmentFilterCards({ segments, activeSegment, onSelect }) {
  if (!segments) return null;
  return (
    <div style={{ display: "flex", gap: 6, padding: "8px 12px", overflowX: "auto", borderBottom: `1px solid ${BORDER}` }}>
      {segments.map((seg) => (
        <div
          key={seg.segment_id}
          onClick={() => onSelect(activeSegment === seg.segment_name ? null : seg.segment_name)}
          style={{
            flexShrink: 0,
            cursor: "pointer",
            borderLeft: `3px solid ${seg.color}`,
            padding: "5px 8px",
            background: activeSegment === seg.segment_name ? "#0f2540" : PANEL,
            borderRadius: "0 4px 4px 0",
            minWidth: 90,
          }}
        >
          <div style={{ fontSize: "0.62rem", color: BRIGHT, fontWeight: 600 }}>{seg.segment_name}</div>
          <div style={{ fontSize: "0.58rem", color: TEXT }}>{(seg.pct_of_total_customers * 100).toFixed(0)}% of buyers</div>
          <div style={{ fontSize: "0.58rem", color: seg.color }}>
            ε {seg.elasticity_midpoint?.toFixed(2) || "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Simulation Chart ────────────────────────────────────────────────────────
function SimulationChart({ simData }) {
  if (!simData || !simData.weeks) return null;
  const colors = {
    "Value Hunters": "#f87171",
    "Brand Loyalists": "#34d399",
    "Deal Stackers": "#f97316",
    "Family Staple": "#38bdf8",
    "Health Premium": "#a78bfa",
    "Convenience Seeker": "#fbbf24",
    "Bulk Buyer": "#6b8aaa",
  };

  const chartData = simData.weeks.map((w) => {
    const row = { week: `W${w.week}` };
    w.by_segment.forEach((seg) => {
      row[seg.segment] = seg.units;
    });
    return row;
  });

  const segNames = simData.weeks[0]?.by_segment.map((s) => s.segment) || [];

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: "0.65rem", color: TEXT, marginBottom: 6 }}>8-WEEK UNIT SIMULATION BY SEGMENT</div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
          <XAxis dataKey="week" tick={{ fontSize: 9, fill: TEXT }} />
          <YAxis tick={{ fontSize: 9, fill: TEXT }} />
          <Tooltip
            contentStyle={{ background: PANEL, border: `1px solid ${BORDER}`, fontSize: 10 }}
            labelStyle={{ color: BRIGHT }}
          />
          {segNames.map((name) => (
            <Area
              key={name}
              type="monotone"
              dataKey={name}
              stackId="1"
              stroke={colors[name] || ACCENT}
              fill={colors[name] || ACCENT}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      {simData.summary && (
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          {[
            { label: "Incr. Units", val: simData.summary.total_incremental_units?.toLocaleString() },
            { label: "Incr. Rev", val: fmt(simData.summary.total_incremental_revenue) },
            { label: "Net Margin", val: fmt(simData.summary.net_margin_vs_hold) },
            { label: "New Cust", val: simData.summary.new_customers_acquired },
          ].map((m) => (
            <div key={m.label} style={{ flex: 1 }}>
              <div style={{ fontSize: "0.58rem", color: TEXT }}>{m.label}</div>
              <div style={{ fontSize: "0.72rem", color: BRIGHT, fontFamily: "monospace" }}>{m.val}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Option Comparison Table ─────────────────────────────────────────────────
function OptionTable({ options, chosen }) {
  const labels = ["Price", "Units/wk", "Revenue/wk", "Margin %", "Share Δ", "Obj Score"];
  const cols = options.map((o) => [
    o.price_display,
    o.weekly_units_change_pct === 0 ? o.weekly_units?.toLocaleString() : pct(o.weekly_units_change_pct),
    o.weekly_revenue_change_pct === 0 ? fmt(o.weekly_revenue) : pct(o.weekly_revenue_change_pct),
    o.margin_pct?.toFixed(1) + "%",
    o.share_change_pts === 0 ? "0.0 pts" : (o.share_change_pts >= 0 ? "+" : "") + o.share_change_pts?.toFixed(1) + " pts",
    o.objective_score?.toFixed(3),
  ]);

  return (
    <div style={{ overflowX: "auto", marginTop: 10 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.65rem" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", color: TEXT, padding: "4px 6px", borderBottom: `1px solid ${BORDER}` }}>Metric</th>
            {options.map((o, i) => (
              <th
                key={i}
                style={{
                  padding: "4px 8px",
                  borderBottom: `1px solid ${BORDER}`,
                  color: o.is_recommended ? GOLD : BRIGHT,
                  borderTop: o.is_recommended ? `2px solid ${GOLD}` : "2px solid transparent",
                }}
              >
                {o.label} {o.is_recommended ? "✓" : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((label, ri) => (
            <tr key={label}>
              <td style={{ color: TEXT, padding: "3px 6px" }}>{label}</td>
              {cols.map((col, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: "3px 8px",
                    color: options[ci].is_recommended ? BRIGHT : TEXT,
                    fontFamily: "monospace",
                    background: options[ci].is_recommended ? "rgba(251,191,36,0.05)" : "transparent",
                  }}
                >
                  {col[ri]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── SKU Card ────────────────────────────────────────────────────────────────
function SkuCard({ rec, isExpanded, onToggle, onSimulate }) {
  const [simData, setSimData] = useState(null);
  const [loadingSim, setLoadingSim] = useState(false);
  const [simPrice, setSimPrice] = useState("");
  const [simPromo, setSimPromo] = useState("standard");
  const [simWeeks, setSimWeeks] = useState(4);

  const profile = rec.segment_profile || {};
  const segments = profile.segment_composition || [];
  const chosen = rec.options?.find((o) => o.is_recommended) || rec.options?.[0];

  async function runSim() {
    setLoadingSim(true);
    try {
      const res = await fetch(`${API_BASE}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: rec.product_id,
          retailer_id: rec.retailer_id || 1,
          price: simPrice ? parseFloat(simPrice) : null,
          promo_type: simPromo,
          duration_weeks: simWeeks,
        }),
      });
      setSimData(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoadingSim(false);
  }

  const borderColor = cardBorderColor(rec);

  return (
    <div
      style={{
        background: PANEL,
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 6,
        marginBottom: 8,
        overflow: "hidden",
      }}
    >
      {/* Card Header */}
      <div
        onClick={onToggle}
        style={{ cursor: "pointer", padding: "10px 12px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.6rem", color: borderColor, fontWeight: 700, textTransform: "uppercase" }}>
                {rec.recommendation_urgency}
              </span>
              <span style={{ fontSize: "0.7rem", color: BRIGHT, fontWeight: 600 }}>{rec.name}</span>
              <span style={{
                fontSize: "0.55rem",
                padding: "1px 5px",
                borderRadius: 3,
                background: rec.brand_type === "PL" ? "#1a2f4a" : "#1a2a1a",
                color: rec.brand_type === "PL" ? ACCENT : GREEN,
              }}>
                {rec.brand_type}
              </span>
            </div>
            <div style={{ fontSize: "0.62rem", color: TEXT, marginTop: 2 }}>
              Current: <span style={{ color: BRIGHT }}>${rec.current_price?.toFixed(2)}</span>
              {"  "}·{"  "}
              {rec.subcategory}
              {"  "}·{"  "}
              Price Index: <span style={{ color: rec.price_index > 105 ? WARN : rec.price_index < 95 ? GREEN : TEXT }}>
                {rec.price_index}
              </span>
            </div>
          </div>
          <div style={{ fontSize: "0.6rem", color: TEXT }}>{isExpanded ? "▲" : "▼"}</div>
        </div>

        {/* Option Pills */}
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {rec.options?.map((opt, i) => (
            <div
              key={i}
              style={{
                padding: "3px 8px",
                borderRadius: 4,
                border: `1px solid ${opt.is_recommended ? GOLD : BORDER}`,
                fontSize: "0.6rem",
                color: opt.is_recommended ? GOLD : TEXT,
                background: opt.is_recommended ? "rgba(251,191,36,0.1)" : "transparent",
              }}
            >
              {opt.label} {opt.is_recommended ? "✓" : ""}
            </div>
          ))}
        </div>

        {/* Quick stats */}
        {chosen && (
          <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
            <span style={{ fontSize: "0.62rem", color: BRIGHT }}>
              Units: <span style={{ color: chosen.weekly_units_change_pct > 0 ? GREEN : WARN }}>
                {pct(chosen.weekly_units_change_pct)}
              </span>
            </span>
            <span style={{ fontSize: "0.62rem", color: BRIGHT }}>
              Rev: <span style={{ color: chosen.weekly_revenue_change_pct > 0 ? GREEN : WARN }}>
                {pct(chosen.weekly_revenue_change_pct)}
              </span>
            </span>
            <span style={{ fontSize: "0.62rem", color: BRIGHT }}>
              Margin: <span style={{ color: chosen.margin_change_pts >= 0 ? GREEN : WARN }}>
                {chosen.margin_change_pts >= 0 ? "+" : ""}{chosen.margin_change_pts?.toFixed(1)} pts
              </span>
            </span>
            <span style={{ fontSize: "0.62rem" }}>
              Score: <span style={{ color: GOLD, fontFamily: "monospace" }}>{chosen.objective_score?.toFixed(3)}</span>
            </span>
          </div>
        )}

        {/* Buyer DNA */}
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", height: 8, flex: 1, borderRadius: 4, overflow: "hidden" }}>
            {[...segments]
              .sort((a, b) => b.pct_of_buyers - a.pct_of_buyers)
              .map((seg) => (
                <div
                  key={seg.segment_id}
                  style={{ width: `${seg.pct_of_buyers * 100}%`, background: seg.color }}
                  title={`${seg.segment_name}: ${(seg.pct_of_buyers * 100).toFixed(0)}%`}
                />
              ))}
          </div>
          <span style={{ fontSize: "0.6rem", color: TEXT, whiteSpace: "nowrap" }}>
            {profile.dominant_segment} {(profile.dominant_segment_pct * 100)?.toFixed(0)}%
          </span>
        </div>
        <div style={{ fontSize: "0.6rem", color: TEXT, marginTop: 3 }}>
          Weighted ε: <span style={{ color: BRIGHT, fontFamily: "monospace" }}>{profile.weighted_avg_elasticity}</span>
          {"  "}vs avg <span style={{ fontFamily: "monospace" }}>{profile.category_avg_elasticity}</span>
          {"  "}
          {profile.elasticity_variance < 0
            ? <span style={{ color: WARN }}>⚠ +{Math.abs(Math.round((profile.elasticity_variance / profile.category_avg_elasticity) * 100))}% underestimate</span>
            : <span style={{ color: GREEN }}>↓ conservative</span>
          }
        </div>

        {/* External factors preview */}
        {rec.days_to_holiday <= 30 && (
          <div style={{ fontSize: "0.6rem", color: GOLD, marginTop: 4 }}>
            ⏰ {rec.next_holiday} in {rec.days_to_holiday} days
          </div>
        )}
      </div>

      {/* Expanded Section */}
      {isExpanded && (
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: 12 }}>
          {/* Option Table */}
          <div style={{ fontSize: "0.65rem", color: TEXT, marginBottom: 4, fontWeight: 600 }}>OPTION COMPARISON</div>
          {rec.options && <OptionTable options={rec.options} chosen={rec.chosen_option} />}

          {/* Segment Elasticity Panel */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: "0.65rem", color: TEXT, marginBottom: 8, fontWeight: 600 }}>ELASTICITY BY BUYER SEGMENT</div>
            <SegmentBar segments={segments} compact={false} />
            <div style={{ fontSize: "0.62rem", color: TEXT, marginTop: 6 }}>
              Weighted avg: <span style={{ color: BRIGHT, fontFamily: "monospace" }}>{profile.weighted_avg_elasticity}</span>
              {"  "}vs category: <span style={{ fontFamily: "monospace" }}>{profile.category_avg_elasticity}</span>
            </div>
            {rec.pantry_load_warning && (
              <div style={{ fontSize: "0.62rem", color: WARN, marginTop: 4 }}>
                ⚠ Deal Stackers: pantry load risk if BOGO — expect -30% dip weeks 3-4
              </div>
            )}
            <div style={{ fontSize: "0.62rem", color: TEXT, marginTop: 4, fontStyle: "italic" }}>
              {profile.key_insight}
            </div>
          </div>

          {/* Simulation panel */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: "0.65rem", color: TEXT, marginBottom: 8, fontWeight: 600 }}>SIMULATE CUSTOM SCENARIO</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                type="number"
                placeholder={`Price (base $${rec.current_price?.toFixed(2)})`}
                value={simPrice}
                onChange={(e) => setSimPrice(e.target.value)}
                style={{
                  flex: 1, padding: "4px 8px", background: BG, border: `1px solid ${BORDER}`,
                  color: BRIGHT, borderRadius: 4, fontSize: "0.65rem",
                }}
              />
              <select
                value={simPromo}
                onChange={(e) => setSimPromo(e.target.value)}
                style={{
                  flex: 1, padding: "4px 8px", background: BG, border: `1px solid ${BORDER}`,
                  color: BRIGHT, borderRadius: 4, fontSize: "0.65rem",
                }}
              >
                <option value="standard">Standard</option>
                <option value="BOGO">BOGO</option>
                <option value="bundle">Bundle</option>
                <option value="loyalty">Loyalty</option>
              </select>
              <select
                value={simWeeks}
                onChange={(e) => setSimWeeks(parseInt(e.target.value))}
                style={{
                  width: 80, padding: "4px 8px", background: BG, border: `1px solid ${BORDER}`,
                  color: BRIGHT, borderRadius: 4, fontSize: "0.65rem",
                }}
              >
                {[1, 2, 3, 4, 6, 8].map((w) => <option key={w} value={w}>{w}wk</option>)}
              </select>
              <button
                onClick={runSim}
                disabled={loadingSim}
                style={{
                  padding: "4px 12px", background: ACCENT, color: BG, border: "none",
                  borderRadius: 4, fontSize: "0.65rem", cursor: "pointer", fontWeight: 600,
                }}
              >
                {loadingSim ? "…" : "Run ↗"}
              </button>
            </div>
            {simData && <SimulationChart simData={simData} />}
          </div>

          {/* External factors */}
          {rec.external_factors?.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              {rec.external_factors.map((f, i) => (
                <div key={i} style={{ fontSize: "0.62rem", color: GOLD }}>{f}</div>
              ))}
            </div>
          )}

          {/* Rationale */}
          <div style={{
            marginTop: 12, padding: 10, background: BG,
            border: `1px solid ${BORDER}`, borderRadius: 4,
          }}>
            <div style={{ fontSize: "0.58rem", color: TEXT, marginBottom: 4 }}>AI RATIONALE</div>
            <div style={{ fontSize: "0.65rem", color: BRIGHT, lineHeight: 1.5, fontStyle: "italic" }}>
              "{rec.rationale}"
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI Chat ─────────────────────────────────────────────────────────────────
function buildSystemPrompt(context) {
  const { category, retailer, objectives, segments, topRecs } = context;
  const ach = objectives?.current_achievement || {};
  const obj = objectives?.objectives || {};

  // All 7 segments with full elasticity + mechanic + pantry risk
  const segText = (segments || []).map((s) =>
    `  • ${s.segment_name}: ${(s.pct_of_total_customers * 100).toFixed(0)}% of shoppers | ε=${s.elasticity_midpoint?.toFixed(2)} | best mechanic: ${s.best_mechanic}`
  ).join("\n");

  // Top 5 recs with FULL per-SKU segment breakdown so AI can cite exact numbers
  const topRecsText = (topRecs || []).slice(0, 5).map((r, i) => {
    const p = r.segment_profile || {};
    const comp = [...(p.segment_composition || [])]
      .sort((a, b) => b.pct_of_buyers - a.pct_of_buyers)
      .map((s) =>
        `      - ${s.segment_name}: ${(s.pct_of_buyers * 100).toFixed(0)}% of buyers | ε=${s.elasticity?.toFixed(2)} | ${s.best_mechanic} | pantry risk: ${s.pantry_load_risk} | retention post-promo: ${(s.retention_after_promo * 100).toFixed(0)}%`
      ).join("\n");
    const ds = (p.segment_composition || []).find((s) => s.segment_name === "Deal Stackers");
    const pantryWarn = ds && ds.pct_of_buyers > 0.20
      ? `\n      ⚠ PANTRY LOAD WARNING: Deal Stackers = ${(ds.pct_of_buyers * 100).toFixed(0)}% of buyers — only ${(ds.retention_after_promo * 100).toFixed(0)}% re-purchase at full price post-promo`
      : "";
    return `${i + 1}. ${r.name}
    Action: ${r.chosen_option_label} | Urgency: ${r.recommendation_urgency} | Weighted ε: ${p.weighted_avg_elasticity} vs category avg ${p.category_avg_elasticity}
    Dominant segment: ${p.dominant_segment} (${((p.dominant_segment_pct || 0) * 100).toFixed(0)}%)
    Full buyer segment breakdown:
${comp}${pantryWarn}`;
  }).join("\n\n");

  return `You are the Pricing & Promo AI for ${retailer || "Kroger"} Category Management.
Category: ${category || "Snacks"} | Retailer: ${retailer || "Kroger"}
Objectives: Revenue ${ach.revenue_pct || 73}% achieved | Margin ${ach.margin_pct || 88}% achieved | Share ${ach.share_pct || 61}% achieved | Score: ${ach.overall_score || 0.73}
Weights: Revenue ${((obj.revenue_weight || 0.25) * 100).toFixed(0)}% / Margin ${((obj.margin_weight || 0.35) * 100).toFixed(0)}% / Share ${((obj.share_weight || 0.40) * 100).toFixed(0)}%

═══ ALL 7 CUSTOMER SEGMENTS ═══
${segText}

═══ TOP 5 PRIORITY SKUs THIS WEEK (with full segment data) ═══
${topRecsText}

CRITICAL INSTRUCTIONS:
1. You already have complete customer segmentation data for this retailer. ALWAYS use it. Never say you need loyalty card data or conjoint studies — that data is already provided above as the 7 behavioral segments.

2. When asked about any SKU, immediately identify:
   - Which segment dominates that SKU's buyers (use the exact % from the data above)
   - What that segment's elasticity is (cite the exact ε number)
   - What mechanic works best for that segment
   - Whether pantry load risk exists (Deal Stackers > 20%)

3. Always anchor your answer to specific numbers:
   BAD: "Value Hunters tend to be price sensitive"
   GOOD: "Value Hunters are 41% of Planters buyers with elasticity -2.65 — a 10% price cut predicts +26% units for this segment alone"

4. Structure every pricing answer as:
   SEGMENT BREAKDOWN → RECOMMENDATION → PREDICTED OUTCOME
   Never end with "you would need more data" if you already have segment composition data.

5. For promotion mechanics always specify:
   - Exact mechanic (BOGO / 10% off / bundle 2-for-$X)
   - Which segment it targets and why (cite their ε and % of buyers)
   - Expected lift calculation: units = base × (1 + |ε| × price_change_pct)
   - Pantry load warning if Deal Stackers > 20% with their post-promo retention rate

6. End every answer with a concrete → Next: action, not a question asking if you should flag something.`;
}

async function askClaude(messages, onChunk, context) {
  const system = buildSystemPrompt(context);

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`API error ${resp.status}: ${err}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const ev = JSON.parse(data);
        if (ev.type === "content_block_delta" && ev.delta?.text) {
          onChunk(ev.delta.text);
        }
      } catch (_) {}
    }
  }
}

function ChatMessage({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", flexDirection: isUser ? "row-reverse" : "row" }}>
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: isUser ? ACCENT : PURPLE,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.55rem", color: BG, fontWeight: 700, flexShrink: 0,
        }}>
          {isUser ? "FM" : "AI"}
        </div>
        <div style={{
          maxWidth: "80%",
          padding: "8px 10px",
          background: isUser ? "#0f2540" : PANEL,
          border: `1px solid ${isUser ? ACCENT + "44" : BORDER}`,
          borderRadius: 8,
          fontSize: "0.68rem",
          color: BRIGHT,
          lineHeight: 1.55,
          whiteSpace: "pre-wrap",
        }}>
          {msg.content}
          {msg.streaming && <span style={{ color: ACCENT }}>▋</span>}
        </div>
      </div>
      {!isUser && msg.content?.includes("→ Next:") && (
        <div style={{
          marginTop: 4, marginLeft: 28,
          borderLeft: `2px solid ${ACCENT}`,
          paddingLeft: 8,
          fontSize: "0.62rem",
          color: ACCENT,
        }}>
          {msg.content.split("→ Next:").pop()?.trim()}
        </div>
      )}
    </div>
  );
}

function ChatPanel({ context }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text) {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const aiIdx = newMessages.length;
    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);

    try {
      let accumulated = "";
      await askClaude(
        newMessages.map((m) => ({ role: m.role, content: m.content })),
        (chunk) => {
          accumulated += chunk;
          setMessages((prev) => {
            const updated = [...prev];
            updated[aiIdx] = { role: "assistant", content: accumulated, streaming: true };
            return updated;
          });
        },
        context
      );
      setMessages((prev) => {
        const updated = [...prev];
        updated[aiIdx] = { role: "assistant", content: accumulated, streaming: false };
        return updated;
      });
    } catch (e) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[aiIdx] = {
          role: "assistant",
          content: `Error: ${e.message}\n\nPlease try again. If the issue persists, check your network connection.`,
          streaming: false,
        };
        return updated;
      });
    }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, background: PANEL }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.72rem", color: BRIGHT, fontFamily: "Georgia, serif" }}>AI Strategy Chat</div>
            <div style={{ fontSize: "0.58rem", color: TEXT }}>Pricing & Promo Agent</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {messages.length > 0 && (
              <span style={{ fontSize: "0.58rem", padding: "1px 6px", background: ACCENT + "22", color: ACCENT, borderRadius: 10 }}>
                {messages.length}
              </span>
            )}
            <button
              onClick={() => setMessages([])}
              style={{ background: "none", border: `1px solid ${BORDER}`, color: TEXT, padding: "2px 8px", borderRadius: 4, fontSize: "0.6rem", cursor: "pointer" }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {messages.length === 0 && (
          <div>
            <div style={{ fontSize: "0.65rem", color: TEXT, marginBottom: 10, textAlign: "center" }}>
              Ask anything about {context.category} strategy at {context.retailer}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => send(chip)}
                  style={{
                    padding: "5px 10px",
                    background: PANEL,
                    border: `1px solid ${BORDER}`,
                    color: TEXT,
                    borderRadius: 12,
                    fontSize: "0.6rem",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: 10, borderTop: `1px solid ${BORDER}`, display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
          placeholder="Ask about pricing strategy…"
          style={{
            flex: 1, padding: "6px 10px", background: BG,
            border: `1px solid ${BORDER}`, color: BRIGHT,
            borderRadius: 4, fontSize: "0.68rem",
          }}
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          style={{
            padding: "6px 14px", background: loading ? BORDER : ACCENT,
            color: BG, border: "none", borderRadius: 4,
            fontSize: "0.68rem", cursor: "pointer", fontWeight: 700,
          }}
        >
          {loading ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}

// ─── Objective Modal ──────────────────────────────────────────────────────────
function ObjectiveModal({ objectives, onSave, onClose }) {
  const [form, setForm] = useState({
    revenue_target: objectives?.objectives?.revenue_target || 45000000,
    revenue_weight: (objectives?.objectives?.revenue_weight || 0.25) * 100,
    margin_target_pct: objectives?.objectives?.margin_target_pct || 36.5,
    margin_weight: (objectives?.objectives?.margin_weight || 0.35) * 100,
    share_target_pct: objectives?.objectives?.share_target_pct || 28.5,
    share_weight: (objectives?.objectives?.share_weight || 0.40) * 100,
    max_promo_budget_weekly: objectives?.constraints?.max_promo_budget_weekly || 50000,
    min_margin_floor_pct: objectives?.constraints?.min_margin_floor_pct || 28.0,
    max_promos_per_sku_per_quarter: objectives?.constraints?.max_promos_per_sku_per_quarter || 4,
  });

  function handleSave() {
    onSave({
      ...objectives,
      objectives: {
        ...objectives?.objectives,
        revenue_target: parseFloat(form.revenue_target),
        revenue_weight: parseFloat(form.revenue_weight) / 100,
        margin_target_pct: parseFloat(form.margin_target_pct),
        margin_weight: parseFloat(form.margin_weight) / 100,
        share_target_pct: parseFloat(form.share_target_pct),
        share_weight: parseFloat(form.share_weight) / 100,
      },
      constraints: {
        ...objectives?.constraints,
        max_promo_budget_weekly: parseFloat(form.max_promo_budget_weekly),
        min_margin_floor_pct: parseFloat(form.min_margin_floor_pct),
        max_promos_per_sku_per_quarter: parseInt(form.max_promos_per_sku_per_quarter),
      },
    });
    onClose();
  }

  const fieldStyle = {
    width: "100%", padding: "5px 8px", background: BG,
    border: `1px solid ${BORDER}`, color: BRIGHT, borderRadius: 4, fontSize: "0.68rem",
  };
  const labelStyle = { fontSize: "0.6rem", color: TEXT, marginBottom: 3, display: "block" };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,13,26,0.8)",
      display: "flex", justifyContent: "flex-end", zIndex: 1000,
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 360, background: PANEL, borderLeft: `1px solid ${BORDER}`,
          padding: 20, overflowY: "auto",
        }}
      >
        <div style={{ fontSize: "0.85rem", color: BRIGHT, fontFamily: "Georgia, serif", marginBottom: 16 }}>
          Annual Objectives
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Revenue Target ($)", key: "revenue_target" },
            { label: "Revenue Weight (%)", key: "revenue_weight" },
            { label: "Margin Target (%)", key: "margin_target_pct" },
            { label: "Margin Weight (%)", key: "margin_weight" },
            { label: "Share Target (%)", key: "share_target_pct" },
            { label: "Share Weight (%)", key: "share_weight" },
          ].map(({ label, key }) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <input
                type="number"
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                style={fieldStyle}
              />
            </div>
          ))}
        </div>

        <div style={{ fontSize: "0.72rem", color: TEXT, marginBottom: 10 }}>Constraints</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Weekly Promo Budget ($)", key: "max_promo_budget_weekly" },
            { label: "Margin Floor (%)", key: "min_margin_floor_pct" },
            { label: "Max Promos/SKU/Quarter", key: "max_promos_per_sku_per_quarter" },
          ].map(({ label, key }) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <input
                type="number"
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                style={fieldStyle}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          style={{
            width: "100%", padding: "8px", background: ACCENT, color: BG,
            border: "none", borderRadius: 4, fontSize: "0.72rem",
            cursor: "pointer", fontWeight: 700,
          }}
        >
          Save & Recalculate
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PricingPromoAgent({ retailer: retailerProp, category: categoryProp, onBackHome }) {
  const [retailer, setRetailer] = useState(
    retailerProp ? (RETAILERS.find(r => r.tenant === retailerProp) || RETAILERS[0]) : RETAILERS[0]
  );
  const [category, setCategory] = useState(categoryProp || CATEGORIES[2]);
  const [objectives, setObjectives] = useState(null);
  const [segments, setSegments] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("urgency");
  const [search, setSearch] = useState("");
  const [activeSegment, setActiveSegment] = useState(null);
  const [showObjectiveModal, setShowObjectiveModal] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [objRes, segRes, recRes, sumRes] = await Promise.all([
        fetch(`${API_BASE}/objectives/${retailer.tenant}`).then((r) => r.json()),
        fetch(`${API_BASE}/segments/${retailer.id}`).then((r) => r.json()),
        fetch(`${API_BASE}/recommendations/${encodeURIComponent(category)}?retailer_id=${retailer.id}`).then((r) => r.json()),
        fetch(`${API_BASE}/category-summary/${encodeURIComponent(category)}?retailer_id=${retailer.id}`).then((r) => r.json()),
      ]);
      setObjectives(objRes);
      setSegments(segRes.segments);
      setRecommendations(recRes.recommendations || []);
      setSummary(sumRes);
    } catch (e) {
      console.error("Load error:", e);
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [retailer, category]);

  const filteredRecs = recommendations
    .filter((r) => {
      if (filter !== "All" && r.recommendation_type !== filter.toLowerCase()) return false;
      if (activeSegment && r.segment_profile?.dominant_segment !== activeSegment) return false;
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "urgency") {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.recommendation_urgency] - order[b.recommendation_urgency] || b.weekly_revenue - a.weekly_revenue;
      }
      if (sortBy === "revenue") return b.weekly_revenue - a.weekly_revenue;
      if (sortBy === "confidence") return b.segment_profile?.weighted_avg_elasticity - a.segment_profile?.weighted_avg_elasticity;
      return 0;
    });

  const chatContext = {
    category,
    retailer: retailer.name,
    objectives,
    segments,
    topRecs: recommendations.slice(0, 5),
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: BG, color: BRIGHT, fontFamily: "Georgia, serif", overflow: "hidden" }}>
      {/* ─── LEFT PANEL ─── */}
      <div style={{ flex: "0 0 60%", display: "flex", flexDirection: "column", borderRight: `1px solid ${BORDER}`, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "10px 14px", background: PANEL, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {onBackHome && (
                <button
                  onClick={onBackHome}
                  style={{ background: "none", border: "none", color: TEXT, cursor: "pointer", fontSize: "0.65rem", padding: 0, letterSpacing: "0.02em" }}
                >
                  ← Home
                </button>
              )}
              <div>
                <div style={{ fontSize: "1.05rem", color: BRIGHT, fontFamily: "Georgia, serif", letterSpacing: "0.02em" }}>
                  Pricing & Promo Intelligence
                </div>
                <div style={{ fontSize: "0.6rem", color: TEXT, marginTop: 2 }}>
                  {category} · {retailer.name} · W52 2025
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: GREEN, boxShadow: `0 0 6px ${GREEN}` }} />
                <span style={{ fontSize: "0.58rem", color: GREEN }}>LIVE</span>
              </div>
              {retailerProp ? (
                <span style={{ fontSize: "0.65rem", color: ACCENT, fontFamily: "monospace", padding: "3px 8px", border: `1px solid ${BORDER}`, borderRadius: 4 }}>
                  {retailer.name}
                </span>
              ) : (
                <select
                  value={retailer.id}
                  onChange={(e) => setRetailer(RETAILERS.find((r) => r.id === parseInt(e.target.value)))}
                  style={{ padding: "3px 6px", background: BG, border: `1px solid ${BORDER}`, color: BRIGHT, borderRadius: 4, fontSize: "0.65rem" }}
                >
                  {RETAILERS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              )}
              {categoryProp ? (
                <span style={{ fontSize: "0.65rem", color: ACCENT, fontFamily: "monospace", padding: "3px 8px", border: `1px solid ${BORDER}`, borderRadius: 4 }}>
                  {category}
                </span>
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ padding: "3px 6px", background: BG, border: `1px solid ${BORDER}`, color: BRIGHT, borderRadius: 4, fontSize: "0.65rem" }}
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <button
                onClick={() => setShowObjectiveModal(true)}
                style={{ background: "none", border: `1px solid ${BORDER}`, color: TEXT, padding: "3px 8px", borderRadius: 4, fontSize: "0.65rem", cursor: "pointer" }}
              >
                ⚙
              </button>
            </div>
          </div>

          {/* Summary stats */}
          {summary && (
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              {[
                { label: "4wk Revenue", val: fmt(summary.revenue_4wk), sub: pct(summary.revenue_vs_prior_4wk_pct) + " vs prior" },
                { label: "Margin", val: summary.margin_pct + "%", sub: "" },
                { label: "Need Action", val: summary.skus_needing_action, sub: `${summary.urgent} urgent` },
                { label: "Next Holiday", val: summary.next_holiday, sub: `in ${summary.days_to_holiday}d` },
              ].map((m) => (
                <div key={m.label}>
                  <div style={{ fontSize: "0.58rem", color: TEXT }}>{m.label}</div>
                  <div style={{ fontSize: "0.72rem", color: BRIGHT, fontFamily: "monospace" }}>{m.val}</div>
                  {m.sub && <div style={{ fontSize: "0.55rem", color: TEXT }}>{m.sub}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Objective Progress */}
        <ObjectiveProgress objectives={objectives} />

        {/* Segment Filter Cards */}
        {segments && (
          <SegmentFilterCards
            segments={segments}
            activeSegment={activeSegment}
            onSelect={setActiveSegment}
          />
        )}

        {/* Filter Bar */}
        <div style={{ display: "flex", gap: 8, padding: "8px 12px", borderBottom: `1px solid ${BORDER}`, alignItems: "center" }}>
          {["All", "Reduce", "Increase", "Promote", "Hold"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "3px 10px", borderRadius: 12,
                border: `1px solid ${filter === f ? ACCENT : BORDER}`,
                background: filter === f ? ACCENT + "22" : "transparent",
                color: filter === f ? ACCENT : TEXT,
                fontSize: "0.62rem", cursor: "pointer",
              }}
            >
              {f}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: "3px 6px", background: BG, border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 4, fontSize: "0.62rem" }}
          >
            <option value="urgency">Urgency ↓</option>
            <option value="revenue">Revenue ↓</option>
            <option value="confidence">Elasticity ↓</option>
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU…"
            style={{
              padding: "3px 8px", background: BG, border: `1px solid ${BORDER}`,
              color: BRIGHT, borderRadius: 4, fontSize: "0.62rem", width: 120,
            }}
          />
          <span style={{ fontSize: "0.6rem", color: TEXT }}>{filteredRecs.length} SKUs</span>
        </div>

        {/* SKU List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: 40, color: TEXT, fontSize: "0.75rem" }}>
              Loading recommendations…
            </div>
          )}
          {!loading && filteredRecs.map((rec) => (
            <SkuCard
              key={rec.product_id}
              rec={rec}
              isExpanded={expandedId === rec.product_id}
              onToggle={() => setExpandedId(expandedId === rec.product_id ? null : rec.product_id)}
              onSimulate={() => {}}
            />
          ))}
        </div>
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div style={{ flex: "0 0 40%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <ChatPanel context={chatContext} />
      </div>

      {/* Objective Modal */}
      {showObjectiveModal && objectives && (
        <ObjectiveModal
          objectives={objectives}
          onSave={(updated) => {
            setObjectives(updated);
            fetch(`${API_BASE}/objectives/${retailer.tenant}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updated),
            });
          }}
          onClose={() => setShowObjectiveModal(false)}
        />
      )}
    </div>
  );
}
