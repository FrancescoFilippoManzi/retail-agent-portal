import React, { useState, useEffect } from "react";
import { getGuardrails, saveGuardrails as saveGuardrailsAPI } from "../api.js";

const STORAGE_KEY = "circe_category_brief";

const DEFAULT_BRIEF = {
  categoryRole: "Destination",
  annualRevenueTarget: 450000,
  marginTarget: 38,
  marketShareTarget: 32,
  priceIndexCeiling: 1.06,
  maxPromoPct: 20,
  plPenetrationTarget: 15,
  keyInitiatives: "1. Defend Charmin premium share against Aldi/Lidl EDLP pressure.\n2. Grow Angel Soft mid-tier as volume driver.\n3. Close Kleenex price gap vs Walmart.",
  constraints: "No BOGO on Bounty SAS — margin floor $3.50/unit.\nMinimum 3 facings on Charmin Ultra at all times.\nDo not price below Walmart on premium SKUs.",
  notes: "",
  hist2024: { revenue: 412000, marginPct: 36.2, marketShare: 29.8, units: 18400, plPen: 19.2 },
  hist2025: { revenue: 431000, marginPct: 37.1, marketShare: 30.5, units: 19100, plPen: 18.4 },
  histNotes: "FY2025 growth driven by Charmin Ultra promo cadence in Q3. Aldi expansion in Uptown (2 new stores) pressured value TP share in H2. Kleenex underperformed vs target — price gap vs Walmart widened to 32%.",
  compNotes: {
    walmart:       "Accelerated EDLP rollbacks on Bounty and Charmin in Q4 2025. Growing online+pickup share in DFW. Price index ~0.93 vs market. Key threat: basket-building trips migrating to Walmart.",
    tomThumb:      "Albertsons-owned, loyalty-focused. Runs deep TPR events on Charmin (up to 25% off) to drive card swipes. Price index ~1.04. Strength: strong Uptown penetration among 35-55 demographic.",
    centralMarket: "Ultra-premium positioning, no value play. Carries Charmin Ultra and Puffs Plus only. Price index ~1.12. Not a volume threat — margin benchmark. Shopper overlap minimal.",
    aldi:          "Opened 2 new DFW stores in 2025. EDLP private label (Floralys TP, Softis tissues). Price index ~0.88. Primary driver of PL penetration growth. No name-brand paper towels. Growing 18–34 shopper base.",
    lidl:          "Slower DFW expansion than Aldi. Similar PL-first model. Price index ~0.86. Carries Scott 1000 and Angel Soft as name-brand anchors. Threat: eroding value-tier TP share in south Dallas zip codes."
  }
};

const ROLES = ["Destination", "Routine", "Convenience", "Seasonal", "Impulse"];

const s = {
  wrap: { padding: "24px 28px", maxWidth: 900 },
  header: { marginBottom: 24 },
  title: { fontSize: 20, fontWeight: 800, color: "#e6edf3", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#8b949e" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 },
  section: { background: "#161b22", border: "1px solid #21262d", borderRadius: 10, padding: 18 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: "#58a6ff", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 },
  field: { marginBottom: 14 },
  label: { fontSize: 11, color: "#8b949e", marginBottom: 5, display: "block" },
  input: {
    width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6,
    color: "#e6edf3", padding: "7px 10px", fontSize: 13, outline: "none",
    transition: "border-color 0.2s"
  },
  select: {
    width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6,
    color: "#e6edf3", padding: "7px 10px", fontSize: 13, outline: "none"
  },
  textarea: {
    width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6,
    color: "#e6edf3", padding: "7px 10px", fontSize: 12, outline: "none",
    resize: "vertical", lineHeight: 1.6, fontFamily: "inherit"
  },
  row: { display: "flex", gap: 12 },
  rowField: { flex: 1 },
  targetRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  targetLabel: { fontSize: 12, color: "#c9d1d9", width: 180 },
  targetInput: {
    background: "#0d1117", border: "1px solid #30363d", borderRadius: 6,
    color: "#e6edf3", padding: "5px 10px", fontSize: 13, outline: "none", width: 100, textAlign: "right"
  },
  targetUnit: { fontSize: 12, color: "#8b949e", width: 30 },
  saveBtn: {
    padding: "9px 24px", background: "#238636", border: "none", borderRadius: 6,
    color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", marginRight: 10
  },
  savedBadge: { fontSize: 12, color: "#3fb950" },
  roleCard: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 },
  roleBtn: {
    padding: "5px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
    border: "1px solid #30363d", background: "transparent", color: "#8b949e"
  },
  roleBtnActive: { background: "#1f6feb22", border: "1px solid #1f6feb", color: "#58a6ff", fontWeight: 600 },
  fullSection: { background: "#161b22", border: "1px solid #21262d", borderRadius: 10, padding: 18, marginBottom: 20 },
  divider: { borderColor: "#21262d", margin: "16px 0" },
  histGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 },
  histCard: { background: "#0d1117", border: "1px solid #21262d", borderRadius: 8, padding: "12px 16px" },
  histYear: { fontSize: 11, fontWeight: 700, color: "#58a6ff", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 },
  histRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  histLabel: { fontSize: 11, color: "#8b949e" },
  histVal: { fontSize: 13, fontWeight: 600, color: "#e6edf3" },
  yoyBadge: { fontSize: 10, padding: "1px 6px", borderRadius: 10, fontWeight: 700 },
  compGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 },
  compCard: { background: "#0d1117", border: "1px solid #21262d", borderRadius: 8, padding: "12px 14px" },
  compName: { fontSize: 12, fontWeight: 700, marginBottom: 6 },
  compTag: { fontSize: 10, padding: "2px 7px", borderRadius: 10, fontWeight: 600, marginRight: 5, marginBottom: 6, display: "inline-block" }
};

