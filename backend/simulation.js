import { SKUS, RETAILERS, RETAILER_STRATEGY } from "./skus.js";

// Season by week (Dallas TX)
export function getSeason(week) {
  if (week <= 8 || week >= 49)  return "Winter";
  if (week <= 21)               return "Spring";
  if (week <= 35)               return "Summer";
  return "Fall";
}

// Seasonal demand multiplier
function seasonalMultiplier(week, subcategory) {
  const season = getSeason(week);
  const matrix = {
    "Paper Towels": { Winter: 1.05, Spring: 0.95, Summer: 1.10, Fall: 1.00 },
    "Toilet Paper": { Winter: 1.10, Spring: 1.00, Summer: 0.95, Fall: 1.05 },
    "Tissues":      { Winter: 1.35, Spring: 0.85, Summer: 0.80, Fall: 1.10 }
  };
  return matrix[subcategory]?.[season] ?? 1.0;
}

// Random weekly market events
const EVENTS = [
  { id: "supply_disruption", label: "Supply Disruption", description: "Charmin shipment delays — limited stock industry-wide.", affected: ["charmin-ultra-24","charmin-basic-20"], stockImpact: 0.4 },
  { id: "flu_season",        label: "Flu Season Spike",  description: "DFW flu reports up 40%. Tissue demand surging.",        affected: ["puffs-plus-3pk","kleenex-6pk"],        demandMult: 1.5 },
  { id: "walmart_blitz",     label: "Walmart Price Blitz", description: "Walmart running aggressive rollback on paper towels.", affected: ["bounty-sas-12","bounty-ess-6"],         retailer: "walmart", priceDrop: 0.12 },
  { id: "back_to_school",    label: "Back-to-School Rush", description: "Back-to-school traffic boost in household staples.",  affected: null,                                     demandMult: 1.15 },
  { id: "competitor_oos",    label: "Competitor OOS",     description: "Tom Thumb out-of-stock on Charmin — opportunity to capture switchers.", affected: ["charmin-ultra-24"], retailer: "tomThumb", stockImpact: 0 },
  { id: "none", label: null, description: null, affected: null }
];

function rollEvent(week) {
  // Events more likely mid-simulation to add drama
  const chance = week > 5 && week < 50 ? 0.25 : 0.08;
  if (Math.random() > chance) return { id: "none", label: null, description: null };
  const pool = EVENTS.filter(e => e.id !== "none");
  return pool[Math.floor(Math.random() * pool.length)];
}

// Competitor pricing logic — they react to Kroger and each other
function updateCompetitorPrices(state, event) {
  const updated = JSON.parse(JSON.stringify(state.skus));

  updated.forEach(sku => {
    RETAILERS.filter(r => r !== "kroger").forEach(retailer => {
      if (sku.pricing[retailer] === null) return;

      const strat = RETAILER_STRATEGY[retailer];
      const krogerPrice = sku.pricing.kroger;
      const targetPrice = krogerPrice * strat.priceIndex;
      const current = sku.pricing[retailer];

      // Drift toward target slowly (max 3% per week)
      const diff = targetPrice - current;
      const drift = Math.sign(diff) * Math.min(Math.abs(diff), current * 0.03);
      let newPrice = current + drift;

      // Random small noise ±1%
      newPrice *= 1 + (Math.random() - 0.5) * 0.02;

      // Apply event price drops
      if (event?.retailer === retailer && event?.priceDrop && event.affected?.includes(sku.id)) {
        newPrice *= (1 - event.priceDrop);
      }

      sku.pricing[retailer] = Math.round(newPrice * 100) / 100;
    });

    // Competitor promos (random, based on promoFreq)
    RETAILERS.filter(r => r !== "kroger").forEach(retailer => {
      if (sku.pricing[retailer] === null) return;
      const strat = RETAILER_STRATEGY[retailer];
      if (Math.random() < strat.promoFreq) {
        const discount = 0.08 + Math.random() * 0.12; // 8–20% off
        sku.promos[retailer] = {
          type: Math.random() > 0.5 ? "TPR" : "Feature",
          discount: Math.round(discount * 100),
          effectivePrice: Math.round(sku.pricing[retailer] * (1 - discount) * 100) / 100
        };
      } else {
        sku.promos[retailer] = null;
      }
    });
  });

  return updated;
}

