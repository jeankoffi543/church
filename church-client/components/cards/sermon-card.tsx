"use client";

import { useState } from "react";
import { Play, Pause, Video, Headphones, BookOpen, FileText } from "lucide-react";
import type { Sermon } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useAudioPlayer, type AudioTrack } from "@/components/audio/audio-player";
import { SermonVideoDialog } from "@/components/media/sermon-video-dialog";
import { SermonReaderDialog, type ReaderSermon } from "@/components/media/sermon-reader";

export function SermonCard({ sermon, audioQueue }: { sermon: Sermon; audioQueue?: AudioTrack[] }) {
  const { play, toggle, isCurrent, isPlaying } = useAudioPlayer();
  const [videoOpen, setVideoOpen] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);

  const hasMedia = Boolean(sermon.mediaType);
  const audioPlayable = Boolean(sermon.isAudio && sermon.mediaSrc);
  const isVideo = hasMedia && !sermon.isAudio;
  const active = isCurrent(sermon.id ?? undefined);
  const playingThis = active && isPlaying;

  const readerData: ReaderSermon = {
    id: sermon.id,
    title: sermon.title,
    speaker: sermon.speaker,
    serie: sermon.serie,
    date: sermon.date,
    duration: sermon.duration,
    description: sermon.desc,
    mediaType: sermon.mediaType ?? null,
    mediaSrc: sermon.mediaSrc ?? null,
    background: sermon.background,
    scriptures: sermon.scriptures,
  };

  const handlePrimary = () => {
    if (!hasMedia) {
      setReaderOpen(true);
      return;
    }
    if (audioPlayable) {
      if (active) toggle();
      else
        play(
          {
            id: sermon.id ?? undefined,
            title: sermon.title,
            speaker: sermon.speaker,
            src: sermon.mediaSrc as string,
            cover: sermon.background ?? null,
          },
          audioQueue
        );
    } else {
      setVideoOpen(true);
    }
  };

  const interactive = {
    role: "button" as const,
    tabIndex: 0,
    onClick: handlePrimary,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handlePrimary();
      }
    },
  };

  return (
    <article className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.07)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_46px_rgba(22,15,51,0.13)]">
      {/* Thumbnail */}
      <div
        {...interactive}
        className="relative flex aspect-video cursor-pointer items-center justify-center bg-gradient-to-br from-indigo-mid to-ink bg-cover bg-center"
        style={
          sermon.background
            ? { backgroundImage: `linear-gradient(140deg,rgba(33,22,72,.45),rgba(22,15,51,.7)),url('${sermon.background}')` }
            : undefined
        }
      >
        {sermon.serie && (
          <span className="absolute top-3 left-3 rounded-md bg-ink/40 px-2.5 py-1 text-[10px] font-bold tracking-wide text-gold uppercase">
            {sermon.serie}
          </span>
        )}
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-md bg-ink/50 px-2 py-1 text-[10px] font-bold text-white">
          {!hasMedia ? <FileText className="size-3" /> : sermon.isAudio ? <Headphones className="size-3" /> : <Video className="size-3" />}
          {!hasMedia ? "Notes" : sermon.isAudio ? "Audio" : "Vidéo"}
        </span>

        {hasMedia ? (
          <span className="flex size-[54px] items-center justify-center rounded-full border-[1.5px] border-white/50 bg-white/15 transition hover:bg-white/25">
            {playingThis ? (
              <Pause className="size-[15px] fill-white text-white" />
            ) : (
              <Play className="ml-1 size-[15px] fill-white text-white" />
            )}
          </span>
        ) : (
          <FileText className="size-9 text-white/70" />
        )}

        {sermon.duration && (
          <span className="absolute right-3 bottom-3 rounded-md bg-ink/50 px-2.5 py-1 text-[11px] font-bold text-white">
            {sermon.duration}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        <h3 className="mb-2.5 font-display text-[21px] leading-tight font-semibold text-indigo italic">
          {sermon.title}
        </h3>
        <div className="mb-3 flex items-center gap-2.5 text-[12.5px] font-semibold text-faint">
          <span>{sermon.speaker}</span>
          <span className="size-[3px] rounded-full bg-[#c8b9d0]" />
          <span>{sermon.date}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {sermon.scriptures && sermon.scriptures.length > 0 ? (
            <>
              {sermon.scriptures.slice(0, 3).map((ref) => (
                <span
                  key={ref}
                  className="inline-flex items-center gap-1 rounded-md border border-gold/15 bg-gold/10 px-2 py-0.5 text-[11px] font-bold text-gold-dark"
                >
                  <BookOpen className="size-3" /> {ref}
                </span>
              ))}
              {sermon.scriptures.length > 3 && (
                <span className={cn("inline-flex items-center rounded-md bg-indigo/5 px-2 py-0.5 text-[11px] font-bold text-indigo")}>
                  +{sermon.scriptures.length - 3}
                </span>
              )}
            </>
          ) : (
            sermon.book && (
              <span className="inline-flex items-center gap-1 rounded-md bg-lilac px-2.5 py-1 text-[11px] font-bold text-indigo-mid">
                <BookOpen className="size-3" /> {sermon.book}
              </span>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => setReaderOpen(true)}
          className="mt-3.5 inline-flex cursor-pointer items-center gap-1.5 text-[12.5px] font-bold text-gold-dark underline-offset-2 transition hover:underline"
        >
          <FileText className="size-3.5" /> Lire le résumé
        </button>
      </div>

      {isVideo && sermon.mediaType && (
        <SermonVideoDialog
          open={videoOpen}
          onOpenChange={setVideoOpen}
          mediaType={sermon.mediaType}
          src={sermon.mediaSrc ?? null}
          title={sermon.title}
        />
      )}
      <SermonReaderDialog open={readerOpen} onOpenChange={setReaderOpen} sermon={readerData} />
    </article>
  );
}

