"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Center transition column between the Preview and Program monitors.
 *  - CUT        → send the whole current scene on air (`sendToProgram`)
 *  - Écran vide → black out the Program monitor (toggle, all sources)
 *  - `[<] Verset [>]` / `[<] Chapitre [>]` → bible navigation, shown while the
 *    scene has a VISIBLE bible source (whatever layer is selected); each arrow
 *    is disabled when the bible has no verse/chapter in that direction.
 */
/** One symmetric navigation row: `[<] label [>]` with per-direction disabling. */
function NavRow({
  label,
  PrevIcon,
  NextIcon,
  onPrev,
  onNext,
  canPrev,
  canNext,
  disabled,
}: {
  label: string;
  PrevIcon: typeof ChevronLeft;
  NextIcon: typeof ChevronLeft;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  disabled: boolean;
}) {
  const arrow =
    "flex w-[30px] shrink-0 items-center justify-center rounded-[9px] border border-white/10 bg-studio-field py-2.5 transition hover:border-gold/50 disabled:cursor-not-allowed disabled:opacity-35";
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onPrev}
        disabled={disabled || !canPrev}
        title={`${label} précédent`}
        className={arrow}
      >
        <PrevIcon className="size-3.5 shrink-0 text-gold" strokeWidth={2.2} />
      </button>
      <span className="flex-1 text-center text-[11px] font-bold whitespace-nowrap text-white">
        {label}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={disabled || !canNext}
        title={`${label} suivant`}
        className={arrow}
      >
        <NextIcon className="size-3.5 shrink-0 text-gold" strokeWidth={2.2} />
      </button>
    </div>
  );
}

export function TransitionBar({
  onCut,
  onBlack,
  onPrevVerse,
  onNextVerse,
  onPrevChapter,
  onNextChapter,
  busy,
  canCut,
  black = false,
  showVerseNav = false,
  canNavigate = false,
  canPrevVerse = true,
  canNextVerse = true,
  canPrevChapter = true,
  canNextChapter = true,
}: {
  onCut: () => void;
  onBlack: () => void;
  onPrevVerse: () => void;
  onNextVerse: () => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  busy: boolean;
  canCut: boolean;
  black?: boolean;
  showVerseNav?: boolean;
  canNavigate?: boolean;
  canPrevVerse?: boolean;
  canNextVerse?: boolean;
  canPrevChapter?: boolean;
  canNextChapter?: boolean;
}) {
  return (
    <div className="flex w-[124px] flex-col justify-center gap-2.5 rounded-2xl border border-white/6 bg-black/40 px-3 py-3.5">
      <button
        type="button"
        onClick={onCut}
        disabled={busy || !canCut}
        className="flex flex-col items-center gap-1.5 rounded-xl border border-[rgba(255,120,120,.5)] bg-gradient-to-b from-studio-onair to-[#c81e1e] px-2 py-3.5 text-white shadow-[0_8px_22px_rgba(239,68,68,.35)] transition hover:brightness-110 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronsRight className="size-[26px]" strokeWidth={2.4} />
        <span className="text-[13px] font-extrabold tracking-[1px]">CUT</span>
        <span className="text-[8.5px] font-bold tracking-[1px] text-white/70">ENVOYER ANTENNE</span>
      </button>

      <button
        type="button"
        onClick={onBlack}
        disabled={busy}
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-[10px] border px-2 py-2.5 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
          black
            ? "border-studio-onair/50 bg-studio-onair/20 text-[#ff9a9a]"
            : "border-white/12 bg-white/4 text-white hover:bg-white/6",
        )}
      >
        <EyeOff className="size-[15px]" />
        {black ? "À L'ANTENNE" : "ÉCRAN VIDE"}
      </button>

      {showVerseNav && (
        <>
          <div className="my-px h-px bg-white/7" />
          <NavRow
            label="Verset"
            PrevIcon={ChevronLeft}
            NextIcon={ChevronRight}
            onPrev={onPrevVerse}
            onNext={onNextVerse}
            canPrev={canPrevVerse}
            canNext={canNextVerse}
            disabled={busy || !canNavigate}
          />
          <NavRow
            label="Chapitre"
            PrevIcon={ChevronsLeft}
            NextIcon={ChevronsRight}
            onPrev={onPrevChapter}
            onNext={onNextChapter}
            canPrev={canPrevChapter}
            canNext={canNextChapter}
            disabled={busy || !canNavigate}
          />
        </>
      )}
    </div>
  );
}
