"use client";

import { useState, useEffect } from "react";

import type { LiveConfig } from "@/lib/api";
import { LivePlayer } from "./live-player";
import { LivePanel, type LiveTab } from "./live-panel";
import { LiveDot } from "@/components/ui/live-dot";

export function LiveSection({ config: initialConfig }: { config: LiveConfig }) {
  const [config, setConfig] = useState<LiveConfig>(initialConfig);
  const [tab, setTab] = useState<LiveTab>(initialConfig.chatEnabled ? "chat" : "priere");

  useEffect(() => {
    const fetchLiveConfig = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(`${apiUrl}/public/settings?group=live`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          const live = json.data;
          if (live) {
            setConfig({
              isLive: Boolean(live.live_status),
              streamUrl: (live.live_embed_url as string) ?? "",
              chatEnabled: live.live_chat_enabled !== false,
              title: (live.live_title as string) ?? "Culte du dimanche",
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch live settings client-side:", err);
      }
    };
    fetchLiveConfig();
    const interval = setInterval(fetchLiveConfig, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!config.chatEnabled && tab === "chat") {
      setTab("priere");
    }
  }, [config.chatEnabled, tab]);

  return (
    <section className="min-h-screen bg-ink px-6 pt-[clamp(90px,11vw,110px)] pb-[70px] text-white">
      <div className="mx-auto max-w-[1240px]">
        {/* Header */}
        <div className="mb-[26px] flex flex-wrap items-center gap-3.5">
          {config.isLive ? (
            <span className="flex animate-live-pulse items-center gap-2 rounded-[9px] bg-live px-3.5 py-2 text-[13px] font-extrabold tracking-wide">
              <LiveDot className="size-2" />
              EN DIRECT
            </span>
          ) : (
            <span className="flex items-center gap-2 rounded-[9px] bg-white/10 px-3.5 py-2 text-[13px] font-extrabold tracking-wide text-white/70">
              <span className="size-2 rounded-full bg-white/40" />
              HORS DIRECT
            </span>
          )}
          <h1 className="font-display text-[clamp(28px,3.6vw,42px)] leading-none font-semibold italic">
            {config.title}
          </h1>
          {config.isLive && (
            <span className="ml-auto flex items-center gap-1.5 text-[13px] font-semibold text-white/60">
              <span className="size-2 rounded-full bg-online" />
              1 248 personnes connectées
            </span>
          )}
        </div>

        {/* Player + panel */}
        <div className="flex flex-wrap items-stretch gap-[22px]">
          <LivePlayer config={config} onFollowBible={() => setTab("notes")} />
          <LivePanel
            tab={tab}
            onTabChange={setTab}
            chatEnabled={config.chatEnabled}
          />
        </div>
      </div>
    </section>
  );
}
