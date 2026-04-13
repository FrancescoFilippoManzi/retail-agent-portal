import React, { useState } from "react";

// Hardcoded users — extend this array to add more
const USERS = [
  { email: "wei.song1020@gmail.com", password: "AmiciConGusto2026" },
  { email: "francescofilippomanzi@gmail.com", password: "AmiciConGusto2026" }
];

export function checkCredentials(email, password) {
  return USERS.some(
    u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
  );
}

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTimeout(() => {
      if (checkCredentials(email, password)) {
        localStorage.setItem("circe_auth", "true");
        localStorage.setItem("circe_user", email.trim().toLowerCase());
        onLogin(email.trim().toLowerCase());
      } else {
        setError("Invalid email or password.");
      }
      setLoading(false);
    }, 400);
  }

  return (
    <div style={{
      height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0d1117", flexDirection: "column", gap: 32
    }}>
      {/* Logo */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 38, fontWeight: 900, color: "#e31837", letterSpacing: "0.18em" }}>CIRCE</div>
        <div style={{ fontSize: 13, color: "#8b949e", marginTop: 4 }}>
          FY 2026 Category Simulation · Paper Goods · Dallas/Uptown
        </div>
      </div>

      {/* Card */}
      <form onSubmit={handleSubmit} style={{
        background: "#161b22", border: "1px solid #30363d", borderRadius: 12,
        padding: "32px 36px", width: 360, boxShadow: "0 16px 48px rgba(0,0,0,0.4)"
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#e6edf3", marginBottom: 22 }}>
          Sign in to continue
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: "#8b949e", display: "block", marginBottom: 6 }}>Email</label>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6,
              color: "#e6edf3", padding: "9px 12px", fontSize: 14, outline: "none",
              boxSizing: "border-box"
            }}
            onFocus={e => e.target.style.borderColor = "#1f6feb"}
            onBlur={e => e.target.style.borderColor = "#30363d"}
            placeholder="you@example.com"
          />
        </div>

        <div style={{ marginBottom: 22 }}>
          <label style={{ fontSize: 12, color: "#8b949e", display: "block", marginBottom: 6 }}>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6,
              color: "#e6edf3", padding: "9px 12px", fontSize: 14, outline: "none",
              boxSizing: "border-box"
            }}
            onFocus={e => e.target.style.borderColor = "#1f6feb"}
            onBlur={e => e.target.style.borderColor = "#30363d"}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div style={{ fontSize: 12, color: "#f85149", background: "#2a0d0d", border: "1px solid #f8514933", borderRadius: 6, padding: "8px 12px", marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%", padding: "10px 0", background: loading ? "#21262d" : "#1f6feb",
            border: "none", borderRadius: 6, color: "#fff", fontSize: 14, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div style={{ fontSize: 11, color: "#484f58" }}>
        Kroger Category Management · Confidential
      </div>
    </div>
  );
}
