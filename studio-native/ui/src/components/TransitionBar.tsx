/** The bar between the two monitors: the CUT to program + the fade-to-black
 * transition (CHR-113). `black` reflects the domain's `program.black`. */
export function TransitionBar({
  black,
  fadeMs,
  onFadeMs,
  onToggleBlack,
  onCut,
  busy,
}: {
  black: boolean;
  fadeMs: number;
  onFadeMs: (ms: number) => void;
  onToggleBlack: () => void;
  onCut: () => void;
  busy?: boolean;
}) {
  return (
    <div className="transition-bar">
      <button className="cut-btn" onClick={onCut} disabled={busy} title="Envoyer l'aperçu au programme">
        CUT
      </button>
      <button
        className="btn"
        data-black={black ? "1" : "0"}
        onClick={onToggleBlack}
        disabled={busy}
      >
        {black ? "☀ Rétablir" : "⬛ Fondu au noir"}
      </button>
      <label className="fade-field">
        Fondu
        <input
          type="range"
          min={0}
          max={2000}
          step={100}
          value={fadeMs}
          onChange={(e) => onFadeMs(Number(e.target.value))}
        />
        <span className="fade-ms">{fadeMs} ms</span>
      </label>
    </div>
  );
}
