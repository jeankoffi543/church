"use client";

import { useState, useEffect } from "react";

import type { LiveConfig, SermonPoint } from "@/lib/api";
import { tenantApiBase } from "@/lib/tenant/api-base";
import { LivePlayer } from "./live-player";
import { LivePanel, type LiveTab } from "./live-panel";
import { LiveDot } from "@/components/ui/live-dot";

export function LiveSection({ config: initialConfig }: { config: LiveConfig }) {
  const [config, setConfig] = useState<LiveConfig>(initialConfig);
  const [tab, setTab] = useState<LiveTab>(initialConfig.chatEnabled ? "chat" : "priere");

  useEffect(() => {
    const fetchLiveConfig = async () => {
      try {
        const res = await fetch(`${await tenantApiBase()}/public/settings?group=live`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          const live = json.data;
          if (live) {
            // The tenant channel prefix is immutable, so carry it over from the
            // server-rendered config instead of refetching it each poll (CHR-155).
            setConfig((prev) => ({
              channelPrefix: prev.channelPrefix,
              isLive: Boolean(live.live_status),
              streamUrl: (live.live_embed_url as string) ?? "",
              chatEnabled: live.live_chat_enabled !== false,
              title: (live.live_title as string) ?? "Culte du dimanche",
              fallbackImage: (live.live_fallback_image as string) ?? null,
              description: (live.live_description as string) ?? "Diffusion en direct depuis le temple principal MFM Ficgayo",
              sermonTitle: (live.live_sermon_title as string) ?? "La grâce qui transforme",
              sermonReference: (live.live_sermon_reference as string) ?? "Romains 5.1-11",
              sermonPoints: (live.live_sermon_points as SermonPoint[]) ?? [],
            }));
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

  const activeTab = !config.chatEnabled && tab === "chat" ? "priere" : tab;

  return (
    <section className="min-h-screen bg-ink px-6 pt-[clamp(90px,11vw,110px)] pb-[70px] text-white">
      <div className="mx-auto max-w-[1240px]">
        {/* Header */}
        <div className="mb-[26px] flex flex-wrap items-center gap-3.5">
          {config.isLive ? (
            <span className="relative flex animate-live-pulse items-center gap-2 rounded-[9px] bg-live px-3.5 py-2 text-[13px] font-extrabold tracking-wide">
              <LiveDot className="size-2" />
              EN DIRECT
            </span>
          ) : (
            <span className="flex items-center gap-2 rounded-[9px] bg-white/10 px-3.5 py-2 text-[13px] font-extrabold tracking-wide text-white/70">
              <span className="size-2 rounded-full bg-white/40" />
              HORS DIRECT
            </span>
          )}
          {config.isLive && (
            <h1 className="font-display text-[clamp(28px,3.6vw,42px)] leading-none font-semibold italic">
              {config.title}
            </h1>
          )}
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
            tab={activeTab}
            onTabChange={setTab}
            chatEnabled={config.chatEnabled}
            isLive={config.isLive}
            description={config.description}
            sermonTitle={config.sermonTitle}
            sermonReference={config.sermonReference}
            sermonPoints={config.sermonPoints}
          />
        </div>
      </div>
    </section>
  );
}
