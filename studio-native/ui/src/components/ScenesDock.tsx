import { StudioDoc } from "../lib/api";

/** Scene list: select the scene you're editing, add a new one. Wired to the
 * store's SelectScene/AddScene commands. */
export function ScenesDock({
  doc,
  onSelect,
  onAdd,
}: {
  doc: StudioDoc | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="pane">
      <div className="pane-actions">
        <button className="chip" onClick={onAdd}>
          ＋ Scène
        </button>
      </div>
      <ul className="list">
        {doc?.scenes.map((s) => (
          <li
            key={s.id}
            className={`row ${s.id === doc.currentSceneId ? "row-on" : ""}`}
            onClick={() => onSelect(s.id)}
          >
            <span className="row-name">{s.name}</span>
            <span className="row-meta">{s.layers.length}</span>
          </li>
        ))}
        {!doc?.scenes.length && <li className="empty">Aucune scène</li>}
      </ul>
    </div>
  );
}
