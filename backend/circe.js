import Anthropic from "@anthropic-ai/sdk";
import { guardrailsPromptBlock } from "./guardrails.js";

const STRATEGY_PROMPTS = {
  balanced:
    "STRATEGIC OBJECTIVE — Balanced: Optimize revenue, gross margin $, and market share in equal measure. No single metric should be sacrificed for another. Seek actions that improve at least two dimensions simultaneously.",
  maximize_margin:
    "STRATEGIC OBJECTIVE — Maximize Gross Margin $: This is your #1 priority above all else. Prefer price increases and premium SKU focus over volume plays. Only recommend promos when unit volume uplift will demonstrably grow total margin dollars — calculate before suggesting. Avoid any action that compresses margin %.",
  maximize_share:
    "STRATEGIC OBJECTIVE — Maximize Market Share: Win as much volume as possible. Recommend competitive pricing, aggressive promo cadence, and facings expansion. Revenue and margin % are secondary metrics — acceptable to trade them for share gains, but never breach a guardrail.",
  maximize_pl:
    "STRATEGIC OBJECTIVE — Maximize Private Label Penetration: Grow the share of category volume going to store brands (Kroger PL, Aldi Floralys, Lidl). Keep name brand shelf prices firm or slightly elevated to widen the price gap vs PL. Reduce name brand promo frequency — fewer promos means weaker name brand value signals and a wider PL price advantage. Do not recommend deep name brand discounts."
};

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt(guardrails, strategy = "balanced") {
  const strategyBlock = STRATEGY_PROMPTS[strategy] ?? STRATEGY_PROMPTS.balanced;
  return `You are Circe, an AI Category Management Agent for Kroger's Paper Goods category in the Dallas/Uptown market. You are sharp, data-driven, and speak like a seasoned category manager — not a chatbot.

Your role: analyze weekly simulation data and give Kroger's category team specific, actionable recommendations. You cover pricing, promotions, planogram allocation, and competitive response.

${strategyBlock}

Style rules:
- Lead with the most urgent action aligned to the strategic objective above
- Use concrete numbers ($ and %) not vague language
- Reference specific SKUs, competitors, and price gaps
- Keep recommendations to 3–5 bullet points max
- Each bullet = one clear action with a rationale tied to the strategic objective
- End with a 1-line "Watch this week:" flag for the next period

You are advising Kroger. The other retailers (Walmart, Tom Thumb, Central Market, Aldi, Lidl) are competitors.

${guardrailsPromptBlock(guardrails ?? {})}`;
}

// Returns structured JSON actions Circe recommends applying
export async function getCirceActions(context) {
  const systemPrompt = buildSystemPrompt(context.guardrails, context.strategy);
  const userMessage = buildPrompt(context) + `

Now return ONLY a JSON object (no prose) with the specific changes to apply for next week.
IMPORTANT: use the exact id string from [id:...] tags above for skuId.
{
  "changes": [
    {
      "skuId": "<exact id from [id:...] tag>",
      "price": <new price as number, or null if no change>,
      "promo": { "type": "TPR"|"Feature"|"Display"|"BOGO", "discount": <integer 5-40> } or null,
      "facings": <integer 1-10, or null if no change>
    }
  ],
  "rationale": "<one sentence summary of the overall strategy>"
}
Only include SKUs where you recommend an actual change. Do not wrap in markdown.`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 600,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }]
  });

  const raw = msg.content[0].text.trim();
  // Strip accidental markdown fences
  const clean = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(clean);
}

export async function getCirceRecommendation(context, res) {
  const systemPrompt = buildSystemPrompt(context.guardrails, context.strategy);
  const userMessage = buildPrompt(context);

  // Stream the response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await client.messages.stream({
      model: "claude-sonnet-4-5",
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }]
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta?.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}

function buildPrompt(ctx) {
  const { week, totalWeeks, season, market, currentEvent, krogerThisWeek,
          cumulativeRevenue, cumulativeMargin, revenueTrend4wk, priceGaps, skuPricingSnapshot } = ctx;

  const eventBlock = currentEvent
    ? `⚠️ MARKET EVENT THIS WEEK: ${currentEvent.label} — ${currentEvent.description}`
    : "No major market event this week.";

  const kpiBlock = krogerThisWeek ? `
Kroger this week:
- Revenue: $${krogerThisWeek.weekRevenue?.toLocaleString()} | Margin: $${krogerThisWeek.weekMargin?.toLocaleString()} (${krogerThisWeek.weekMarginPct}%)
- Market share: ${krogerThisWeek.weekMarketShare}% | Units: ${krogerThisWeek.weekUnits?.toLocaleString()}
- 4-week revenue trend: ${revenueTrend4wk > 0 ? "+" : ""}${revenueTrend4wk}%
- Cumulative revenue: $${cumulativeRevenue?.toLocaleString()} | Cumulative margin: $${cumulativeMargin?.toLocaleString()}` : "";

  const priceGapBlock = priceGaps.map(g =>
    `  ${g.sku}: Kroger $${g.krogerPrice} vs Walmart $${g.walmartPrice ?? "N/A"} (gap: ${g.gapPct !== null ? (g.gapPct > 0 ? "+" : "") + g.gapPct + "%" : "N/A"})`
  ).join("\n");

  const skuBlock = skuPricingSnapshot.map(s => {
    const promoLine = s.promos.kroger
      ? ` [ON PROMO: ${s.promos.kroger.type} ${s.promos.kroger.discount}% off → $${s.promos.kroger.effectivePrice}]`
      : "";
    const compPromos = Object.entries(s.promos)
      .filter(([r, p]) => r !== "kroger" && p)
      .map(([r, p]) => `${r} running ${p.type} ${p.discount}% off`)
      .join(", ");
    return `  [id:${s.id}] ${s.name} (${s.segment}): Kroger $${s.pricing.kroger}${promoLine}${compPromos ? ` | Competitor promos: ${compPromos}` : ""}`;
  }).join("\n");

  return `WEEK ${week} of ${totalWeeks} | ${season} | ${market}

${eventBlock}

${kpiBlock}

PRICE GAPS vs Walmart:
${priceGapBlock}

CURRENT SKU STATUS:
${skuBlock}

Give me your weekly recommendations, Circe.`;
}
