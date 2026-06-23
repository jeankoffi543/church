"use client";

import { useEffect, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CustomVideoPlayer } from "@/components/media/custom-video-player";
import { ReplayChat } from "@/components/live/replay-chat";
import { ShareMenu } from "@/components/lives/share-menu";
import { useAudioPlayer } from "@/components/audio/audio-player";
import { cn } from "@/lib/utils";
import type { SermonMediaType } from "@/lib/data";

/**
 * In-situ video viewer — never redirects. Opens a strictly centered dialog that
 * autoplays the sermon and pauses the global audio player if it was running.
 * When `chatSlug` is provided, a time-synced replay chat is shown beside the
 * player; when `shareSlug` is provided, an advanced share control is overlaid.
 */
export function SermonVideoDialog({
  open,
  onOpenChange,
  mediaType,
  src,
  title,
  resumeKey,
  chatSlug,
  shareSlug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaType: SermonMediaType;
  src: string | null;
  title: string;
  resumeKey?: string;
  /** Archive slug whose chat replay should be synced to playback. */
  chatSlug?: string;
  /** Archive slug to build advanced share links from (with timestamp). */
  shareSlug?: string;
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
        {/* Mounted only while open, so the playback clock resets on every open. */}
        {open && (
          <DialogBody
            mediaType={mediaType}
            src={src}
            title={title}
            resumeKey={resumeKey}
            chatSlug={chatSlug}
            shareSlug={shareSlug}
            onEnded={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DialogBody({
  mediaType,
  src,
  title,
  resumeKey,
  chatSlug,
  shareSlug,
  onEnded,
}: {
  mediaType: SermonMediaType;
  src: string | null;
  title: string;
  resumeKey?: string;
  chatSlug?: string;
  shareSlug?: string;
  onEnded: () => void;
}) {
  const [currentTime, setCurrentTime] = useState(0);

  const player = (
    <CustomVideoPlayer
      mediaType={mediaType}
      src={src}
      title={title}
      autoPlay
      onEnded={onEnded}
      onTime={setCurrentTime}
      resumeKey={resumeKey}
    />
  );

  const share = shareSlug ? (
    <div className="absolute top-3 left-3 z-10">
      <ShareMenu slug={shareSlug} title={title} getTime={() => currentTime} />
    </div>
  ) : null;

  if (chatSlug) {
    return (
      // Two columns on desktop; the player cell sets the row height and the chat
      // stretches to match it (no empty gaps). Inner player rounding/shadow are
      // stripped so only the dialog's own rounded corners show.
      <div className="grid max-h-[85vh] grid-cols-1 overflow-hidden bg-[#0d091e] lg:grid-cols-[1fr_360px]">
        <div className="relative flex min-w-0 items-center justify-center bg-black [&>div]:rounded-none [&>div]:shadow-none">
          {player}
          {share}
        </div>
        <div className="flex h-[42vh] min-h-0 flex-col border-t border-white/10 lg:h-auto lg:border-t-0 lg:border-l">
          <ReplayChat slug={chatSlug} currentTime={currentTime} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-black [&>div]:rounded-none [&>div]:shadow-none">
      {player}
      {share}
    </div>
  );
}
