import { useEffect, useRef } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

import { REVERB } from '../config';
import type { ChatMessage, Reaction } from '../types';

type ReverbEcho = Echo<'reverb'>;

let echoInstance: ReverbEcho | null = null;

/**
 * A single Reverb Echo client for the app (CHR-188). Only the PUBLIC live
 * channel is used from mobile — no `/broadcasting/auth`. Isolation is by the
 * tenant-scoped channel name (CHR-155).
 */
export function getEcho(): ReverbEcho | null {
  if (!REVERB.key) {
    return null;
  }
  if (echoInstance) {
    return echoInstance;
  }

  // laravel-echo reads Pusher off the global scope.
  (globalThis as unknown as { Pusher?: typeof Pusher }).Pusher = Pusher;

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: REVERB.key,
    wsHost: REVERB.host,
    wsPort: REVERB.port,
    wssPort: REVERB.port,
    forceTLS: REVERB.scheme === 'wss',
    enabledTransports: ['ws', 'wss'],
  });

  return echoInstance;
}

export type LiveHandlers = {
  onChat?: (message: ChatMessage) => void;
  onReaction?: (reaction: Reaction) => void;
  onAudience?: (count: number) => void;
  onLiveState?: (state: { is_live: boolean; started_at: string }) => void;
};

/**
 * Subscribe to a church's tenant-scoped live channel (`{prefix}live`). Handlers
 * are kept in a ref so they stay fresh without re-subscribing; the channel is
 * left on unmount / prefix change.
 */
export function useLiveChannel(channelPrefix: string, handlers: LiveHandlers): void {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    const echo = getEcho();
    if (!echo || !channelPrefix) {
      return;
    }
    const name = `${channelPrefix}live`;
    const channel = echo.channel(name);
    channel.listen('.chat.message', (d: ChatMessage) => ref.current.onChat?.(d));
    channel.listen('.reaction', (d: Reaction) => ref.current.onReaction?.(d));
    channel.listen('.audience', (d: { count: number }) => ref.current.onAudience?.(d.count));
    channel.listen('.live.state', (d: { is_live: boolean; started_at: string }) => ref.current.onLiveState?.(d));

    return () => {
      echo.leave(name);
    };
  }, [channelPrefix]);
}
