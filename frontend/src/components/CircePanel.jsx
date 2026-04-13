import React, { useState } from "react";
import { streamCirce } from "../api.js";

const s = {
  wrap: { display: "flex", flexDirection: "column", height: "100%", background: "#161b22", borderLeft: "1px solid #21262d" },
  header: { padding: "12px 16px", borderBottom: "1px solid #21262d", display: "flex", alignItems: "center", gap: 10 },
  dot: { width: 8, height: 8, borderRadius: "50%", background: "#3fb950" },
  title: { fontSize: 13, fontWeight: 700, color: "#e6edf3", letterSpacing: "0.05em" },
  subtitle: { fontSize: 11, color: "#8b949e" },
  body: { flex: 1, overflowY: "auto", padding: "14px 16px", fontSize: 13, lineHeight: 1.7, color: "#c9d1d9", minHeight: 0 },
  footer: { padding: "10px 16px", borderTop: "1px solid #21262d" },
  btn: {
    width: "100%", padding: "8px 0", background: "#238636", border: "none", borderRadius: 6,
    color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer"
  },
  btnDisabled: { background: "#21262d", color: "#8b949e", cursor: "not-allowed" },
  event: { background: "#1f1a0a", border: "1px solid #9e6a03", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#e3b341" },
  placeholder: { color: "#8b949e", fontStyle: "italic" },
  thinking: { color: "#8b949e" }
};

function renderMarkdown(text) {
  // Minimal markdown: bold, bullets
  return text
    .split("\n")
    .map((line, i) => {
      if (line.startsWith("• ") || line.startsWith("- ")) {
        const content = line.slice(2).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        return <div key={i} style={{ paddingLeft: 12, marginBottom: 4 }}>• <span dangerouslySetInnerHTML={{ __html: content }} /></div>;
      }
      if (line.startsWith("**") && line.endsWith("**")) {
        return <div key={i} style={{ fontWeight: 700, color: "#e6edf3", marginTop: 8, marginBottom: 2 }}>{line.slice(2, -2)}</div>;
      }
      const html = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      return <div key={i} style={{ marginBottom: line.trim() ? 2 : 6 }} dangerouslySetInnerHTML={{ __html: html }} />;
    });
}

export default function CircePanel({ state, disabled }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const week = state?.week ?? 0;
  const event = state?.lastEvent;

  function ask() {
    if (loading || disabled) return;
    setText("");
    setLoading(true);
    streamCirce(
      (chunk) => setText(prev => prev + chunk),
      () => setLoading(false),
      (err) => { setText(`Error: ${err}`); setLoading(false); }
    );
  }

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={{ ...s.dot, background: loading ? "#e3b341" : "#3fb950" }} />
        <div>
          <div style={s.title}>CIRCE</div>
          <div style={s.subtitle}>AI Category Agent · claude-sonnet-4-5</div>
        </div>
      </div>

      <div style={s.body}>
        {event && (
          <div style={s.event}>
            ⚡ {event.label}: {event.description}
          </div>
        )}

        {!text && !loading && (
          <div style={s.placeholder}>
            {week === 0
              ? "Advance to Week 1, then ask Circe for recommendations."
              : `Click "Ask Circe" to get Week ${week} strategic recommendations.`
            }
          </div>
        )}

        {loading && !text && <div style={s.thinking}>Circe is analyzing…</div>}

        {text && <div>{renderMarkdown(text)}</div>}
      </div>

      <div style={s.footer}>
        <button
          style={{ ...s.btn, ...(loading || disabled || week === 0 ? s.btnDisabled : {}) }}
          onClick={ask}
          disabled={loading || disabled || week === 0}
        >
          {loading ? "Thinking…" : `Ask Circe — Week ${week}`}
        </button>
      </div>
    </div>
  );
}
