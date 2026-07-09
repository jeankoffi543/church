import { Capabilities, CameraDevice, StudioDoc, kindLabel } from "../lib/api";

const OVERLAY_KINDS = ["text", "bible", "song"];

/** Sources dock: live device toggles (screen / camera) plus the current scene's
 * layer stack — select a layer (drives the inspector), toggle its visibility,
 * or add an overlay layer. */
export function SourcesDock({
  doc,
  caps,
  cameras,
  cameraId,
  onCameraId,
  screenActive,
  cameraActive,
  selectedId,
  onToggleScreen,
  onToggleCamera,
  onAddOverlay,
  onSelectLayer,
  onToggleVisible,
}: {
  doc: StudioDoc | null;
  caps: Capabilities | null;
  cameras: CameraDevice[];
  cameraId: string;
  onCameraId: (id: string) => void;
  screenActive: boolean;
  cameraActive: boolean;
  selectedId: string | null;
  onToggleScreen: () => void;
  onToggleCamera: () => void;
  onAddOverlay: (kind: string) => void;
  onSelectLayer: (id: string) => void;
  onToggleVisible: (id: string) => void;
}) {
  const scene = doc?.scenes.find((s) => s.id === doc.currentSceneId);
  const overlayKinds = OVERLAY_KINDS.filter((k) => caps?.sources.includes(k));

  return (
    <div className="pane">
      {caps?.sources.includes("screen") && (
        <button className={`src-toggle ${screenActive ? "on" : ""}`} onClick={onToggleScreen}>
          <span>🖥 Écran</span>
          <span className="src-state">{screenActive ? "actif" : "démarrer"}</span>
        </button>
      )}
      {caps?.sources.includes("camera") && (
        <div className="src-camera">
          <button className={`src-toggle ${cameraActive ? "on" : ""}`} onClick={onToggleCamera}>
            <span>🎥 Caméra</span>
            <span className="src-state">{cameraActive ? "active" : "démarrer"}</span>
          </button>
          {cameras.length > 0 && (
            <select value={cameraId} disabled={cameraActive} onChange={(e) => onCameraId(e.target.value)}>
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {overlayKinds.length > 0 && (
        <div className="pane-actions">
          {overlayKinds.map((k) => (
            <button key={k} className="chip" onClick={() => onAddOverlay(k)}>
              ＋ {kindLabel(k)}
            </button>
          ))}
        </div>
      )}

      <ul className="list">
        {scene?.layers.map((l) => (
          <li
            key={l.id}
            className={`row ${l.id === selectedId ? "row-sel" : ""}`}
            onClick={() => onSelectLayer(l.id)}
          >
            <span className="row-kind">{kindLabel(l.kind)}</span>
            <span className="row-name">{l.name}</span>
            <button
              className={`eye ${l.visible ? "eye-on" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisible(l.id);
              }}
              title={l.visible ? "Masquer" : "Afficher"}
            >
              {l.visible ? "◉" : "○"}
            </button>
          </li>
        ))}
        {!scene?.layers.length && <li className="empty">Scène vide</li>}
      </ul>
    </div>
  );
}
