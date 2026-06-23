"use client";

import { useEffect, useMemo, useState } from "react";

import { getArchivedChat, type ChatMessage } from "@/lib/live";

import { LiveChat } from "./live-chat";

/**
 * Time-synced replay chat. Loads the archived messages once, then reveals only
 * those whose `time_offset_seconds` has been reached by the player's clock —
 * recreating the live conversation in step with the rediffusion.
 */
export function ReplayChat({
  slug,
  currentTime,
  synced = true,
}: {
  slug: string;
  currentTime: number;
  /** When false (e.g. a Facebook embed with no time source), show the full chat. */
  synced?: boolean;
}) {
  const [all, setAll] = useState<ChatMessage[]>([]);

  useEffect(() => {
    let active = true;
    getArchivedChat(slug).then((list) => {
      if (active) setAll(list);
    });
    return () => {
      active = false;
    };
  }, [slug]);

  const visible = useMemo(
    () => (synced ? all.filter((m) => m.time_offset_seconds <= currentTime) : all),
    [all, currentTime, synced],
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#120d28] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-bold tracking-wide">Chat de la rediffusion</h2>
        <span className="text-xs font-semibold text-white/40">
          {visible.length}/{all.length}
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <LiveChat
          messages={visible}
          pseudonym={null}
          readOnly
          emptyLabel="Le chat apparaîtra au fil de la rediffusion."
        />
      </div>
    </div>
  );
}
