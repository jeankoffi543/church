import {
  StudioLayer,
  Style,
  TypeStyle,
  kindLabel,
  ANIM_EFFECTS,
  ANIM_EASINGS,
  POSITIONS,
} from "../lib/api";

const TEXTUAL = ["text", "song", "bible"];

/** Inspector dock — the selected layer's editable properties, wired to
 * ReplaceLayer. Every edit spreads the full layer so untyped fields survive the
 * round-trip. Covers the fields an operator changes most: content, typography,
 * on-screen position (preset or custom box), entrance animation, colours. */
export function InspectorDock({
  layer,
  onChange,
  onToggleVisible,
}: {
  layer: StudioLayer | null;
  onChange: (l: StudioLayer) => void;
  onToggleVisible: () => void;
}) {
  if (!layer) return <div className="pane"><div className="empty">Sélectionne un calque</div></div>;
  const s = layer.style;
  const upd = (p: Partial<StudioLayer>) => onChange({ ...layer, ...p });
  const updStyle = (p: Partial<Style>) => onChange({ ...layer, style: { ...s, ...p } });
  const updFont = (key: "fontBody" | "fontRef", p: Partial<TypeStyle>) =>
    onChange({ ...layer, style: { ...s, [key]: { ...s[key], ...p } } });

  return (
    <div className="pane insp">
      <div className="insp-head">
        <span className="row-kind">{kindLabel(layer.kind)}</span>
        <input className="insp-name-input" value={layer.name} onChange={(e) => upd({ name: e.target.value })} />
        <button className={`eye ${layer.visible ? "eye-on" : ""}`} onClick={onToggleVisible} title="Visibilité">
          {layer.visible ? "◉" : "○"}
        </button>
      </div>

      {TEXTUAL.includes(layer.kind) && (
        <Section title="Contenu">
          <textarea className="insp-area" rows={3} value={layer.content ?? ""} placeholder="Texte…"
            onChange={(e) => upd({ content: e.target.value })} />
          <input className="insp-text" value={layer.sub ?? ""} placeholder="Sous-titre / référence"
            onChange={(e) => upd({ sub: e.target.value })} />
        </Section>
      )}

      <Section title="Texte">
        <Range label="Taille" min={12} max={200} step={1} value={s.fontBody?.size ?? 48}
          fmt={(v) => `${Math.round(v)}px`} onChange={(v) => updFont("fontBody", { size: v })} />
        <Color label="Couleur" value={s.fontBody?.color ?? "#ffffff"} onChange={(v) => updFont("fontBody", { color: v })} />
        <Color label="Accent" value={s.fontRef?.color ?? "#e2b85f"} onChange={(v) => updFont("fontRef", { color: v })} />
      </Section>

      <Section title="Position">
        <div className="insp-seg">
          {(["predefined", "custom"] as const).map((m) => (
            <button key={m} className={s.positionMode === m ? "on" : ""} onClick={() => updStyle({ positionMode: m })}>
              {m === "predefined" ? "Préréglage" : "Libre"}
            </button>
          ))}
        </div>
        {s.positionMode === "custom" ? (
          <>
            <Range label="X" min={0} max={100} step={1} value={s.customX ?? 0} fmt={pct} onChange={(v) => updStyle({ customX: v })} />
            <Range label="Y" min={0} max={100} step={1} value={s.customY ?? 0} fmt={pct} onChange={(v) => updStyle({ customY: v })} />
            <Range label="Larg." min={5} max={100} step={1} value={s.customWidth ?? 100} fmt={pct} onChange={(v) => updStyle({ customWidth: v })} />
            <Range label="Haut." min={5} max={100} step={1} value={s.customHeight ?? 100} fmt={pct} onChange={(v) => updStyle({ customHeight: v })} />
          </>
        ) : (
          <label className="insp-field">
            <span>Préréglage</span>
            <select value={s.predefinedPosition} onChange={(e) => updStyle({ predefinedPosition: e.target.value })}>
              {POSITIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        )}
      </Section>

      <Section title="Animation d'entrée">
        <label className="insp-field">
          <span>Effet</span>
          <select value={s.animation} onChange={(e) => updStyle({ animation: e.target.value })}>
            {ANIM_EFFECTS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="insp-field">
          <span>Courbe</span>
          <select value={s.animEasing} onChange={(e) => updStyle({ animEasing: e.target.value })}>
            {ANIM_EASINGS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <Range label="Durée" min={0} max={2000} step={50} value={s.animDuration ?? 500}
          fmt={(v) => `${Math.round(v)}ms`} onChange={(v) => updStyle({ animDuration: v })} />
      </Section>

      <Section title="Fond">
        <input className="insp-text" value={s.containerBg ?? ""} placeholder="rgba(…) conteneur"
          onChange={(e) => updStyle({ containerBg: e.target.value })} />
        <input className="insp-text" value={s.background ?? ""} placeholder="Fond (nom / couleur)"
          onChange={(e) => updStyle({ background: e.target.value })} />
      </Section>
    </div>
  );
}

const pct = (v: number) => `${Math.round(v)}%`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="insp-section">
      <div className="insp-group">{title}</div>
      {children}
    </div>
  );
}

function Range({ label, min, max, step, value, fmt, onChange }: {
  label: string; min: number; max: number; step: number; value: number;
  fmt: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <label className="insp-field">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="insp-val">{fmt(value)}</span>
    </label>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hex = value.startsWith("#") ? value : "#ffffff";
  return (
    <label className="insp-field">
      <span>{label}</span>
      <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} />
      <span className="insp-val">{value.startsWith("#") ? value : "—"}</span>
    </label>
  );
}
