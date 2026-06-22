"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, Pause, Headphones, Video, FileText } from "lucide-react";

import type { SermonMediaType } from "@/lib/data";
import { useAudioPlayer } from "@/components/audio/audio-player";
import { BrandButton } from "@/components/ui/brand-button";
import { SermonVideoDialog } from "@/components/media/sermon-video-dialog";

export type SermonMediaInfo = {
  id?: number | null;
  title: string;
  speaker?: string;
  isAudio: boolean;
  mediaSrc: string | null;
  mediaType: SermonMediaType | null;
  background?: string | null;
};

const trackOf = (s: SermonMediaInfo) => ({
  id: s.id ?? undefined,
  title: s.title,
  speaker: s.speaker,
  src: s.mediaSrc as string,
  cover: s.background ?? null,
});

/** Round overlay play button on the "Dernier message" cover. */
export function SermonPlayOverlay({ sermon }: { sermon: SermonMediaInfo }) {
  const { play, toggle, isCurrent, isPlaying } = useAudioPlayer();
  const [videoOpen, setVideoOpen] = useState(false);
  const isVideo = !sermon.isAudio && Boolean(sermon.mediaType);
  const active = isCurrent(sermon.id ?? undefined);

  // No media → a quiet "notes" affordance.
  if (!sermon.mediaType) {
    return (
      <Link
        href="/mediatheque"
        aria-label={`Lire les notes de ${sermon.title}`}
        className="flex size-[74px] items-center justify-center rounded-full border-2 border-white/60 bg-white/20 backdrop-blur-sm transition hover:bg-white/30"
      >
        <FileText className="size-6 text-white" />
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Lire ${sermon.title}`}
        onClick={() => {
          if (!(sermon.isAudio && sermon.mediaSrc)) {
            setVideoOpen(true);
          } else if (active) {
            toggle();
          } else {
            play(trackOf(sermon));
          }
        }}
        className="flex size-[74px] cursor-pointer items-center justify-center rounded-full border-2 border-white/60 bg-white/20 backdrop-blur-sm transition hover:bg-white/30"
      >
        {active && isPlaying ? (
          <Pause className="size-6 fill-white text-white" />
        ) : (
          <Play className="ml-1 size-6 fill-white text-white" />
        )}
      </button>
      {isVideo && sermon.mediaType && (
        <SermonVideoDialog open={videoOpen} onOpenChange={setVideoOpen} mediaType={sermon.mediaType} src={sermon.mediaSrc} title={sermon.title} />
      )}
    </>
  );
}

/** Primary CTA — plays audio inline, opens video in-place, or links to notes. */
export function SermonListenButton({ sermon }: { sermon: SermonMediaInfo }) {
  const { play } = useAudioPlayer();
  const [videoOpen, setVideoOpen] = useState(false);

  if (!sermon.mediaType) {
    return (
      <BrandButton asChild variant="dark" size="sm" className="px-6">
        <Link href="/mediatheque">
          <FileText className="size-4" />
          Lire le résumé
        </Link>
      </BrandButton>
    );
  }

  if (sermon.isAudio && sermon.mediaSrc) {
    return (
      <BrandButton variant="dark" size="sm" className="px-6" onClick={() => play(trackOf(sermon))}>
        <Headphones className="size-4" />
        Écouter le message
      </BrandButton>
    );
  }

  return (
    <>
      <BrandButton variant="dark" size="sm" className="px-6" onClick={() => setVideoOpen(true)}>
        <Video className="size-4" />
        Regarder le message
      </BrandButton>
      <SermonVideoDialog open={videoOpen} onOpenChange={setVideoOpen} mediaType={sermon.mediaType} src={sermon.mediaSrc} title={sermon.title} />
    </>
  );
}
