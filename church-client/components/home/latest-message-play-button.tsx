"use client";

import { Play } from "lucide-react";
import { usePlayback } from "@/components/layout/playback-context";

type LatestMessagePlayButtonProps = {
  title: string;
  speaker: string;
  videoUrl?: string | null;
  audioUrl?: string | null;
};

export function LatestMessagePlayButton({
  title,
  speaker,
  videoUrl,
  audioUrl,
}: LatestMessagePlayButtonProps) {
  const { playAudio, playVideo } = usePlayback();

  const handlePlay = () => {
    if (videoUrl) {
      playVideo({ title, url: videoUrl });
    } else if (audioUrl) {
      playAudio({ title, speaker, url: audioUrl });
    } else {
      // High-quality fallback music for demo/fallback purposes
      playAudio({
        title,
        speaker,
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      });
    }
  };

  return (
    <button
      onClick={handlePlay}
      aria-label="Lire le message"
      className="flex size-[74px] cursor-pointer items-center justify-center rounded-full border-2 border-white/60 bg-white/20 backdrop-blur-sm transition hover:bg-white/30 hover:scale-105 shadow-lg"
    >
      <Play className="ml-1 size-6 fill-white text-white" />
    </button>
  );
}