const DEFAULT_GUARDRAILS = {
  marginFloorPct: 32,
  minMarginDollarPerUnit: 2.50,
  maxPromoPct: 18,
  maxConcurrentPromos: 2,
  priceIndexCeiling: 1.07,
  priceIndexFloor: 0.93,
  minKrogerPriceVsCost: 1.35,
  bannedPromoSKUs: []
};

export default function CategoryBrief({ onBriefChange, retailer, category }) {
  const [brief, setBrief] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_BRIEF, ...JSON.parse(saved) } : DEFAULT_BRIEF;
    } catch { return DEFAULT_BRIEF; }
  });
  const [guardrails, setGuardrails] = useState(DEFAULT_GUARDRAILS);
  const [saved, setSaved] = useState(false);
  const [guardrailsSaved, setGuardrailsSaved] = useState(false);

  // Notify parent on mount + load guardrails from backend
  useEffect(() => {
    onBriefChange?.(brief);
    getGuardrails().then(g => setGuardrails({ ...DEFAULT_GUARDRAILS, ...g })).catch(() => {});
  }, []);

  function setG(key, value) {
    setGuardrails(prev => ({ ...prev, [key]: value }));
    setGuardrailsSaved(false);
  }

  async function handleSaveGuardrails() {
    await saveGuardrailsAPI(guardrails);
    setGuardrailsSaved(true);
    setTimeout(() => setGuardrailsSaved(false), 2500);
  }

  function set(key, value) {
    setBrief(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(brief));
    onBriefChange?.(brief);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const weeklyRevTarget = Math.round(brief.annualRevenueTarget / 52);

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={s.title}>FY 2026 Category Strategy Brief</div>
        <div style={s.subtitle}>{category || "Paper Goods"} · Dallas/Uptown · {retailer ? retailer.charAt(0).toUpperCase() + retailer.slice(1) : "Kroger"} · Jan – Dec 2026</div>
      </div>

      {/* Category Role */}
      <div style={s.fullSection}>
        <div style={s.sectionTitle}>Category Role</div>
        <div style={s.roleCard}>
          {ROLES.map(r => (
            <button
              key={r}
              style={{ ...s.roleBtn, ...(brief.categoryRole === r ? s.roleBtnActive : {}) }}
              onClick={() => set("categoryRole", r)}
            >
              {r}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "#8b949e" }}>
          {brief.categoryRole === "Destination" && "Core traffic driver — shoppers make special trips. Prioritize availability, price competitiveness, and broad assortment."}
          {brief.categoryRole === "Routine" && "Regular household staple. Maintain competitive pricing and reliable in-stocks. Loyalty card focus."}
          {brief.categoryRole === "Convenience" && "Impulse/fill-in purchase. Higher margin tolerance. Focus on placement and impulse triggers."}
          {brief.categoryRole === "Seasonal" && "Demand spikes at key seasons. Plan promotions and inventory around seasonal windows."}
          {brief.categoryRole === "Impulse" && "Low planned purchase rate. Maximize checkout/display placement and visual merchandising."}
        </div>
      </div>

      {/* ── 2024–2025 Financial Recap ─────────────────────────────────────── */}
      <div style={s.fullSection}>
        <div style={s.sectionTitle}>2024–2025 Historical Performance</div>
        <div style={s.histGrid}>
          {[["2024", "hist2024"], ["2025", "hist2025"]].map(([yr, key]) => {
            const h = brief[key] ?? {};
            const prev = yr === "2025" ? brief.hist2024 : null;
            const yoy = (metric) => {
              if (!prev) return null;
              const delta = ((h[metric] ?? 0) - (prev[metric] ?? 0)) / (prev[metric] ?? 1) * 100;
              return delta;
            };
            const Badge = ({ metric, unit = "%" }) => {
              const d = yoy(metric);
              if (d == null) return null;
              const up = d >= 0;
              return (
                <span style={{ ...s.yoyBadge, background: up ? "#0d2a18" : "#2a0d0d", color: up ? "#3fb950" : "#f85149" }}>
                  {up ? "▲" : "▼"} {Math.abs(d).toFixed(1)}{unit}
                </span>
              );
            };
            return (
              <div key={yr} style={s.histCard}>
                <div style={s.histYear}>FY {yr}</div>
                {[
                  ["Revenue", "revenue", "$", v => `$${(v/1000).toFixed(0)}k`],
                  ["Gross Margin", "marginPct", "%", v => `${v}%`],
                  ["Market Share", "marketShare", "%", v => `${v}%`],
                  ["Units Sold", "units", "", v => v?.toLocaleString()],
                  ["PL Penetration", "plPen", "%", v => `${v}%`],
                ].map(([label, field, unit, fmt]) => (
                  <div key={field} style={s.histRow}>
                    <span style={s.histLabel}>{label}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        style={{ ...s.targetInput, width: 80, fontSize: 12 }}
                        type="number" step={field === "revenue" || field === "units" ? "1000" : "0.1"}
                        value={h[field] ?? ""}
                        onChange={e => set(key, { ...h, [field]: Number(e.target.value) })}
                      />
                      <Badge metric={field} unit={unit} />
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <div style={s.field}>
          <label style={s.label}>Context & Key Learnings</label>
          <textarea style={{ ...s.textarea, minHeight: 70 }}
            value={brief.histNotes ?? ""}
            onChange={e => set("histNotes", e.target.value)}
            placeholder="What drove performance in 2024–2025? Key wins, losses, market shifts…"
          />
        </div>
      </div>

      {/* ── Competitor Positioning ─────────────────────────────────────────── */}
      <div style={s.fullSection}>
        <div style={s.sectionTitle}>Competitor Positioning — Paper Goods · Dallas/Uptown · 2025 Baseline</div>
        <div style={s.compGrid}>
          {[
            { id: "walmart",       label: "Walmart",        strategy: "EDLP",    priceIdx: "~0.93", color: "#0071ce" },
            { id: "tomThumb",      label: "Tom Thumb",      strategy: "HiLo",    priceIdx: "~1.04", color: "#005a9e" },
            { id: "centralMarket", label: "Central Market", strategy: "Premium", priceIdx: "~1.12", color: "#6b3fa0" },
            { id: "aldi",          label: "Aldi",           strategy: "EDLP",    priceIdx: "~0.88", color: "#00539f" },
            { id: "lidl",          label: "Lidl",           strategy: "EDLP",    priceIdx: "~0.86", color: "#0050aa" },
          ].map(({ id, label, strategy, priceIdx, color }) => (
            <div key={id} style={s.compCard}>
              <div style={{ ...s.compName, color }}>{label}</div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ ...s.compTag, background: color + "22", color, border: `1px solid ${color}44` }}>{strategy}</span>
                <span style={{ ...s.compTag, background: "#21262d", color: "#8b949e" }}>Price idx {priceIdx}</span>
              </div>
              <textarea
                style={{ ...s.textarea, minHeight: 72, fontSize: 11 }}
                value={brief.compNotes?.[id] ?? ""}
                onChange={e => set("compNotes", { ...brief.compNotes, [id]: e.target.value })}
                placeholder={`Notes on ${label}'s strategy, threats, and 2025 moves…`}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={s.grid}>
        {/* Annual Targets */}
        <div style={s.section}>
          <div style={s.sectionTitle}>FY 2026 Targets</div>
          <div style={s.targetRow}>
            <div style={s.targetLabel}>Revenue Target</div>
            <input style={s.targetInput} type="number" value={brief.annualRevenueTarget}
              onChange={e => set("annualRevenueTarget", Number(e.target.value))} />
            <div style={s.targetUnit}>$</div>
          </div>
          <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 12, paddingLeft: 190 }}>
            → ${weeklyRevTarget.toLocaleString()} / week
          </div>
          <div style={s.targetRow}>
            <div style={s.targetLabel}>Gross Margin Target</div>
            <input style={s.targetInput} type="number" step="0.5" value={brief.marginTarget}
              onChange={e => set("marginTarget", Number(e.target.value))} />
            <div style={s.targetUnit}>%</div>
          </div>
          <div style={s.targetRow}>
            <div style={s.targetLabel}>Market Share Target</div>
            <input style={s.targetInput} type="number" step="0.5" value={brief.marketShareTarget}
              onChange={e => set("marketShareTarget", Number(e.target.value))} />
            <div style={s.targetUnit}>%</div>
          </div>
          <div style={s.targetRow}>
            <div style={s.targetLabel}>PL Penetration Target</div>
            <input style={s.targetInput} type="number" step="0.5" value={brief.plPenetrationTarget}
              onChange={e => set("plPenetrationTarget", Number(e.target.value))} />
            <div style={s.targetUnit}>%</div>
          </div>
        </div>

        {/* Pricing Guardrails */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Pricing Guardrails</div>
          <div style={s.targetRow}>
            <div style={s.targetLabel}>Price Index Ceiling</div>
            <input style={s.targetInput} type="number" step="0.01" value={brief.priceIndexCeiling}
              onChange={e => set("priceIndexCeiling", Number(e.target.value))} />
            <div style={{ fontSize: 11, color: "#8b949e" }}>vs mkt</div>
          </div>
          <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 12, paddingLeft: 190 }}>
            Max {Math.round((brief.priceIndexCeiling - 1) * 100)}% above market average
          </div>
          <div style={s.targetRow}>
            <div style={s.targetLabel}>Max Promo Depth</div>
            <input style={s.targetInput} type="number" step="1" value={brief.maxPromoPct}
              onChange={e => set("maxPromoPct", Number(e.target.value))} />
            <div style={s.targetUnit}>%</div>
          </div>
        </div>
      </div>

      {/* Key Initiatives */}
      <div style={s.grid}>
        <div style={s.section}>
          <div style={s.sectionTitle}>Key Initiatives</div>
          <textarea
            style={{ ...s.textarea, minHeight: 110 }}
            value={brief.keyInitiatives}
            onChange={e => set("keyInitiatives", e.target.value)}
            placeholder="List your 3–5 strategic priorities for the year…"
          />
        </div>
        <div style={s.section}>
          <div style={s.sectionTitle}>Constraints & Hard Rules</div>
          <textarea
            style={{ ...s.textarea, minHeight: 110 }}
            value={brief.constraints}
            onChange={e => set("constraints", e.target.value)}
            placeholder="Floor prices, forbidden tactics, brand commitments…"
          />
        </div>
      </div>

      {/* Notes */}
      <div style={s.fullSection}>
        <div style={s.sectionTitle}>Additional Notes</div>
        <textarea
          style={{ ...s.textarea, minHeight: 70 }}
          value={brief.notes}
          onChange={e => set("notes", e.target.value)}
          placeholder="Seasonal focus, stakeholder context, open questions…"
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
        <button style={s.saveBtn} onClick={handleSave}>Save Brief</button>
        {saved && <span style={s.savedBadge}>✓ Saved</span>}
      </div>

      {/* ── GUARDRAILS ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#f85149", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <span>⛔</span> Hard Guardrails
        </div>
        <div style={{ fontSize: 13, color: "#8b949e", marginBottom: 16 }}>
          These rules are enforced server-side on every advance — including Circe's autonomous run.
          No decision can bypass them regardless of source.
        </div>
      </div>

      <div style={{ background: "#160d0d", border: "1px solid #f8514933", borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ ...s.sectionTitle, color: "#f85149" }}>Margin Protection</div>
        <div style={s.targetRow}>
          <div style={s.targetLabel}>Margin Floor (any SKU)</div>
          <input style={s.targetInput} type="number" step="1" min="10" max="60"
            value={guardrails.marginFloorPct}
            onChange={e => setG("marginFloorPct", Number(e.target.value))} />
          <div style={s.targetUnit}>%</div>
        </div>
        <div style={{ fontSize: 11, color: "#8b949e", paddingLeft: 190, marginBottom: 10 }}>
          Minimum gross margin % after any promo. Promo depth will be auto-clamped.
        </div>
        <div style={s.targetRow}>
          <div style={s.targetLabel}>Min Margin per Unit</div>
          <input style={s.targetInput} type="number" step="0.25" min="0.50"
            value={guardrails.minMarginDollarPerUnit}
            onChange={e => setG("minMarginDollarPerUnit", Number(e.target.value))} />
          <div style={s.targetUnit}>$</div>
        </div>
        <div style={{ fontSize: 11, color: "#8b949e", paddingLeft: 190 }}>
          Minimum gross margin dollars per unit sold — hard floor on any SKU.
        </div>
      </div>

      <div style={{ background: "#160d0d", border: "1px solid #f8514933", borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ ...s.sectionTitle, color: "#f85149" }}>Promotion Controls</div>
        <div style={s.targetRow}>
          <div style={s.targetLabel}>Max Promo Depth</div>
          <input style={s.targetInput} type="number" step="1" min="5" max="40"
            value={guardrails.maxPromoPct}
            onChange={e => setG("maxPromoPct", Number(e.target.value))} />
          <div style={s.targetUnit}>%</div>
        </div>
        <div style={{ fontSize: 11, color: "#8b949e", paddingLeft: 190, marginBottom: 10 }}>
          Hard cap on any single promo discount. Circe's recommendations above this will be clamped.
        </div>
        <div style={s.targetRow}>
          <div style={s.targetLabel}>Max Concurrent Promos</div>
          <input style={s.targetInput} type="number" step="1" min="1" max="8"
            value={guardrails.maxConcurrentPromos}
            onChange={e => setG("maxConcurrentPromos", Number(e.target.value))} />
          <div style={{ fontSize: 11, color: "#8b949e" }}>SKUs</div>
        </div>
        <div style={{ fontSize: 11, color: "#8b949e", paddingLeft: 190 }}>
          Maximum number of SKUs on promo simultaneously. Lowest-discount promos are dropped first.
        </div>
      </div>

      <div style={{ background: "#160d0d", border: "1px solid #f8514933", borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ ...s.sectionTitle, color: "#f85149" }}>Pricing Floors</div>
        <div style={s.targetRow}>
          <div style={s.targetLabel}>Min Price Multiplier</div>
          <input style={s.targetInput} type="number" step="0.01" min="1.10" max="2.00"
            value={guardrails.minKrogerPriceVsCost}
            onChange={e => setG("minKrogerPriceVsCost", Number(e.target.value))} />
          <div style={{ fontSize: 11, color: "#8b949e" }}>× cost</div>
        </div>
        <div style={{ fontSize: 11, color: "#8b949e", paddingLeft: 190, marginBottom: 10 }}>
          Kroger shelf price must be at least this multiple of the SKU's base cost.
        </div>
        <div style={s.targetRow}>
          <div style={s.targetLabel}>Price Index Ceiling</div>
          <input style={s.targetInput} type="number" step="0.01" min="0.95" max="1.30"
            value={guardrails.priceIndexCeiling}
            onChange={e => setG("priceIndexCeiling", Number(e.target.value))} />
          <div style={{ fontSize: 11, color: "#8b949e" }}>vs mkt</div>
        </div>
        <div style={{ fontSize: 11, color: "#8b949e", paddingLeft: 190, marginBottom: 10 }}>
          Max {Math.round((guardrails.priceIndexCeiling - 1) * 100)}% above market avg per SKU
        </div>
        <div style={s.targetRow}>
          <div style={s.targetLabel}>Price Index Floor</div>
          <input style={s.targetInput} type="number" step="0.01" min="0.70" max="1.00"
            value={guardrails.priceIndexFloor}
            onChange={e => setG("priceIndexFloor", Number(e.target.value))} />
          <div style={{ fontSize: 11, color: "#8b949e" }}>vs mkt</div>
        </div>
        <div style={{ fontSize: 11, color: "#8b949e", paddingLeft: 190 }}>
          Max {Math.round((1 - guardrails.priceIndexFloor) * 100)}% below market avg per SKU (shelf price or effective promo price). Prevents racing to the bottom.
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          style={{ ...s.saveBtn, background: "#b91c1c" }}
          onClick={handleSaveGuardrails}
        >
          ⛔ Save Guardrails
        </button>
        {guardrailsSaved && <span style={{ ...s.savedBadge, marginLeft: 12 }}>✓ Guardrails saved — active on all future advances</span>}
      </div>
    </div>
  );
}

// Export loader for other components
export function loadBrief() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_BRIEF, ...JSON.parse(saved) } : DEFAULT_BRIEF;
  } catch { return DEFAULT_BRIEF; }
}
