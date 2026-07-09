import { StudioLayer, kindLabel } from "../lib/api";

export type Transform = { x: number; y: number; w: number; h: number };

/** Inspector dock — the selected layer's properties. This is the SHELL version
 * (identity + visibility + position/size). The web inspector's deep style panel
 * (fonts, shadows, animation presets) is a later pass. Transform values are
 * fractions (0..1) of the programme canvas. */
export function InspectorDock({
  layer,
  transform,
  onTransform,
  onToggleVisible,
}: {
  layer: StudioLayer | null;
  transform: Transform;
  onTransform: (t: Transform) => void;
  onToggleVisible: () => void;
}) {
  if (!layer) {
    return (
      <div className="pane">
        <div className="empty">Sélectionne un calque</div>
      </div>
    );
  }
  const field = (key: keyof Transform, label: string) => (
    <label className="insp-field">
      <span>{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={transform[key]}
        onChange={(e) => onTransform({ ...transform, [key]: Number(e.target.value) })}
      />
      <span className="insp-val">{Math.round(transform[key] * 100)}%</span>
    </label>
  );
  return (
    <div className="pane insp">
      <div className="insp-head">
        <span className="row-kind">{kindLabel(layer.kind)}</span>
        <span className="insp-name">{layer.name}</span>
        <button
          className={`eye ${layer.visible ? "eye-on" : ""}`}
          onClick={onToggleVisible}
          title={layer.visible ? "Masquer" : "Afficher"}
        >
          {layer.visible ? "◉" : "○"}
        </button>
      </div>
      <div className="insp-group">Position / Taille</div>
      {field("x", "X")}
      {field("y", "Y")}
      {field("w", "Largeur")}
      {field("h", "Hauteur")}
    </div>
  );
}
