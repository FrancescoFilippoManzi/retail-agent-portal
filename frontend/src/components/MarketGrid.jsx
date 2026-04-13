import React from "react";

const RETAILER_ORDER = ["walmart", "kroger", "tomThumb", "centralMarket", "aldi", "lidl"];
const RETAILER_LABELS = {
  walmart: "Walmart", kroger: "Kroger ★", tomThumb: "Tom Thumb",
  centralMarket: "Central Mkt", aldi: "Aldi", lidl: "Lidl"
};
const RETAILER_COLORS = {
  walmart: "#0071ce", kroger: "#e31837", tomThumb: "#005a9e",
  centralMarket: "#6b3fa0", aldi: "#00539f", lidl: "#0050aa"
};

const s = {
  wrap: { padding: "16px 20px", overflowX: "auto" },
  title: { fontSize: 13, fontWeight: 600, color: "#8b949e", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "6px 10px", textAlign: "center", fontWeight: 600, fontSize: 11, borderBottom: "1px solid #21262d", whiteSpace: "nowrap" },
  thLeft: { padding: "6px 10px", textAlign: "left", fontWeight: 600, fontSize: 11, borderBottom: "1px solid #21262d" },
  td: { padding: "5px 10px", textAlign: "center", borderBottom: "1px solid #161b22", whiteSpace: "nowrap" },
  tdLeft: { padding: "5px 10px", textAlign: "left", borderBottom: "1px solid #161b22", color: "#c9d1d9" },
  na: { color: "#30363d" },
  promo: { color: "#3fb950", fontSize: 10 },
  krogerCell: { background: "#1a0a0a" },
  cheapest: { color: "#f0883e", fontWeight: 700 }
};

function PriceCell({ sku, retailer }) {
  const price = sku.pricing[retailer];
  const promo = sku.promos?.[retailer];
  if (price === null) return <td style={{ ...s.td, ...s.na }}>—</td>;

  const effective = promo?.effectivePrice ?? price;
  const isKroger = retailer === "kroger";

  // Find cheapest effective price across all retailers
  const prices = RETAILER_ORDER
    .map(r => promo?.effectivePrice ?? sku.pricing[r])
    .filter(p => p !== null);
  const minPrice = Math.min(...prices);
  const isCheapest = effective === minPrice;

  return (
    <td style={{ ...s.td, ...(isKroger ? s.krogerCell : {}), ...(isCheapest ? s.cheapest : {}) }}>
      ${effective.toFixed(2)}
      {promo && (
        <div style={s.promo}>{promo.type} -{promo.discount}%</div>
      )}
    </td>
  );
}

export default function MarketGrid({ skus }) {
  // Group by subcategory
  const subcats = [...new Set(skus.map(s => s.subcategory))];

  return (
    <div style={s.wrap}>
      <div style={s.title}>Market Price Grid — Dallas/Uptown</div>
      <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 8 }}>
        <span style={{ color: "#f0883e", fontWeight: 700 }}>Orange</span> = lowest price in row &nbsp;|&nbsp;
        <span style={{ color: "#3fb950" }}>Green</span> = active promo &nbsp;|&nbsp;
        <span style={{ ...s.krogerCell, color: "#e6edf3", padding: "0 4px" }}>Shaded</span> = Kroger (you)
      </div>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.thLeft}>SKU</th>
            <th style={s.thLeft}>Seg</th>
            {RETAILER_ORDER.map(r => (
              <th key={r} style={{ ...s.th, color: RETAILER_COLORS[r] }}>
                {RETAILER_LABELS[r]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {subcats.map(cat => (
            <React.Fragment key={cat}>
              <tr>
                <td colSpan={2 + RETAILER_ORDER.length} style={{ padding: "8px 10px 4px", fontSize: 11, color: "#58a6ff", fontWeight: 600, background: "#0d1117" }}>
                  {cat}
                </td>
              </tr>
              {skus.filter(s => s.subcategory === cat).map(sku => (
                <tr key={sku.id} style={{ background: "#161b22" }}>
                  <td style={s.tdLeft}>{sku.name}</td>
                  <td style={{ ...s.tdLeft, color: "#8b949e" }}>{sku.segment}</td>
                  {RETAILER_ORDER.map(r => <PriceCell key={r} sku={sku} retailer={r} />)}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
