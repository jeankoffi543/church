"use client";

import { useEffect } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CustomVideoPlayer } from "@/components/media/custom-video-player";
import { useAudioPlayer } from "@/components/audio/audio-player";
import type { SermonMediaType } from "@/lib/data";

/**
 * In-situ video viewer — never redirects. Opens a strictly centered dialog that
 * autoplays the sermon and pauses the global audio player if it was running.
 */
export function SermonVideoDialog({
  open,
  onOpenChange,
  mediaType,
  src,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaType: SermonMediaType;
  src: string | null;
  title: string;
}) {
  const { close } = useAudioPlayer();

  // Cut the floating audio when a video takes over.
  useEffect(() => {
    if (open) close();
  }, [open, close]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="fixed top-1/2 left-1/2 w-[95vw] -translate-x-1/2 -translate-y-1/2 gap-0 overflow-hidden rounded-2xl border-none bg-background p-0 shadow-2xl md:max-w-4xl"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {open && (
          <CustomVideoPlayer
            mediaType={mediaType}
            src={src}
            title={title}
            autoPlay
            onEnded={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
