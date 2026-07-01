"use client";

import { ChevronRight, ChevronsRight, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Center transition column between the Preview and Program monitors.
 *  - CUT        → send the whole current scene on air (`sendToProgram`)
 *  - Écran vide → black out the Program monitor (toggle, all sources)
 *  - Verset + / Chapitre +  → bible navigation, shown only when a bible source
 *    is selected.
 */
export function TransitionBar({
  onCut,
  onBlack,
  onNextVerse,
  onNextChapter,
  busy,
  canCut,
  black = false,
  showVerseNav = false,
  canNavigate = false,
}: {
  onCut: () => void;
  onBlack: () => void;
  onNextVerse: () => void;
  onNextChapter: () => void;
  busy: boolean;
  canCut: boolean;
  black?: boolean;
  showVerseNav?: boolean;
  canNavigate?: boolean;
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
          <button
            type="button"
            onClick={onNextVerse}
            disabled={busy || !canNavigate}
            className="flex items-center justify-between gap-1 rounded-[9px] border border-white/10 bg-studio-field px-2 py-2.5 text-[11px] font-bold whitespace-nowrap text-white transition hover:border-gold/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Verset +
            <ChevronRight className="size-3.5 shrink-0 text-gold" strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={onNextChapter}
            disabled={busy || !canNavigate}
            className="flex items-center justify-between gap-1 rounded-[9px] border border-white/10 bg-studio-field px-2 py-2.5 text-[11px] font-bold whitespace-nowrap text-white transition hover:border-gold/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Chapitre +
            <ChevronsRight className="size-3.5 shrink-0 text-gold" strokeWidth={2.2} />
          </button>
        </>
      )}
    </div>
  );
}
