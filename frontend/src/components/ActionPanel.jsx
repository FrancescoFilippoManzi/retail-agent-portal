import React, { useState } from "react";
import { fetchCirceActions } from "../api.js";

const s = {
  wrap: { padding: "16px 20px" },
  titleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { fontSize: 13, fontWeight: 600, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.05em" },
  circeBtn: {
    display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
    background: "#2d1b69", border: "1px solid #6e40c9", borderRadius: 6,
    color: "#bf91f3", fontSize: 12, fontWeight: 600, cursor: "pointer"
  },
  circeBtnLoading: { opacity: 0.6, cursor: "not-allowed" },
  rationale: {
    background: "#161b22", border: "1px solid #6e40c9", borderRadius: 6,
    padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#bf91f3",
    lineHeight: 1.5
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 },
  card: { background: "#161b22", border: "1px solid #21262d", borderRadius: 8, padding: 12 },
  cardHighlighted: { border: "1px solid #6e40c9", background: "#16112b" },
  skuName: { fontSize: 12, fontWeight: 600, color: "#e6edf3", marginBottom: 6 },
  skuSub: { fontSize: 10, color: "#8b949e", marginBottom: 8 },
  row: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  label: { fontSize: 11, color: "#8b949e", width: 60 },
  input: {
    background: "#0d1117", border: "1px solid #30363d", borderRadius: 4, color: "#e6edf3",
    padding: "3px 7px", width: 80, fontSize: 12, outline: "none"
  },
  inputHighlighted: {
    background: "#0d1117", border: "1px solid #6e40c9", borderRadius: 4, color: "#bf91f3",
    padding: "3px 7px", width: 80, fontSize: 12, outline: "none", fontWeight: 600
  },
  select: {
    background: "#0d1117", border: "1px solid #30363d", borderRadius: 4, color: "#e6edf3",
    padding: "3px 6px", fontSize: 11, outline: "none", flex: 1
  },
  pctInput: {
    background: "#0d1117", border: "1px solid #30363d", borderRadius: 4, color: "#e6edf3",
    padding: "3px 7px", width: 55, fontSize: 12, outline: "none"
  },
  promoRow: { display: "flex", gap: 6, alignItems: "center", marginTop: 4 },
  promoLabel: { fontSize: 11, color: "#8b949e" },
  advBtn: {
    display: "block", width: "100%", marginTop: 16, padding: "10px 0",
    background: "#1f6feb", border: "none", borderRadius: 6, color: "#fff",
    fontSize: 14, fontWeight: 700, cursor: "pointer"
  },
  advBtnDone: { background: "#21262d", color: "#8b949e", cursor: "not-allowed" },
  currentPrice: { fontSize: 10, color: "#8b949e" },
  circeTag: { fontSize: 9, color: "#6e40c9", background: "#2d1b69", padding: "1px 5px", borderRadius: 3, marginLeft: 6 }
};

export default function ActionPanel({ skus, week, totalWeeks, onAdvance, loading, retailer, category }) {
  const [prices, setPrices] = useState({});
  const [promoType, setPromoType] = useState({});
  const [promoPct, setPromoPct] = useState({});
  const [promoOn, setPromoOn] = useState({});
  const [facings, setFacings] = useState({});
  const [circeApplied, setCirceApplied] = useState({}); // tracks which skus were set by Circe
  const [circeRationale, setCirceRationale] = useState("");
  const [circeLoading, setCirceLoading] = useState(false);
  const [circeError, setCirceError] = useState("");

  const done = week >= totalWeeks;

  async function handleApplyCirce() {
    if (circeLoading || week === 0) return;
    setCirceLoading(true);
    setCirceError("");
    try {
      const { changes, rationale } = await fetchCirceActions();
      const newPrices = { ...prices };
      const newPromoOn = { ...promoOn };
      const newPromoType = { ...promoType };
      const newPromoPct = { ...promoPct };
      const newFacings = { ...facings };
      const applied = {};

      changes.forEach(c => {
        applied[c.skuId] = true;
        if (c.price !== null && c.price !== undefined) newPrices[c.skuId] = String(c.price);
        if (c.facings !== null && c.facings !== undefined) newFacings[c.skuId] = String(c.facings);
        if (c.promo) {
          newPromoOn[c.skuId] = true;
          newPromoType[c.skuId] = c.promo.type;
          newPromoPct[c.skuId] = String(c.promo.discount);
        } else if (c.promo === null) {
          newPromoOn[c.skuId] = false;
        }
      });

      setPrices(newPrices);
      setPromoOn(newPromoOn);
      setPromoType(newPromoType);
      setPromoPct(newPromoPct);
      setFacings(newFacings);
      setCirceApplied(applied);
      setCirceRationale(rationale ?? "");
    } catch (err) {
      setCirceError(err.message);
    } finally {
      setCirceLoading(false);
    }
  }

  function handleAdvance() {
    if (done || loading) return;
    const decisions = { prices: {}, promos: {}, facings: {} };
    skus.forEach(sku => {
      if (prices[sku.id] !== undefined && prices[sku.id] !== "") decisions.prices[sku.id] = prices[sku.id];
      if (facings[sku.id] !== undefined && facings[sku.id] !== "") decisions.facings[sku.id] = facings[sku.id];
      if (promoOn[sku.id]) {
        decisions.promos[sku.id] = {
          type: promoType[sku.id] ?? "TPR",
          discount: parseInt(promoPct[sku.id] ?? 10)
        };
      } else {
        decisions.promos[sku.id] = null;
      }
    });
    onAdvance(decisions);
    setPromoOn({});
    setPromoPct({});
    setCirceApplied({});
    setCirceRationale("");
  }

  return (
    <div style={s.wrap}>
      <div style={s.titleRow}>
        <div style={s.title}>Kroger Decisions — Week {week + 1}</div>
        <button
          style={{ ...s.circeBtn, ...(circeLoading || week === 0 ? s.circeBtnLoading : {}) }}
          onClick={handleApplyCirce}
          disabled={circeLoading || week === 0}
          title={week === 0 ? "Advance to Week 1 first" : "Load Circe's recommended changes into the form"}
        >
          {circeLoading ? "⏳ Asking Circe…" : "✦ Apply Circe Recommendations"}
        </button>
      </div>

      {circeError && (
        <div style={{ color: "#f85149", fontSize: 12, marginBottom: 10 }}>⚠ {circeError}</div>
      )}

      {circeRationale && (
        <div style={s.rationale}>
          <strong>Circe:</strong> {circeRationale}
          <span style={{ fontSize: 10, color: "#8b949e", marginLeft: 8 }}>— review below and advance when ready</span>
        </div>
      )}

      {done && <div style={{ color: "#f85149", marginBottom: 12 }}>Simulation complete — 52 weeks finished.</div>}

      <div style={s.grid}>
        {skus.map(sku => {
          const highlighted = !!circeApplied[sku.id];
          return (
            <div key={sku.id} style={{ ...s.card, ...(highlighted ? s.cardHighlighted : {}) }}>
              <div style={s.skuName}>
                {sku.name}
                {highlighted && <span style={s.circeTag}>CIRCE</span>}
              </div>
              <div style={s.skuSub}>{sku.subcategory} · {sku.segment}</div>

              {/* Price */}
              <div style={s.row}>
                <span style={s.label}>Price</span>
                <input
                  style={highlighted && prices[sku.id] ? s.inputHighlighted : s.input}
                  type="number"
                  step="0.10"
                  min="0.01"
                  placeholder={`$${sku.pricing.kroger.toFixed(2)}`}
                  value={prices[sku.id] ?? ""}
                  onChange={e => { setPrices(prev => ({ ...prev, [sku.id]: e.target.value })); }}
                />
                <span style={s.currentPrice}>curr: ${sku.pricing.kroger.toFixed(2)}</span>
              </div>

              {/* Facings */}
              <div style={s.row}>
                <span style={s.label}>Facings</span>
                <input
                  style={{ ...(highlighted && facings[sku.id] ? s.inputHighlighted : s.input), width: 55 }}
                  type="number"
                  min="1" max="10"
                  placeholder={`${sku.facings.kroger}`}
                  value={facings[sku.id] ?? ""}
                  onChange={e => setFacings(prev => ({ ...prev, [sku.id]: e.target.value }))}
                />
                <span style={s.currentPrice}>curr: {sku.facings.kroger}</span>
              </div>

              {/* Promo */}
              <div style={s.promoRow}>
                <input
                  type="checkbox"
                  id={`promo-${sku.id}`}
                  checked={!!promoOn[sku.id]}
                  onChange={e => setPromoOn(prev => ({ ...prev, [sku.id]: e.target.checked }))}
                />
                <label htmlFor={`promo-${sku.id}`} style={{ ...s.promoLabel, ...(highlighted && promoOn[sku.id] ? { color: "#bf91f3" } : {}) }}>
                  Run Promo
                </label>
                {promoOn[sku.id] && (
                  <>
                    <select
                      style={s.select}
                      value={promoType[sku.id] ?? "TPR"}
                      onChange={e => setPromoType(prev => ({ ...prev, [sku.id]: e.target.value }))}
                    >
                      <option value="TPR">TPR</option>
                      <option value="Feature">Feature Ad</option>
                      <option value="Display">Display</option>
                      <option value="BOGO">BOGO</option>
                    </select>
                    <input
                      style={s.pctInput}
                      type="number" min="5" max="40"
                      placeholder="10"
                      value={promoPct[sku.id] ?? ""}
                      onChange={e => setPromoPct(prev => ({ ...prev, [sku.id]: e.target.value }))}
                    />
                    <span style={{ fontSize: 11, color: "#8b949e" }}>%</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        style={{ ...s.advBtn, ...(done || loading ? s.advBtnDone : {}) }}
        onClick={handleAdvance}
        disabled={done || loading}
      >
        {loading ? "Simulating…" : done ? "Simulation Complete" : `▶ Advance to Week ${week + 1}`}
      </button>
    </div>
  );
}
