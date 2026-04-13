// In production VITE_API_URL points to the Render backend (e.g. https://retail-agent-portal.onrender.com)
// In dev, Vite proxies /api → localhost:3002
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export async function getState() {
  const r = await fetch(`${BASE}/state`);
  return r.json();
}

export async function advanceWeek(decisions = {}) {
  const r = await fetch(`${BASE}/advance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(decisions)
  });
  return r.json();
}

export async function resetSim() {
  const r = await fetch(`${BASE}/reset`, { method: "POST" });
  return r.json();
}

export async function getGuardrails() {
  const r = await fetch(`${BASE}/guardrails`);
  return r.json();
}

export async function saveGuardrails(g) {
  const r = await fetch(`${BASE}/guardrails`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(g)
  });
  return r.json();
}

// Fetch Circe's structured action recommendations (JSON)
export async function fetchCirceActions() {
  const r = await fetch(`${BASE}/circe/actions`);
  if (!r.ok) {
    const e = await r.json();
    throw new Error(e.error ?? "Failed to fetch Circe actions");
  }
  return r.json();
}

// SSE stream: run all 52 weeks with Circe, fires onWeek({week,rationale,...}) each step
export function runAllWithCirce(onWeek, onDone, onError, strategy = "balanced") {
  const es = new EventSource(`${BASE}/run-all?strategy=${strategy}`);
  es.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === "done")  { es.close(); onDone(); return; }
      if (msg.type === "error") { es.close(); onError(msg.message); return; }
      if (msg.type === "week")  { onWeek(msg); }
    } catch {}
  };
  es.onerror = () => { es.close(); onError("Stream disconnected"); };
  return es;
}

// Returns an EventSource for Circe's streaming recommendation
export function streamCirce(onChunk, onDone, onError) {
  const es = new EventSource(`${BASE}/circe`);
  es.onmessage = (e) => {
    if (e.data === "[DONE]") { es.close(); onDone(); return; }
    try {
      const { text, error } = JSON.parse(e.data);
      if (error) { es.close(); onError(error); return; }
      if (text) onChunk(text);
    } catch {}
  };
  es.onerror = () => { es.close(); onError("Stream error"); };
  return es;
}
