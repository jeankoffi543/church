export type MixChannel = { id: string; gain: number; muted: boolean; balance: number };

/** Audio mixer dock: per-channel fader / mute / balance + a live VU bar fed by
 * the `level` elements (CHR-107). `levels` maps channel id → 0..1 meter value. */
export function MixerDock({
  audioOn,
  channels,
  levels,
  onToggleAudio,
  onAddTone,
  onChange,
}: {
  audioOn: boolean;
  channels: MixChannel[];
  levels: Record<string, number>;
  onToggleAudio: () => void;
  onAddTone: () => void;
  onChange: (ch: MixChannel) => void;
}) {
  return (
    <div className="pane">
      <div className="pane-actions">
        <button className={`chip ${audioOn ? "chip-on" : ""}`} onClick={onToggleAudio}>
          {audioOn ? "◼ Audio" : "▶ Audio"}
        </button>
        {audioOn && (
          <button className="chip" onClick={onAddTone}>
            ＋ Tone
          </button>
        )}
      </div>
      {audioOn ? (
        <div className="mixer-strips">
          {channels.map((ch) => {
            const level = Math.max(0, Math.min(1, levels[ch.id] ?? 0));
            return (
              <div className="strip" key={ch.id}>
                <div className="strip-name">{ch.id}</div>
                <div className="strip-meter">
                  <div className="strip-meter-fill" style={{ height: `${level * 100}%` }} />
                </div>
                <input
                  className="strip-fader"
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.01}
                  value={ch.gain}
                  onChange={(e) => onChange({ ...ch, gain: Number(e.target.value) })}
                />
                <input
                  className="strip-bal"
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={ch.balance}
                  onChange={(e) => onChange({ ...ch, balance: Number(e.target.value) })}
                  title="Balance G/D"
                />
                <button
                  className={`strip-mute ${ch.muted ? "on" : ""}`}
                  onClick={() => onChange({ ...ch, muted: !ch.muted })}
                >
                  M
                </button>
              </div>
            );
          })}
          {!channels.length && <div className="empty">Aucune voie</div>}
        </div>
      ) : (
        <div className="empty">Mixage arrêté</div>
      )}
    </div>
  );
}
