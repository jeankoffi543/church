import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

/** Mirror of the Rust `CapabilitiesDto` — the module-agnostic UI contract. */
type Capabilities = {
  sources: string[];
  outputs: string[];
  encoders: string[];
};

/** French labels for known source kinds. Unknown kinds still render (by id), so a
 *  future module the frontend has never heard of still shows up — the negotiation
 *  is data-driven, not hardcoded. */
const SOURCE_LABELS: Record<string, string> = {
  bible: "Bible",
  text: "Texte",
  song: "Chant",
  image: "Image / Fond",
  camera: "Caméra / Capture",
  screen: "Capture d'écran",
  video: "Vidéo",
  embed: "Direct externe",
  audio: "Audio",
  group: "Groupe",
};

export function App() {
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<Capabilities>("get_capabilities")
      .then(setCaps)
      .catch((e) => setError(String(e)));
  }, []);

  const hasMedia = !!caps && caps.sources.length + caps.outputs.length > 0;

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">STUDIO&nbsp;NATIVE</span>
        <span className="tag">Tauri · Rust · gstreamer-rs</span>
      </header>

      <main className="stage">
        <section className="panel">
          <h1>Négociation des capacités</h1>
          <p className="muted">
            L&apos;interface se construit à partir de ce que le backend annonce —
            aucun module n&apos;est câblé en dur. Retirez un module, il
            disparaît d&apos;ici.
          </p>

          {error && (
            <div className="banner err">
              IPC indisponible : {error}
              <div className="hint">
                (normal hors du webview Tauri — lancez via <code>pnpm tauri dev</code>)
              </div>
            </div>
          )}

          {!error && !caps && <div className="banner">Interrogation du backend…</div>}

          {caps && (
            <>
              <div className="row">
                <span className="k">Sources</span>
                <span className="v">{caps.sources.length}</span>
              </div>
              <div className="row">
                <span className="k">Sorties</span>
                <span className="v">{caps.outputs.length}</span>
              </div>
              <div className="row">
                <span className="k">Encodeurs</span>
                <span className="v">{caps.encoders.length}</span>
              </div>

              {!hasMedia ? (
                <div className="banner empty">
                  Aucun module média chargé (CHR-101). L&apos;app tourne : c&apos;est
                  la garantie modulaire à vide. Les modules CHR-102+ apparaîtront
                  ici automatiquement.
                </div>
              ) : (
                <ul className="chips">
                  {caps.sources.map((s) => (
                    <li key={s} className="chip">
                      + {SOURCE_LABELS[s] ?? s}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
