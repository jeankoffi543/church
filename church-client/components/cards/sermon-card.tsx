"use client";

import { Play, BookOpen, Music, Video } from "lucide-react";
import type { Sermon } from "@/lib/data";
import { usePlayback } from "@/components/layout/playback-context";

export function SermonCard({ sermon }: { sermon: Sermon }) {
  const { playAudio, playVideo } = usePlayback();

  const hasVideo = !!sermon.videoUrl;
  const hasAudio = !!sermon.audioUrl;

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasVideo && sermon.videoUrl) {
      playVideo({ title: sermon.title, url: sermon.videoUrl });
    } else if (hasAudio && sermon.audioUrl) {
      playAudio({ title: sermon.title, speaker: sermon.speaker, url: sermon.audioUrl });
    } else {
      // Fallback fallback URL or default live audio
      playAudio({
        title: sermon.title,
        speaker: sermon.speaker,
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", // high quality fallback music
      });
    }
  };

  return (
    <article className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.07)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_46px_rgba(22,15,51,0.13)]">
      {/* Thumbnail */}
      <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-indigo-mid to-ink">
        <span className="absolute top-3 left-3 rounded-md bg-ink/40 px-2.5 py-1 text-[10px] font-bold tracking-wide text-gold uppercase">
          {sermon.serie}
        </span>
        
        <button
          onClick={handlePlay}
          aria-label={`Lire ${sermon.title}`}
          className="flex size-[54px] cursor-pointer items-center justify-center rounded-full border-[1.5px] border-white/50 bg-white/15 transition hover:bg-white/25 hover:scale-105"
        >
          <Play className="ml-1 size-[15px] fill-white text-white" />
        </button>

        {/* Media type indicators */}
        <div className="absolute left-3 bottom-3 flex gap-1">
          {hasVideo && (
            <span className="rounded-md bg-ink/65 p-1 text-white" title="Vidéo disponible">
              <Video className="size-3" />
            </span>
          )}
          {hasAudio && (
            <span className="rounded-md bg-ink/65 p-1 text-white" title="Audio disponible">
              <Music className="size-3" />
            </span>
          )}
        </div>

        <span className="absolute right-3 bottom-3 rounded-md bg-ink/50 px-2.5 py-1 text-[11px] font-bold text-white">
          {sermon.duration}
        </span>
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
        <span className="inline-flex items-center gap-1 rounded-md bg-lilac px-2.5 py-1 text-[11px] font-bold text-indigo-mid">
          <BookOpen className="size-3" /> {sermon.book}
        </span>
      </div>
    </article>
  );
}

