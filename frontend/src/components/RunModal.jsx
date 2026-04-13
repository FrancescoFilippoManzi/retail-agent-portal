import React, { useState, useRef, useEffect } from "react";
import { runAllWithCirce } from "../api.js";
import { STRATEGIES } from "./RunStrategySidebar.jsx";

const SEASON_COLOR = { Winter: "#58a6ff", Spring: "#3fb950", Summer: "#e3b341", Fall: "#f0883e" };

const s = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center"
  },
  modal: {
    background: "#161b22", border: "1px solid #30363d", borderRadius: 12,
    width: 620, maxHeight: "85vh", display: "flex", flexDirection: "column",
    boxShadow: "0 24px 80px rgba(0,0,0,0.6)"
  },
  header: { padding: "18px 24px 12px", borderBottom: "1px solid #21262d" },
  title: { fontSize: 16, fontWeight: 800, color: "#e6edf3", marginBottom: 4 },
  subtitle: { fontSize: 12, color: "#8b949e" },
  progressWrap: { padding: "16px 24px 0" },
  progressBar: { height: 6, background: "#21262d", borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  progressFill: { height: "100%", borderRadius: 3, transition: "width 0.4s ease", background: "linear-gradient(90deg, #1f6feb, #6e40c9)" },
  progressLabel: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8b949e" },
  log: { flex: 1, overflowY: "auto", padding: "12px 24px", minHeight: 0 },
  logEntry: { display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8, fontSize: 12 },
  weekBadge: { flexShrink: 0, width: 52, textAlign: "center", borderRadius: 4, padding: "2px 0", fontWeight: 700, fontSize: 11 },
  logText: { color: "#c9d1d9", lineHeight: 1.5, flex: 1 },
  logMeta: { flexShrink: 0, textAlign: "right", color: "#8b949e", fontSize: 11 },
  footer: { padding: "14px 24px", borderTop: "1px solid #21262d", display: "flex", gap: 10, alignItems: "center" },
  doneBtn: {
    flex: 1, padding: "9px 0", background: "#238636", border: "none", borderRadius: 6,
    color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer"
  },
  cancelBtn: {
    padding: "9px 18px", background: "transparent", border: "1px solid #30363d",
    borderRadius: 6, color: "#8b949e", fontSize: 13, cursor: "pointer"
  },
  statusRow: { fontSize: 12, color: "#8b949e", flex: 1 },
  errorMsg: { color: "#f85149", fontSize: 13 }
};

export default function RunModal({ onClose, onComplete, strategy = "balanced" }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(0);
  const esRef = useRef(null);
  const logRef = useRef(null);

  useEffect(() => {
    start();
    return () => esRef.current?.close();
  }, []);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [entries]);

  function start() {
    setRunning(true);
    setDone(false);
    setError("");
    setEntries([]);
    setCurrentWeek(0);

    esRef.current = runAllWithCirce(
      (msg) => {
        setCurrentWeek(msg.week);
        setEntries(prev => [...prev, msg]);
      },
      () => {
        setRunning(false);
        setDone(true);
        onComplete();
      },
      (err) => {
        setRunning(false);
        setError(err);
      },
      strategy
    );
  }

  const pct = Math.round((currentWeek / 52) * 100);

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <div style={s.title}>
            ✦ FY 2026 — Running 52 weeks with Circe
            {(() => {
              const strat = STRATEGIES.find(s => s.id === strategy);
              return strat ? (
                <span style={{ marginLeft: 10, fontSize: 11, padding: "2px 8px", borderRadius: 10,
                  background: strat.bg, color: strat.color, border: `1px solid ${strat.border}`, fontWeight: 600 }}>
                  {strat.icon} {strat.label}
                </span>
              ) : null;
            })()}
          </div>
          <div style={s.subtitle}>
            {done ? "FY 2026 simulation complete — Circe managed all 52 weeks." :
             running ? `Week ${currentWeek} of 52 — Circe is advising…` :
             error ? "Stopped due to error." : "Starting…"}
          </div>
        </div>

        <div style={s.progressWrap}>
          <div style={s.progressBar}>
            <div style={{ ...s.progressFill, width: `${pct}%` }} />
          </div>
          <div style={s.progressLabel}>
            <span>{currentWeek} / 52 weeks</span>
            <span>{pct}%</span>
          </div>
        </div>

        <div style={s.log} ref={logRef}>
          {entries.map((e, i) => (
            <div key={i} style={s.logEntry}>
              <div style={{
                ...s.weekBadge,
                background: SEASON_COLOR[e.season] + "22",
                color: SEASON_COLOR[e.season],
                border: `1px solid ${SEASON_COLOR[e.season]}44`
              }}>
                Wk {e.week}
                {e.event && <div style={{ fontSize: 9, marginTop: 1 }}>⚡</div>}
              </div>
              <div style={s.logText}>
                <span style={{ color: "#bf91f3" }}>Circe: </span>
                {e.rationale}
                {e.event && <span style={{ color: "#e3b341", marginLeft: 6 }}>— {e.event}</span>}
              </div>
              <div style={s.logMeta}>
                ${e.weekRevenue?.toLocaleString(undefined, { maximumFractionDigits: 0 })}<br />
                <span style={{ color: e.weekMarginPct >= 30 ? "#3fb950" : "#8b949e" }}>
                  {e.weekMarginPct?.toFixed(1)}% mgn
                </span>
              </div>
            </div>
          ))}
          {running && (
            <div style={{ color: "#8b949e", fontSize: 12, padding: "4px 0" }}>
              <span style={{ animation: "pulse 1s infinite" }}>⏳</span> Circe is analyzing week {currentWeek + 1}…
            </div>
          )}
        </div>

        <div style={s.footer}>
          {error && <div style={s.errorMsg}>⚠ {error}</div>}
          {!error && !done && <div style={s.statusRow}>{running ? `Processing week ${currentWeek + 1}…` : ""}</div>}
          {!error && done && (
            <div style={{ ...s.statusRow, color: "#3fb950" }}>
              ✓ All 52 weeks complete — {entries.reduce((s, e) => s + (e.weekRevenue ?? 0), 0).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })} cumulative revenue
            </div>
          )}
          {done && (
            <button style={s.doneBtn} onClick={onClose}>
              View Results →
            </button>
          )}
          {!done && (
            <button style={s.cancelBtn} onClick={() => { esRef.current?.close(); onClose(); }}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
