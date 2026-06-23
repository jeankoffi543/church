"use client";

import { useEffect, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CustomVideoPlayer } from "@/components/media/custom-video-player";
import { ReplayChat } from "@/components/live/replay-chat";
import { useAudioPlayer } from "@/components/audio/audio-player";
import { cn } from "@/lib/utils";
import type { SermonMediaType } from "@/lib/data";

/**
 * In-situ video viewer — never redirects. Opens a strictly centered dialog that
 * autoplays the sermon and pauses the global audio player if it was running.
 * When `chatSlug` is provided, a time-synced replay chat is shown beside the
 * player and revealed in step with the playback clock.
 */
export function SermonVideoDialog({
  open,
  onOpenChange,
  mediaType,
  src,
  title,
  resumeKey,
  chatSlug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaType: SermonMediaType;
  src: string | null;
  title: string;
  resumeKey?: string;
  /** Archive slug whose chat replay should be synced to playback. */
  chatSlug?: string;
}) {
  const { close } = useAudioPlayer();
  const withChat = Boolean(chatSlug);

  // Cut the floating audio when a video takes over.
  useEffect(() => {
    if (open) close();
  }, [open, close]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cn(
          "fixed top-1/2 left-1/2 w-[95vw] -translate-x-1/2 -translate-y-1/2 gap-0 overflow-hidden rounded-2xl border-none bg-background p-0 shadow-2xl",
          withChat ? "md:max-w-6xl" : "md:max-w-4xl",
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {open &&
          (withChat ? (
            <ReplayLayout
              mediaType={mediaType}
              src={src}
              title={title}
              resumeKey={resumeKey}
              chatSlug={chatSlug as string}
              onEnded={() => onOpenChange(false)}
            />
          ) : (
            <CustomVideoPlayer
              mediaType={mediaType}
              src={src}
              title={title}
              autoPlay
              onEnded={() => onOpenChange(false)}
              resumeKey={resumeKey}
            />
          ))}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Player + time-synced replay chat. Mounted only while the dialog is open, so
 * its playback clock resets cleanly on every open — no reset effect needed.
 */
function ReplayLayout({
  mediaType,
  src,
  title,
  resumeKey,
  chatSlug,
  onEnded,
}: {
  mediaType: SermonMediaType;
  src: string | null;
  title: string;
  resumeKey?: string;
  chatSlug: string;
  onEnded: () => void;
}) {
  const [currentTime, setCurrentTime] = useState(0);

  return (
    <div className="grid grid-cols-1 lg:h-[70vh] lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 self-center">
        <CustomVideoPlayer
          mediaType={mediaType}
          src={src}
          title={title}
          autoPlay
          onEnded={onEnded}
          onTime={setCurrentTime}
          resumeKey={resumeKey}
        />
      </div>
      <div className="min-h-0 max-lg:h-[40vh]">
        <ReplayChat slug={chatSlug} currentTime={currentTime} />
      </div>
    </div>
  );
}
