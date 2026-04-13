import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, "data", "guardrails.json");

export const DEFAULT_GUARDRAILS = {
  marginFloorPct: 32,          // Minimum gross margin % on any SKU (even after promo)
  minMarginDollarPerUnit: 2.50, // Minimum $ gross margin per unit sold
  maxPromoPct: 18,             // Maximum promo discount depth
  maxConcurrentPromos: 2,      // Max SKUs on promo at the same time
  priceIndexCeiling: 1.07,     // Kroger per-SKU price cannot exceed market avg by more than this
  priceIndexFloor: 0.93,       // Kroger per-SKU effective price cannot fall below this × market avg
  bannedPromoSKUs: [],         // SKU IDs that can never be promoted
  minKrogerPriceVsCost: 1.35   // Kroger price must be at least baseCost × this multiplier
};

export function loadGuardrails() {
  if (fs.existsSync(FILE)) {
    try { return { ...DEFAULT_GUARDRAILS, ...JSON.parse(fs.readFileSync(FILE, "utf-8")) }; }
    catch { return { ...DEFAULT_GUARDRAILS }; }
  }
  return { ...DEFAULT_GUARDRAILS };
}

export function saveGuardrails(g) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(g, null, 2));
}

/**
 * Enforce hard guardrails on proposed decisions.
 * Returns { decisions, violations[] } — decisions are safe to pass to advanceWeek.
 */