// Kroger demand model — price elasticity + promo lift + facings + seasonality
function calcKrogerDemand(sku, week, event) {
  const baseUnits = sku.baseUnitsPerWeek;
  const season = seasonalMultiplier(week, sku.subcategory);

  // Price index vs weighted market average (excluding Kroger)
  const competitors = RETAILERS.filter(r => r !== "kroger" && sku.pricing[r] !== null);
  const avgCompPrice = competitors.reduce((s, r) => {
    const p = sku.promos[r]?.effectivePrice ?? sku.pricing[r];
    return s + p;
  }, 0) / (competitors.length || 1);

  const krogerEffective = sku.promos.kroger?.effectivePrice ?? sku.pricing.kroger;
  const priceIndex = krogerEffective / avgCompPrice; // >1 = we're more expensive
  const priceEffect = Math.pow(priceIndex, sku.elasticity);

  // Promo lift (20–35% on top of price reduction)
  const promoLift = sku.promos.kroger ? 1.0 + (sku.promos.kroger.discount / 100) * 0.4 : 1.0;

  // Facings effect (log scale — diminishing returns)
  const facingsEffect = Math.log(sku.facings.kroger + 1) / Math.log(5);

  // Event demand shock
  let eventMult = 1.0;
  if (event?.demandMult && (!event.affected || event.affected.includes(sku.id))) {
    eventMult = event.demandMult;
  }
  if (event?.stockImpact !== undefined && event.affected?.includes(sku.id) && event?.retailer === "kroger") {
    eventMult *= event.stockImpact;
  }

  const units = Math.round(baseUnits * season * priceEffect * promoLift * facingsEffect * eventMult);
  return Math.max(0, units);
}

// Market share calculation (simplified — based on price competitiveness)
function calcMarketShare(skus, week) {
  let krogerRevenue = 0;
  let totalRevenue = 0;

  skus.forEach(sku => {
    RETAILERS.forEach(retailer => {
      if (sku.pricing[retailer] === null) return;
      const effectivePrice = sku.promos[retailer]?.effectivePrice ?? sku.pricing[retailer];
      const units = retailer === "kroger"
        ? calcKrogerDemand(sku, week, null)
        : Math.round(sku.baseUnitsPerWeek * RETAILER_STRATEGY[retailer].priceIndex * 0.8);
      const rev = effectivePrice * units;
      totalRevenue += rev;
      if (retailer === "kroger") krogerRevenue += rev;
    });
  });

  return totalRevenue > 0 ? (krogerRevenue / totalRevenue) * 100 : 0;
}

// Price index: Kroger avg effective price / weighted market avg effective price
function calcPriceIndex(skus) {
  let krogerSum = 0, marketSum = 0, n = 0;
  skus.forEach(sku => {
    const krogerP = sku.promos.kroger?.effectivePrice ?? sku.pricing.kroger;
    const comps = RETAILERS.filter(r => r !== "kroger" && sku.pricing[r] !== null);
    if (!comps.length) return;
    const avgComp = comps.reduce((s, r) => s + (sku.promos[r]?.effectivePrice ?? sku.pricing[r]), 0) / comps.length;
    krogerSum += krogerP;
    marketSum += avgComp;
    n++;
  });
  return n > 0 ? Math.round((krogerSum / marketSum) * 1000) / 1000 : 1.0;
}

// PL penetration: % of category volume going to private label (store brands)
// Driven by Aldi/Lidl price gaps, Kroger promo activity, season
function calcPLPenetration(skus, week, prevPL) {
  const base = prevPL ?? 17.5;

  // Aldi/Lidl price advantage → shoppers trade to PL
  let totalGap = 0, gapCount = 0;
  skus.forEach(sku => {
    const krogerP = sku.pricing.kroger;
    ["aldi", "lidl"].forEach(r => {
      if (sku.pricing[r] !== null) {
        totalGap += (krogerP - sku.pricing[r]) / krogerP;
        gapCount++;
      }
    });
  });
  const aldiEffect = gapCount > 0 ? (totalGap / gapCount) * 12 : 0; // avg gap drives PL

  // Active Kroger promos pull shoppers back to name brands
  const activePromos = skus.filter(s => s.promos.kroger).length;
  const promoEffect = -(activePromos * 0.5);

  // Seasonal: more value-seeking in Winter
  const season = getSeason(week);
  const seasonEffect = season === "Winter" ? 0.6 : season === "Summer" ? -0.4 : 0;

  // Mean-revert slowly to 17.5%
  const reversion = (17.5 - base) * 0.08;
  const noise = (Math.random() - 0.5) * 0.7;

  return Math.round(Math.max(9, Math.min(32, base + aldiEffect + promoEffect + seasonEffect + reversion + noise)) * 10) / 10;
}

// Build initial state
export function buildInitialState() {
  const skus = SKUS.map(sku => ({
    ...sku,
    promos: Object.fromEntries(RETAILERS.map(r => [r, null]))
  }));

  return {
    week: 0,
    totalWeeks: 52,
    marketName: "Dallas/Uptown",
    krogerKPIs: {
      cumulativeRevenue: 0,
      cumulativeMargin: 0,
      weeklyRevenue: [],
      weeklyMargin: [],
      weeklyMarketShare: [],
      weeklyUnits: []
    },
    lastEvent: null,
    lastCirceRec: null,
    skus,
    history: []
  };
}

