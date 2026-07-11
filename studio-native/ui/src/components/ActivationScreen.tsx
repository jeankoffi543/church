import { useState, type CSSProperties, type FormEvent } from "react";
import { activate, type StudioSession } from "../lib/activation";

const DEFAULT_BASE = "https://app.churchapp.io";

/**
 * CHR-143 — the gate shown until the studio is activated. Collects the platform
 * URL + the church's `chr_live_*` key and exchanges them for a session.
 */
export function ActivationScreen({ onActivated }: { onActivated: (s: StudioSession) => void }) {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await activate(baseUrl.trim(), key.trim());
      onActivated(session);
    } catch (err) {
      setError(typeof err === "string" ? err : "Activation impossible. Vérifiez la clé et la connexion.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.screen}>
      <form style={styles.card} onSubmit={submit}>
        <div style={styles.brand}>Studio Live</div>
        <h1 style={styles.title}>Activer ce poste</h1>
        <p style={styles.sub}>
          Saisissez la clé d'activation <code style={styles.code}>chr_live_…</code> fournie à votre église.
        </p>

        <label style={styles.label}>
          Plateforme
          <input
            style={styles.input}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            placeholder="https://app.churchapp.io"
          />
        </label>

        <label style={styles.label}>
          Clé d'activation
          <input
            style={styles.input}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoFocus
            placeholder="chr_live_xxxxxxxxxxxx"
          />
        </label>

        {error && <div style={styles.error}>{error}</div>}

        <button type="submit" style={{ ...styles.button, opacity: busy || !key ? 0.6 : 1 }} disabled={busy || !key}>
          {busy ? "Activation…" : "Activer le studio"}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  screen: {
    position: "fixed",
    inset: 0,
    display: "grid",
    placeItems: "center",
    background: "radial-gradient(120% 120% at 50% 0%, #16203a 0%, #0b0f1a 60%)",
    color: "#e7ecf6",
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  card: {
    width: "min(420px, 92vw)",
    background: "#121826",
    border: "1px solid #263149",
    borderRadius: 16,
    padding: "28px 26px",
    boxShadow: "0 24px 60px -20px rgba(0,0,0,.6)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  brand: {
    fontFamily: "ui-monospace, monospace",
    fontSize: 12,
    letterSpacing: ".18em",
    textTransform: "uppercase",
    color: "#35c6d3",
    fontWeight: 700,
  },
  title: { margin: "2px 0 0", fontSize: 22, fontWeight: 800, letterSpacing: "-.01em" },
  sub: { margin: 0, fontSize: 13.5, color: "#9aa4ba", lineHeight: 1.5 },
  code: { fontFamily: "ui-monospace, monospace", color: "#dfa94f" },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "#9aa4ba", marginTop: 6 },
  input: {
    background: "#0d1220",
    border: "1px solid #2a3346",
    borderRadius: 9,
    padding: "10px 12px",
    color: "#e7ecf6",
    fontSize: 14,
    fontFamily: "ui-monospace, monospace",
    outline: "none",
  },
  error: {
    background: "rgba(229,103,92,.12)",
    border: "1px solid #e5675c",
    color: "#f2b4ae",
    borderRadius: 8,
    padding: "9px 11px",
    fontSize: 13,
  },
  button: {
    marginTop: 8,
    background: "#0c8794",
    border: "none",
    borderRadius: 10,
    padding: "12px 14px",
    color: "#fff",
    fontSize: 14.5,
    fontWeight: 700,
    cursor: "pointer",
  },
};