export function enforceGuardrails(decisions, skus, guardrails) {
  const g = { ...DEFAULT_GUARDRAILS, ...guardrails };
  const out = {
    prices:  { ...(decisions.prices  ?? {}) },
    promos:  { ...(decisions.promos  ?? {}) },
    facings: { ...(decisions.facings ?? {}) }
  };
  const violations = [];

  skus.forEach(sku => {
    // Effective Kroger price after this round's price decision
    const proposedPrice = out.prices[sku.id] != null
      ? parseFloat(out.prices[sku.id])
      : sku.pricing.kroger;

    // ── 1. Absolute price floor (cost × multiplier) ──────────────────────────
    const absFloor = Math.round(sku.baseCost * g.minKrogerPriceVsCost * 100) / 100;
    if (proposedPrice < absFloor) {
      out.prices[sku.id] = absFloor;
      violations.push(`${sku.name}: price raised to $${absFloor} (min cost multiplier ${g.minKrogerPriceVsCost}×)`);
    }

    const finalBasePrice = out.prices[sku.id] != null ? parseFloat(out.prices[sku.id]) : sku.pricing.kroger;

    // ── 2. Promo guardrails ───────────────────────────────────────────────────
    const promo = out.promos[sku.id];
    if (promo) {
      // 2a. Banned SKU
      if (g.bannedPromoSKUs.includes(sku.id)) {
        out.promos[sku.id] = null;
        violations.push(`${sku.name}: promo blocked (banned SKU)`);
        return;
      }

      // 2b. Cap discount depth
      let discount = Math.min(promo.discount, g.maxPromoPct);
      if (discount !== promo.discount) {
        violations.push(`${sku.name}: promo capped at ${g.maxPromoPct}% (was ${promo.discount}%)`);
      }

      // 2c. Ensure effective price clears margin floor %
      const effectivePrice = finalBasePrice * (1 - discount / 100);
      const marginPct = ((effectivePrice - sku.baseCost) / effectivePrice) * 100;
      const marginDollar = effectivePrice - sku.baseCost;

      let needsAdjust = false;
      if (marginPct < g.marginFloorPct) {
        violations.push(`${sku.name}: promo discount reduced — margin would be ${marginPct.toFixed(1)}% < floor ${g.marginFloorPct}%`);
        needsAdjust = true;
      }
      if (marginDollar < g.minMarginDollarPerUnit) {
        violations.push(`${sku.name}: promo discount reduced — margin/unit $${marginDollar.toFixed(2)} < floor $${g.minMarginDollarPerUnit}`);
        needsAdjust = true;
      }

      if (needsAdjust) {
        // Find max discount that satisfies both floors
        const maxByPct    = Math.max(0, Math.floor((1 - (sku.baseCost / (1 - g.marginFloorPct / 100)) / finalBasePrice) * 100));
        const maxByDollar = Math.max(0, Math.floor((1 - (sku.baseCost + g.minMarginDollarPerUnit) / finalBasePrice) * 100));
        discount = Math.min(discount, maxByPct, maxByDollar);
        if (discount < 3) {
          out.promos[sku.id] = null;
          violations.push(`${sku.name}: promo cancelled — no safe discount depth available`);
          return;
        }
      }

      // 2d. Price index floor — effective price after promo can't be too far below market
      if (g.priceIndexFloor != null) {
        const comps = Object.entries(sku.pricing)
          .filter(([r, p]) => r !== "kroger" && p !== null)
          .map(([, p]) => p);
        if (comps.length) {
          const avgComp = comps.reduce((s, p) => s + p, 0) / comps.length;
          const minAllowed = Math.round(avgComp * g.priceIndexFloor * 100) / 100;
          const afterPromo = finalBasePrice * (1 - discount / 100);
          if (afterPromo < minAllowed) {
            // Reduce discount so effective price stays at or above floor
            const maxDiscount = Math.max(0, Math.floor((1 - minAllowed / finalBasePrice) * 100));
            if (maxDiscount < 3) {
              out.promos[sku.id] = null;
              violations.push(`${sku.name}: promo cancelled — effective price would be below price index floor (${g.priceIndexFloor} × market avg $${avgComp.toFixed(2)})`);
              return;
            }
            violations.push(`${sku.name}: promo capped at ${maxDiscount}% — effective price floor $${minAllowed} (price index floor ${g.priceIndexFloor})`);
            discount = maxDiscount;
          }
        }
      }

      out.promos[sku.id] = { ...promo, discount };
    }

    // ── Per-SKU shelf price index floor (non-promo price changes) ────────────
    if (g.priceIndexFloor != null && out.prices[sku.id] != null) {
      const comps = Object.entries(sku.pricing)
        .filter(([r, p]) => r !== "kroger" && p !== null)
        .map(([, p]) => p);
      if (comps.length) {
        const avgComp = comps.reduce((s, p) => s + p, 0) / comps.length;
        const minAllowed = Math.round(avgComp * g.priceIndexFloor * 100) / 100;
        const proposed = parseFloat(out.prices[sku.id]);
        if (proposed < minAllowed) {
          out.prices[sku.id] = minAllowed;
          violations.push(`${sku.name}: shelf price raised to $${minAllowed} (price index floor ${g.priceIndexFloor} × market avg $${avgComp.toFixed(2)})`);
        }
      }
    }
  });

  // ── 3. Max concurrent promos ────────────────────────────────────────────────
  const activePromos = Object.entries(out.promos)
    .filter(([, p]) => p)
    .map(([id, p]) => ({ id, discount: p.discount }))
    .sort((a, b) => b.discount - a.discount); // keep highest-discount promos

  if (activePromos.length > g.maxConcurrentPromos) {
    activePromos.slice(g.maxConcurrentPromos).forEach(({ id }) => {
      const sku = skus.find(s => s.id === id);
      out.promos[id] = null;
      violations.push(`${sku?.name ?? id}: promo dropped — max ${g.maxConcurrentPromos} concurrent promos`);
    });
  }

  return { decisions: out, violations };
}

/** Format guardrails as a compact block for Circe's system prompt */
export function guardrailsPromptBlock(g) {
  const r = { ...DEFAULT_GUARDRAILS, ...g };
  const banned = r.bannedPromoSKUs.length ? r.bannedPromoSKUs.join(", ") : "none";
  return `
HARD GUARDRAILS — server-enforced, cannot be overridden:
• Margin floor: ${r.marginFloorPct}% gross margin minimum on every SKU after any promo
• Min margin/unit: $${r.minMarginDollarPerUnit} per unit after promo
• Max promo depth: ${r.maxPromoPct}% off — deeper discounts will be clamped automatically
• Max concurrent promos: ${r.maxConcurrentPromos} SKUs at once — excess promos will be dropped
• Price index ceiling: ${r.priceIndexCeiling} — Kroger per-SKU price cannot exceed market avg by more than this
• Price index floor: ${r.priceIndexFloor} — Kroger effective price (including promos) cannot fall below this × market avg per SKU (prevents racing to the bottom)
• Min price floor: baseCost × ${r.minKrogerPriceVsCost} for any Kroger shelf price
• Banned from promo: ${banned}
Do NOT recommend actions that violate these — they will be overridden and your recommendation will be wasted.`.trim();
}
