import { useEffect, useState, type CSSProperties } from "react";
import { App } from "./App";
import { ActivationScreen } from "./components/ActivationScreen";
import { activationStatus, heartbeat, type StudioSession } from "./lib/activation";

// Re-check the activation (subscription lapse / key revocation) every 5 minutes.
const HEARTBEAT_MS = 5 * 60 * 1000;

/**
 * CHR-143 — activation gate. The studio only renders once this poste holds a
 * valid Studio Live session; otherwise the key-entry screen is shown. A
 * heartbeat keeps the session fresh and drops back to the gate if it lapses.
 */
export function Root() {
  const [checked, setChecked] = useState(false);
  const [session, setSession] = useState<StudioSession | null>(null);

  // Restore any stored activation on launch.
  useEffect(() => {
    activationStatus()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setChecked(true));
  }, []);

  // Keep the session alive while activated; a rejected heartbeat = back to the gate.
  const activated = session !== null;
  useEffect(() => {
    if (!activated) return;
    const id = setInterval(() => {
      heartbeat()
        .then(setSession)
        .catch(() => setSession(null));
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [activated]);

  if (!checked) {
    return <div style={splash}>Vérification de l'activation…</div>;
  }

  if (!session) {
    return <ActivationScreen onActivated={setSession} />;
  }

  return <App />;
}

const splash: CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "grid",
  placeItems: "center",
  background: "#0b0f1a",
  color: "#9aa4ba",
  fontFamily: "system-ui, sans-serif",
  fontSize: 14,
};
