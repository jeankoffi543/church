"use client";

import { useState } from "react";
import { BookOpen, Headphones, FileText, CalendarDays, Clock, User } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SermonMediaType } from "@/lib/data";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CustomVideoPlayer } from "@/components/media/custom-video-player";
import { useAudioPlayer } from "@/components/audio/audio-player";
import { BrandButton } from "@/components/ui/brand-button";

export type ReaderSermon = {
  id?: number | null;
  title: string;
  speaker?: string | null;
  serie?: string | null;
  date?: string | null;
  duration?: string | null;
  description?: string | null;
  mediaType: SermonMediaType | null;
  mediaSrc: string | null;
  background?: string | null;
  scriptures?: string[];
};

const isAudioType = (t: SermonMediaType | null) => Boolean(t?.startsWith("audio_"));
const isVideoType = (t: SermonMediaType | null) => Boolean(t && !isAudioType(t));

/**
 * Full sermon reader — plays the message in place (video / audio / notes) and
 * presents the complete description inside a bounded, scrollable block so a long
 * text never stretches the layout.
 */
export function SermonReaderDialog({
  open,
  onOpenChange,
  sermon,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sermon: ReaderSermon;
}) {
  const { play } = useAudioPlayer();

  const video = isVideoType(sermon.mediaType) && sermon.mediaSrc;
  const audio = isAudioType(sermon.mediaType) && sermon.mediaSrc;
  const meta = [sermon.speaker, sermon.date, sermon.duration].filter(Boolean) as string[];

  const listen = () => {
    play({
      id: sermon.id ?? undefined,
      title: sermon.title,
      speaker: sermon.speaker ?? undefined,
      src: sermon.mediaSrc as string,
      cover: sermon.background ?? null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="flex max-h-[90vh] w-[95vw] flex-col gap-0 overflow-hidden rounded-2xl border-0 bg-white p-0 md:max-w-2xl"
      >
        <div className="border-b border-[rgba(40,25,80,0.08)] px-6 py-4">
          {sermon.serie && (
            <span className="text-[11px] font-bold tracking-[0.16em] text-gold-dark uppercase">{sermon.serie}</span>
          )}
          <DialogTitle className="mt-0.5 font-display text-[22px] leading-tight font-semibold text-indigo italic">
            {sermon.title}
          </DialogTitle>
          {meta.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] font-semibold text-faint">
              {sermon.speaker && (
                <span className="flex items-center gap-1.5">
                  <User className="size-3.5" /> {sermon.speaker}
                </span>
              )}
              {sermon.date && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" /> {sermon.date}
                </span>
              )}
              {sermon.duration && (
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" /> {sermon.duration}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Media */}
          {video && (
            <div className="mb-5">
              {open && (
                <CustomVideoPlayer mediaType={sermon.mediaType as SermonMediaType} src={sermon.mediaSrc} title={sermon.title} autoPlay />
              )}
            </div>
          )}
          {audio && (
            <button
              type="button"
              onClick={listen}
              className="mb-5 flex w-full items-center gap-3 rounded-xl border border-gold/25 bg-gold/5 px-4 py-3 text-left transition hover:bg-gold/10"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-dark text-indigo">
                <Headphones className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-bold text-indigo">Écouter le message</span>
                <span className="block text-xs text-body">Lecture dans le lecteur audio flottant</span>
              </span>
            </button>
          )}
          {!sermon.mediaType && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-muted/40 px-4 py-3 text-sm font-semibold text-body-strong">
              <FileText className="size-4 text-gold-dark" /> Enseignement écrit — notes ci-dessous
            </div>
          )}

          {/* Scriptures */}
          {sermon.scriptures && sermon.scriptures.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {sermon.scriptures.map((ref) => (
                <span
                  key={ref}
                  className="inline-flex items-center gap-1 rounded-md border border-gold/20 bg-gold/10 px-2.5 py-1 text-[11.5px] font-bold text-gold-dark"
                >
                  <BookOpen className="size-3" /> {ref}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {sermon.description ? (
            <div className="rounded-xl border border-muted/50 bg-muted/30 p-5 leading-relaxed shadow-inner">
              <h4 className="mb-2 text-[11px] font-bold tracking-wide text-body-strong uppercase">Résumé</h4>
              <p className="whitespace-pre-line text-[15px] leading-[1.75] text-body">{sermon.description}</p>
            </div>
          ) : (
            <p className="text-sm italic text-faint">Aucun résumé disponible pour ce message.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Truncated description with a "Lire la suite" affordance that opens the full
 * reader. Drop-in replacement for inline `<p>{description}</p>` blocks.
 */
export function SermonDescription({
  sermon,
  className,
  clamp = "line-clamp-3",
}: {
  sermon: ReaderSermon;
  className?: string;
  clamp?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={className}>
        {sermon.description ? (
          <p className={cn("text-[15px] leading-relaxed text-body", clamp)}>{sermon.description}</p>
        ) : (
          <p className="text-[15px] italic leading-relaxed text-faint">Aucun résumé disponible.</p>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-1.5 cursor-pointer text-[13px] font-bold text-gold-dark underline-offset-2 transition hover:underline"
        >
          Lire la suite
        </button>
      </div>
      <SermonReaderDialog open={open} onOpenChange={setOpen} sermon={sermon} />
    </>
  );
}

/** Standalone button that opens the reader (used by admin previews & cards). */
export function SermonReaderButton({
  sermon,
  children,
  className,
  variant = "outline",
}: {
  sermon: ReaderSermon;
  children: React.ReactNode;
  className?: string;
  variant?: "gold" | "dark" | "outline";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <BrandButton variant={variant} size="sm" className={className} onClick={() => setOpen(true)}>
        {children}
      </BrandButton>
      <SermonReaderDialog open={open} onOpenChange={setOpen} sermon={sermon} />
    </>
  );
}
