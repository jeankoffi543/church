"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { useEffect, useRef } from "react";

import type { ChatMessage } from "@/lib/live";
import type { ScripturePayload } from "@/lib/studio";

type ReverbEcho = Echo<"reverb">;

let echoInstance: ReverbEcho | null = null;

/** Lazily build a single Reverb Echo client (browser only). */
export function getEcho(): ReverbEcho | null {
  if (typeof window === "undefined") return null;
  const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY;
  if (!key) return null;
  if (echoInstance) return echoInstance;

  // Echo needs Pusher on the global scope.
  (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

  echoInstance = new Echo({
    broadcaster: "reverb",
    key,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST ?? "localhost",
    wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
    wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
    forceTLS: (process.env.NEXT_PUBLIC_REVERB_SCHEME ?? "http") === "https",
    enabledTransports: ["ws", "wss"],
  });

  return echoInstance;
}

export type LiveHandlers = {
  onChat?: (message: ChatMessage) => void;
  onReaction?: (reaction: { type: string; total: number }) => void;
  onAudience?: (count: number) => void;
  onLiveState?: (state: { is_live: boolean; started_at: string }) => void;
  /** The live source (embed/HLS url) swapped mid-broadcast — no chat wipe. */
  onSource?: (source: { stream_url: string; title: string }) => void;
  /** Régie pushed a scripture overlay (show/hide) onto the stream. */
  onScripture?: (payload: ScripturePayload) => void;
};

/**
 * Subscribe to this church's live channel. The channel is tenant-scoped —
 * `tenant.{key}.live` — so on a shared Reverb server one church never receives
 * another's broadcasts (CHR-155); `channelPrefix` comes from the backend's public
 * `realtime` endpoint. Handlers are kept in a ref so they stay fresh without
 * re-subscribing, and the channel is left on unmount — no socket leak, single
 * subscription for the component's lifetime.
 */
export function useLiveChannel(channelPrefix: string, handlers: LiveHandlers): void {
  const ref = useRef(handlers);

  // Keep the latest handlers without re-subscribing the socket.
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    const echo = getEcho();
    // Without a tenant prefix the backend broadcasts nowhere we'd hear, so skip
    // subscribing rather than listen on a stale/global name.
    if (!echo || !channelPrefix) return;

    const channelName = `${channelPrefix}live`;
    const channel = echo.channel(channelName);
    channel.listen(".chat.message", (d: ChatMessage) => ref.current.onChat?.(d));
    channel.listen(".reaction", (d: { type: string; total: number }) => ref.current.onReaction?.(d));
    channel.listen(".audience", (d: { count: number }) => ref.current.onAudience?.(d.count));
    channel.listen(".live.state", (d: { is_live: boolean; started_at: string }) => ref.current.onLiveState?.(d));
    channel.listen(".live.source", (d: { stream_url: string; title: string }) => ref.current.onSource?.(d));
    channel.listen(".scripture", (d: ScripturePayload) => ref.current.onScripture?.(d));

    return () => {
      echo.leaveChannel(channelName);
    };
  }, [channelPrefix]);
}
