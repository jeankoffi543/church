import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

/** Mirror of the Rust `CapabilitiesDto` — the module-agnostic UI contract. */
type Capabilities = {
  sources: string[];
  outputs: string[];
  encoders: string[];
};

/** Mirror of the Rust `MediaStatus`. */
type MediaStatus = {
  running: boolean;
  frames: number;
};

/** French labels for known source kinds. Unknown ids still render (by id). */
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
  const [media, setMedia] = useState<MediaStatus | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    invoke<Capabilities>("get_capabilities")
      .then(setCaps)
      .catch((e) => setError(String(e)));
  }, []);

  // Poll status (slow) + the live preview frame (fast) while the engine runs.
  useEffect(() => {
    const status = setInterval(() => {
      invoke<MediaStatus>("media_status")
        .then(setMedia)
        .catch(() => {});
    }, 500);
    const frame = setInterval(() => {
      invoke<string | null>("preview_frame")
        .then((url) => url && setPreview(url))
        .catch(() => {});
    }, 120);
    return () => {
      clearInterval(status);
      clearInterval(frame);
    };
  }, []);

  const hasMedia =
    !!caps && caps.sources.length + caps.outputs.length + caps.encoders.length > 0;

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
            aucun module n&apos;est câblé en dur. Retirez un module, il disparaît
            d&apos;ici.
          </p>

          {error && (
            <div className="banner err">
              IPC indisponible : {error}
              <div className="hint">
                (normal hors du webview Tauri — lancez via <code>cargo tauri dev</code>)
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

              {caps.encoders.length > 0 && (
                <ul className="chips">
                  {caps.encoders.map((e) => (
                    <li key={e} className="chip">
                      {e}
                    </li>
                  ))}
                </ul>
              )}

              {caps.sources.length > 0 && (
                <ul className="chips">
                  {caps.sources.map((s) => (
                    <li key={s} className="chip">
                      + {SOURCE_LABELS[s] ?? s}
                    </li>
                  ))}
                </ul>
              )}

              {!hasMedia && (
                <div className="banner empty">
                  Aucun module média chargé. L&apos;app tourne : garantie modulaire à
                  vide. Les modules apparaîtront ici automatiquement.
                </div>
              )}
            </>
          )}
        </section>

        <section className="panel">
          <h1>Moteur média (CHR-102)</h1>
          <p className="muted">
            Compositeur GStreamer piloté par une boucle glib sur son propre thread.
          </p>

          <div className="monitor">
            {preview ? (
              <img src={preview} alt="Aperçu programme" />
            ) : (
              <span className="monitor-empty">Aperçu arrêté</span>
            )}
          </div>

          <div className="preview">
            <div className="dot" data-on={media?.running ? "1" : "0"} />
            <span>{media?.running ? "En cours" : "Arrêté"}</span>
            <span className="frames">{media?.frames ?? 0} frames</span>
          </div>

          <div className="btnrow">
            <button
              className="btn"
              onClick={() => invoke("start_preview").catch((e) => setError(String(e)))}
            >
              Démarrer l&apos;aperçu
            </button>
            <button
              className="btn ghost"
              onClick={() => invoke("stop_preview").catch(() => {})}
            >
              Arrêter
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
