"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { Play, Pause, X, Headphones } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type AudioTrack = {
  title: string;
  speaker: string;
  url: string;
};

export type VideoTrack = {
  title: string;
  url: string;
};

type PlaybackContextType = {
  currentAudio: AudioTrack | null;
  isPlayingAudio: boolean;
  playAudio: (track: AudioTrack) => void;
  pauseAudio: () => void;
  resumeAudio: () => void;
  stopAudio: () => void;
  currentVideo: VideoTrack | null;
  playVideo: (track: VideoTrack) => void;
  closeVideo: () => void;
};

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error("usePlayback must be used within a PlaybackProvider");
  }
  return context;
}

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const [currentAudio, setCurrentAudio] = useState<AudioTrack | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<VideoTrack | null>(null);

  // Time & progress states
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Instantiate audio element client-side
    const audio = new Audio();
    audioRef.current = audio;

    const handlePlay = () => setIsPlayingAudio(true);
    const handlePause = () => setIsPlayingAudio(false);
    const handleEnded = () => {
      setIsPlayingAudio(false);
      setProgress(100);
    };
    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(formatTime(audio.currentTime));
      }
    };
    const handleLoadedMetadata = () => {
      setDuration(formatTime(audio.duration));
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      audio.pause();
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, []);

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const playAudio = (track: AudioTrack) => {
    if (!audioRef.current) return;
    
    // If it's the same track and it's paused, resume it
    if (currentAudio?.url === track.url) {
      if (!isPlayingAudio) {
        audioRef.current.play().catch(console.error);
      }
      return;
    }

    // Set new track
    setCurrentAudio(track);
    audioRef.current.src = track.url;
    audioRef.current.load();
    audioRef.current.play().catch(console.error);
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const resumeAudio = () => {
    if (audioRef.current && currentAudio) {
      audioRef.current.play().catch(console.error);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentAudio(null);
    setIsPlayingAudio(false);
    setProgress(0);
  };

  const playVideo = (track: VideoTrack) => {
    // If playing audio, pause it to let video play
    if (isPlayingAudio) {
      pauseAudio();
    }
    setCurrentVideo(track);
  };

  const closeVideo = () => {
    setCurrentVideo(null);
  };

  // Convert video URL to embed
  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    let embed = url;
    if (embed.includes("watch?v=")) {
      embed = embed.replace("watch?v=", "embed/");
    } else if (embed.includes("youtu.be/")) {
      const parts = embed.split("youtu.be/");
      const id = parts[parts.length - 1].split("?")[0];
      embed = `https://www.youtube.com/embed/${id}`;
    }
    return embed;
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    audioRef.current.currentTime = percentage * audioRef.current.duration;
  };

  return (
    <PlaybackContext.Provider
      value={{
        currentAudio,
        isPlayingAudio,
        playAudio,
        pauseAudio,
        resumeAudio,
        stopAudio,
        currentVideo,
        playVideo,
        closeVideo,
      }}
    >
      {children}

      {/* Floating Audio Player */}
      {currentAudio && (
        <div className="fixed bottom-6 right-6 z-50 flex w-[calc(100vw-3rem)] max-w-[360px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink/90 p-4 text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-5">
          <div className="flex items-center gap-3">
            {/* Pulsing Audio Icon */}
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold-dark text-ink shadow-md shadow-gold/20">
              <Headphones className={cn("size-5", isPlayingAudio && "animate-bounce")} />
            </div>

            {/* Track Info */}
            <div className="min-w-0 flex-1">
              <h4 className="truncate font-display text-[15px] font-bold text-white italic leading-tight">
                {currentAudio.title}
              </h4>
              <p className="truncate text-[11px] font-semibold text-faint mt-0.5">
                {currentAudio.speaker}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={isPlayingAudio ? pauseAudio : resumeAudio}
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label={isPlayingAudio ? "Pause" : "Play"}
              >
                {isPlayingAudio ? (
                  <Pause className="size-4 fill-white text-white" />
                ) : (
                  <Play className="ml-0.5 size-4 fill-white text-white" />
                )}
              </button>
              <button
                onClick={stopAudio}
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-faint hover:text-white transition-colors"
                aria-label="Fermer"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Progress Bar & Timing */}
          <div className="mt-3">
            <div 
              className="h-1 w-full cursor-pointer rounded-full bg-white/15"
              onClick={handleProgressBarClick}
            >
              <div 
                className="h-full rounded-full bg-gradient-to-r from-gold to-gold-dark relative" 
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 size-2 -translate-y-1/2 rounded-full bg-white shadow-md shadow-black/40 scale-0 group-hover:scale-100 transition-transform" />
              </div>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold text-faint">
              <span>{currentTime}</span>
              <span>{duration}</span>
            </div>
          </div>
        </div>
      )}

      {/* Video Dialog */}
      <Dialog open={!!currentVideo} onOpenChange={(open) => !open && closeVideo()}>
        <DialogContent className="max-w-4xl w-[95vw] border-none bg-ink p-0 text-white shadow-2xl overflow-hidden aspect-video">
          <DialogTitle className="sr-only">
            {currentVideo?.title || "Lecture Vidéo"}
          </DialogTitle>
          {currentVideo && (
            <div className="relative size-full">
              {getEmbedUrl(currentVideo.url).includes("embed") ? (
                <iframe
                  src={`${getEmbedUrl(currentVideo.url)}?autoplay=1&rel=0`}
                  title={currentVideo.title}
                  className="absolute inset-0 size-full border-0 bg-black"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <video
                  src={currentVideo.url}
                  className="absolute inset-0 size-full bg-black"
                  controls
                  autoPlay
                  playsInline
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PlaybackContext.Provider>
  );
}
