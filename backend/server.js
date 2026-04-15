import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import { buildInitialState, advanceWeek, buildCirceContext } from "./simulation.js";
import { getCirceRecommendation, getCirceActions } from "./circe.js";
import { loadGuardrails, saveGuardrails, enforceGuardrails, DEFAULT_GUARDRAILS } from "./guardrails.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, "data", "state.json");

const app = express();
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : ["http://localhost:5174", "http://localhost:5175"];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// ── State persistence ──────────────────────────────────────────────────────────

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  }
  const initial = buildInitialState();
  saveState(initial);
  return initial;
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ── Routes ─────────────────────────────────────────────────────────────────────

// GET /api/state
app.get("/api/state", (req, res) => {
  res.json(loadState());
});

// POST /api/advance  — body: { prices, promos, facings } (all optional)
app.post("/api/advance", (req, res) => {
  const state = loadState();

  if (state.week >= state.totalWeeks) {
    return res.status(400).json({ error: "Simulation complete — 52 weeks done." });
  }

  const guardrails = loadGuardrails();
  const { decisions, violations } = enforceGuardrails(req.body ?? {}, state.skus, guardrails);
  const newState = advanceWeek(state, decisions);
  saveState(newState);
  res.json({ ...newState, guardrailViolations: violations });
});

// GET /api/circe  — SSE stream of Circe's recommendation for current state
app.get("/api/circe", (req, res) => {
  const state = loadState();

  if (state.week === 0) {
    res.setHeader("Content-Type", "text/event-stream");
    res.write(`data: ${JSON.stringify({ text: "Advance to Week 1 first to get recommendations." })}\n\n`);
    res.write("data: [DONE]\n\n");
    return res.end();
  }

  const context = buildCirceContext(state, loadGuardrails(), req.query.strategy ?? "balanced");
  getCirceRecommendation(context, res);
});

// GET /api/guardrails
app.get("/api/guardrails", (req, res) => res.json(loadGuardrails()));

// POST /api/guardrails
app.post("/api/guardrails", (req, res) => {
  const merged = { ...DEFAULT_GUARDRAILS, ...req.body };
  saveGuardrails(merged);
  res.json(merged);
});

