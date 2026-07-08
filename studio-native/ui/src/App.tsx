import { useCallback, useEffect, useRef, useState } from "react";
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

/** The layer's position/size as fractions (0..1) of the programme canvas —
 * resolution-independent, so it survives the webview resizing without any
 * recalculation: the overlay is rendered in CSS `%`, which the browser keeps in
 * sync with `.monitor`'s actual size on every resize for free. */
type LayerTransform = { x: number; y: number; w: number; h: number };
const FULL_LAYER: LayerTransform = { x: 0, y: 0, w: 1, h: 1 };
const MIN_FRACTION = 0.08;

function clampLayer(t: LayerTransform): LayerTransform {
  const w = Math.min(1, Math.max(MIN_FRACTION, t.w));
  const h = Math.min(1, Math.max(MIN_FRACTION, t.h));
  const x = Math.min(1 - w, Math.max(0, t.x));
  const y = Math.min(1 - h, Math.max(0, t.y));
  return { x, y, w, h };
}

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
  const [layer, setLayer] = useState<LayerTransform>(FULL_LAYER);
  const monitorRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef({ w: 1920, h: 1080 });
  const dragRef = useRef<{
    mode: "move" | "resize";
    startX: number;
    startY: number;
    startLayer: LayerTransform;
  } | null>(null);

  useEffect(() => {
    invoke<Capabilities>("get_capabilities")
      .then(setCaps)
      .catch((e) => setError(String(e)));
    invoke<[number, number]>("canvas_size")
      .then(([w, h]) => {
        canvasRef.current = { w, h };
      })
      .catch(() => {});
  }, []);

  // Push the layer's fractional transform to the engine, in canvas pixels — the
  // pad's `xpos`/`ypos`/`width`/`height` GObject properties, applied live while
  // the pipeline runs (see `MediaEngine::set_layer_transform`).
  const pushTransform = useCallback((t: LayerTransform) => {
    const { w: cw, h: ch } = canvasRef.current;
    invoke("set_layer_transform", {
      xpos: Math.round(t.x * cw),
      ypos: Math.round(t.y * ch),
      width: Math.round(t.w * cw),
      height: Math.round(t.h * ch),
    }).catch((e) => setError(String(e)));
  }, []);

  const beginDrag = useCallback(
    (mode: "move" | "resize") => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = { mode, startX: e.clientX, startY: e.clientY, startLayer: layer };
      const onMove = (ev: PointerEvent) => {
        const drag = dragRef.current;
        const rect = monitorRef.current?.getBoundingClientRect();
        if (!drag || !rect) return;
        const dx = (ev.clientX - drag.startX) / rect.width;
        const dy = (ev.clientY - drag.startY) / rect.height;
        const next =
          drag.mode === "move"
            ? { ...drag.startLayer, x: drag.startLayer.x + dx, y: drag.startLayer.y + dy }
            : {
                ...drag.startLayer,
                w: drag.startLayer.w + dx,
                h: drag.startLayer.h + dy,
              };
        const clamped = clampLayer(next);
        setLayer(clamped);
        pushTransform(clamped);
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [layer, pushTransform],
  );

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
          <h1>Moteur média (CHR-103)</h1>
          <p className="muted">
            Compositeur GStreamer 1080p60, piloté par une boucle glib sur son
            propre thread. Déplacez/redimensionnez le calque : le pad du
            compositor bouge en direct, pipeline en <code>PLAYING</code>.
          </p>

          <div className="monitor" ref={monitorRef}>
            {preview ? (
              <img src={preview} alt="Aperçu programme" />
            ) : (
              <span className="monitor-empty">Aperçu arrêté</span>
            )}
            {media?.running && (
              <div
                className="layer-box"
                style={{
                  left: `${layer.x * 100}%`,
                  top: `${layer.y * 100}%`,
                  width: `${layer.w * 100}%`,
                  height: `${layer.h * 100}%`,
                }}
                onPointerDown={beginDrag("move")}
              >
                <div className="layer-handle" onPointerDown={beginDrag("resize")} />
              </div>
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