// Advance one week — apply Kroger decisions, simulate market, return new state
export function advanceWeek(state, krogerDecisions = {}) {
  const newState = JSON.parse(JSON.stringify(state));
  newState.week += 1;
  const week = newState.week;

  // Apply Kroger pricing/promo decisions
  if (krogerDecisions.prices) {
    Object.entries(krogerDecisions.prices).forEach(([skuId, price]) => {
      const sku = newState.skus.find(s => s.id === skuId);
      if (sku) sku.pricing.kroger = parseFloat(price);
    });
  }
  if (krogerDecisions.promos) {
    Object.entries(krogerDecisions.promos).forEach(([skuId, promo]) => {
      const sku = newState.skus.find(s => s.id === skuId);
      if (sku) {
        if (promo) {
          sku.promos.kroger = {
            type: promo.type,
            discount: promo.discount,
            effectivePrice: Math.round(sku.pricing.kroger * (1 - promo.discount / 100) * 100) / 100
          };
        } else {
          sku.promos.kroger = null;
        }
      }
    });
  }
  if (krogerDecisions.facings) {
    Object.entries(krogerDecisions.facings).forEach(([skuId, count]) => {
      const sku = newState.skus.find(s => s.id === skuId);
      if (sku) sku.facings.kroger = parseInt(count);
    });
  }

  // Roll random event
  const event = rollEvent(week);
  newState.lastEvent = event.id !== "none" ? event : null;

  // Update competitor prices/promos
  newState.skus = updateCompetitorPrices(newState, event);

  // Calculate Kroger results
  let weekRevenue = 0;
  let weekCOGS = 0;
  let weekUnits = 0;
  const skuResults = [];

  newState.skus.forEach(sku => {
    const units = calcKrogerDemand(sku, week, event);
    const effectivePrice = sku.promos.kroger?.effectivePrice ?? sku.pricing.kroger;
    const revenue = effectivePrice * units;
    const margin = (effectivePrice - sku.baseCost) * units;

    weekRevenue += revenue;
    weekCOGS += sku.baseCost * units;
    weekUnits += units;

    skuResults.push({
      id: sku.id,
      name: sku.name,
      units,
      effectivePrice,
      revenue: Math.round(revenue * 100) / 100,
      marginDollars: Math.round(margin * 100) / 100,
      marginPct: Math.round(((effectivePrice - sku.baseCost) / effectivePrice) * 1000) / 10
    });
  });

  const weekMargin = weekRevenue - weekCOGS;
  const weekMarketShare = calcMarketShare(newState.skus, week);
  const weekPriceIndex = calcPriceIndex(newState.skus);
  const prevPL = newState.history.length > 0 ? newState.history[newState.history.length - 1].plPenetration : undefined;
  const weekPLPenetration = calcPLPenetration(newState.skus, week, prevPL);

  newState.krogerKPIs.cumulativeRevenue += weekRevenue;
  newState.krogerKPIs.cumulativeMargin += weekMargin;
  newState.krogerKPIs.weeklyRevenue.push(Math.round(weekRevenue * 100) / 100);
  newState.krogerKPIs.weeklyMargin.push(Math.round(weekMargin * 100) / 100);
  newState.krogerKPIs.weeklyMarketShare.push(Math.round(weekMarketShare * 100) / 100);
  newState.krogerKPIs.weeklyUnits.push(weekUnits);

  // Snapshot history
  newState.history.push({
    week,
    season: getSeason(week),
    event: newState.lastEvent,
    skuResults,
    weekRevenue: Math.round(weekRevenue * 100) / 100,
    weekMargin: Math.round(weekMargin * 100) / 100,
    weekMarginPct: weekRevenue > 0 ? Math.round((weekMargin / weekRevenue) * 1000) / 10 : 0,
    weekMarketShare: Math.round(weekMarketShare * 100) / 100,
    weekUnits,
    priceIndex: weekPriceIndex,
    plPenetration: weekPLPenetration
  });

  return newState;
}

// Build context snapshot for Circe
export function buildCirceContext(state, guardrails = null, strategy = "balanced") {
  const week = state.week;
  const season = getSeason(week);
  const kpis = state.krogerKPIs;
  const lastHistory = state.history[state.history.length - 1];

  // Price gap analysis
  const priceGaps = state.skus.map(sku => {
    const krogerPrice = sku.promos.kroger?.effectivePrice ?? sku.pricing.kroger;
    const walmartPrice = sku.promos.walmart?.effectivePrice ?? sku.pricing.walmart;
    const gap = walmartPrice ? Math.round(((krogerPrice - walmartPrice) / walmartPrice) * 1000) / 10 : null;
    return { sku: sku.name, krogerPrice, walmartPrice, gapPct: gap };
  });

  // Trend (last 4 weeks if available)
  const recent = state.history.slice(-4);
  const revTrend = recent.length > 1
    ? Math.round(((recent[recent.length-1].weekRevenue / recent[0].weekRevenue) - 1) * 1000) / 10
    : 0;

  return {
    week,
    totalWeeks: state.totalWeeks,
    season,
    market: state.marketName,
    currentEvent: state.lastEvent,
    krogerThisWeek: lastHistory,
    cumulativeRevenue: Math.round(kpis.cumulativeRevenue * 100) / 100,
    cumulativeMargin: Math.round(kpis.cumulativeMargin * 100) / 100,
    revenueTrend4wk: revTrend,
    priceGaps,
    skuPricingSnapshot: state.skus.map(s => ({
      id: s.id, name: s.name, subcategory: s.subcategory, segment: s.segment,
      pricing: s.pricing, promos: s.promos, facings: s.facings,
      baseCost: s.baseCost
    })),
    guardrails,
    strategy
  };
}