// GET /api/circe/actions — structured JSON decisions from Circe
app.get("/api/circe/actions", async (req, res) => {
  const state = loadState();
  if (state.week === 0) {
    return res.status(400).json({ error: "Advance to Week 1 first." });
  }
  try {
    const context = buildCirceContext(state, loadGuardrails(), req.query.strategy ?? "balanced");
    const actions = await getCirceActions(context);
    res.json(actions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/run-all — SSE stream: resets to week 0, runs all 52 weeks with Circe
// Query: ?strategy=balanced|maximize_margin|maximize_share|maximize_pl
app.get("/api/run-all", async (req, res) => {
  const strategy = req.query.strategy ?? "balanced";
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  // Always start fresh
  let state = buildInitialState();
  saveState(state);
  send({ type: "start", totalWeeks: state.totalWeeks });

  try {
    for (let w = 1; w <= state.totalWeeks; w++) {
      // Week 1: advance without Circe (no history yet to analyze)
      // Weeks 2-52: get Circe's structured actions first
      let decisions = { prices: {}, promos: {}, facings: {} };
      let rationale = "Baseline — no prior data for Circe analysis.";

      const guardrails = loadGuardrails();

      if (w > 1) {
        try {
          const context = buildCirceContext(state, guardrails, strategy);
          const actions = await getCirceActions(context);
          rationale = actions.rationale ?? "";

          (actions.changes ?? []).forEach(c => {
            if (c.price != null)   decisions.prices[c.skuId]  = c.price;
            if (c.facings != null) decisions.facings[c.skuId] = c.facings;
            decisions.promos[c.skuId] = c.promo
              ? { type: c.promo.type, discount: c.promo.discount }
              : null;
          });
        } catch (e) {
          rationale = `Circe error — advancing without changes: ${e.message}`;
        }
      }

      const { decisions: safeDec, violations } = enforceGuardrails(decisions, state.skus, guardrails);
      if (violations.length) rationale += ` [Guardrails applied: ${violations.length} override(s)]`;

      state = advanceWeek(state, safeDec);
      saveState(state);

      const snap = state.history[state.history.length - 1];
      send({
        type: "week",
        week: state.week,
        totalWeeks: state.totalWeeks,
        rationale,
        weekRevenue: snap.weekRevenue,
        weekMargin: snap.weekMargin,
        weekMarginPct: snap.weekMarginPct,
        weekMarketShare: snap.weekMarketShare,
        season: snap.season,
        event: snap.event?.label ?? null
      });
    }

    send({ type: "done" });
    res.end();
  } catch (err) {
    send({ type: "error", message: err.message });
    res.end();
  }
});

// POST /api/reset
app.post("/api/reset", (req, res) => {
  const fresh = buildInitialState();
  saveState(fresh);
  res.json(fresh);
});

// GET /api/health
app.get("/api/health", (req, res) => res.json({ status: "ok", week: loadState().week }));

// ── Category Intelligence proxy ────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const INTEL_BASE = "https://87-99-154-201.nip.io/api";

// POST /api/intelligence/chat  — streams Anthropic SSE back to the browser
app.post("/api/intelligence/chat", async (req, res) => {
  const { messages, system } = req.body;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  try {
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system,
      messages,
    });
    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta?.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ type: "content_block_delta", delta: { text: chunk.delta.text } })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// GET /api/intelligence/daily
app.get("/api/intelligence/daily", async (req, res) => {
  try {
    const r = await fetch(`${INTEL_BASE}/daily/kroger`);
    res.json(await r.json());
  } catch (err) {
    res.status(502).json({ detail: err.message });
  }
});

// GET /api/intelligence/topic/:topic
app.get("/api/intelligence/topic/:topic", async (req, res) => {
  try {
    const r = await fetch(`${INTEL_BASE}/topic/kroger/${req.params.topic}`);
    res.json(await r.json());
  } catch (err) {
    res.status(502).json({ detail: err.message });
  }
});

// POST /api/intelligence/query
app.post("/api/intelligence/query", async (req, res) => {
  try {
    const r = await fetch(`${INTEL_BASE}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...req.body, tenant_id: "kroger" }),
    });
    res.json(await r.json());
  } catch (err) {
    res.status(502).json({ detail: err.message });
  }
});

// POST /api/intelligence/feedback
app.post("/api/intelligence/feedback", async (req, res) => {
  try {
    const r = await fetch(`${INTEL_BASE}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...req.body, tenant_id: "kroger" }),
    });
    res.json(await r.json());
  } catch (err) {
    res.status(502).json({ detail: err.message });
  }
});

// ── Category Agent proxy ───────────────────────────────────────────────────────

const AGENT_BASE = "https://87-99-154-201.nip.io/agent-api/api";

// GET /api/weeks — week list for AgentPanel / RecommendationsPanel
app.get("/api/weeks", async (req, res) => {
  try {
    const r = await fetch(`${AGENT_BASE}/weeks`);
    res.json(await r.json());
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/agent/run?module=X&week_id=Y — SSE stream, proxied as SSE
app.get("/api/agent/run", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const { module, week_id } = req.query;
  try {
    const upstream = await fetch(
      `${AGENT_BASE}/agent/run?module=${module}&week_id=${week_id}`
    );
    // Stream the SSE lines straight through
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
    res.end();
  } catch (err) {
    res.write(`data: ✗ Proxy error: ${err.message}\n\n`);
    res.end();
  }
});

// GET /api/recommendations?week_id=X
app.get("/api/recommendations", async (req, res) => {
  try {
    const { week_id } = req.query;
    const r = await fetch(`${AGENT_BASE}/recommendations?week_id=${week_id}`);
    res.json(await r.json());
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Grocery simulation backend on http://localhost:${PORT}`));
