"use client";

import { Radio, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { LiveDot } from "@/components/ui/live-dot";
import { useLiveChannel } from "@/lib/echo";
import type { LiveConfig } from "@/lib/api";
import {
  getClientId,
  getLiveMessages,
  getPseudonym,
  sendChat,
  sendLeave,
  sendPresence,
  sendReaction,
  setPseudonym as persistPseudonym,
  type ChatMessage,
  type ReactionType,
} from "@/lib/live";

import { HlsPlayer } from "./hls-player";
import { LiveChat, PseudonymGate } from "./live-chat";
import { DescriptionTab, NotesTab, PrayerTab, type LiveTab } from "./live-panel";
import { LiveReactions, type ReactionsHandle } from "./live-reactions";

/** Normalise a stored stream URL (YouTube or Facebook) into an autoplay embed. */
function toEmbedUrl(url: string): string {
  if (!url) return "";

  // Facebook Live / video → official embedded video player (no JS SDK needed).
  if (url.includes("facebook.com") || url.includes("fb.watch") || url.includes("fb.me")) {
    if (url.includes("plugins/video.php")) return url; // already an embed URL
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true`;
  }

  let embed = url;
  if (embed.includes("watch?v=")) {
    embed = embed.replace("watch?v=", "embed/");
  } else if (embed.includes("youtu.be/")) {
    const id = embed.split("youtu.be/")[1]?.split("?")[0] ?? "";
    embed = `https://www.youtube.com/embed/${id}`;
  }
  return `${embed}${embed.includes("?") ? "&" : "?"}autoplay=1&rel=0`;
}

export function LiveStage({ config: initialConfig }: { config: LiveConfig }) {
  const [config, setConfig] = useState<LiveConfig>(initialConfig);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [audience, setAudience] = useState(0);
  const [pseudonym, setPseudonym] = useState<string | null>(null);
  const [askPseudonym, setAskPseudonym] = useState(false);
  // True for the rest of the session after a live ends (cleared on reload).
  const [justEnded, setJustEnded] = useState(false);
  const [tab, setTab] = useState<LiveTab>(() =>
    initialConfig.isLive && initialConfig.chatEnabled ? "chat" : "priere",
  );

  const reactionsRef = useRef<ReactionsHandle>(null);
  const pendingMessage = useRef<string | null>(null);
  // Tracks the broadcast's start stamp so a new live wipes the previous chat.
  const startedAtRef = useRef<string | null>(null);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
  }, []);

  // Initial chat history + the reader's stored pseudonym.
  useEffect(() => {
    let active = true;
    getLiveMessages().then((list) => {
      if (!active) return;
      setMessages(list);
      setPseudonym(getPseudonym());
    });
    return () => {
      active = false;
    };
  }, []);

  // Single socket subscription, fanned out to chat / audience / reactions / state.
  useLiveChannel({
    onChat: appendMessage,
    onAudience: setAudience,
    onReaction: ({ type }) => reactionsRef.current?.spawn(type as ReactionType),
    // Instant reaction to a live starting/ending — no reload, no poll wait.
    onLiveState: ({ is_live, started_at }) => {
      startedAtRef.current = started_at;
      setMessages([]); // wipe the previous live's chat immediately
      setJustEnded(!is_live);
      setConfig((prev) => ({ ...prev, isLive: is_live }));
      void refreshConfig(); // pull the fresh stream URL / title
    },
  });

  // Anonymous audience heartbeat (server TTL is 40s → refresh well inside it).
  // Only while on air — off air there is no audience to count.
  useEffect(() => {
    const clientId = getClientId();
    if (!clientId || !config.isLive) return;

    let active = true;
    const beat = () => {
      sendPresence(clientId).then((count) => {
        if (active) setAudience(count);
      });
    };
    beat();
    const interval = setInterval(beat, 25_000);
    const leave = () => sendLeave(clientId);
    window.addEventListener("pagehide", leave);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [config.isLive]);

  // Pull the live settings and reconcile config + chat. A changed start stamp
  // means a fresh broadcast (or one that just ended) → drop the previous live's
  // chat and reflect the "just ended" state.
  const refreshConfig = useCallback(async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    try {
      const res = await fetch(`${apiUrl}/public/settings?group=live`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) return;
      const live = (await res.json())?.data;
      if (!live) return;
      setConfig((prev) => ({
        ...prev,
        isLive: Boolean(live.live_status),
        streamUrl: (live.live_embed_url as string) ?? prev.streamUrl,
        title: (live.live_title as string) ?? prev.title,
        description: (live.live_description as string) ?? prev.description,
      }));

      const startedAt = (live.live_started_at as string) ?? "";
      if (startedAtRef.current !== null && startedAtRef.current !== startedAt) {
        setMessages(await getLiveMessages());
        setJustEnded(startedAt === "");
      }
      startedAtRef.current = startedAt;
    } catch {
      /* network blip — keep last good config */
    }
  }, []);

  // Fallback poll (the WebSocket `live.state` event is the instant path).
  useEffect(() => {
    const interval = setInterval(refreshConfig, 15_000);
    return () => clearInterval(interval);
  }, [refreshConfig]);

  const handleReact = useCallback((type: ReactionType) => {
    void sendReaction(type);
  }, []);

  const handleSend = useCallback(
    (text: string) => {
      const name = getPseudonym();
      if (!name) {
        pendingMessage.current = text;
        setAskPseudonym(true);
        return;
      }
      sendChat(name, text).then((created) => {
        if (created) appendMessage(created);
      });
    },
    [appendMessage],
  );

  const handlePseudonym = useCallback(
    (name: string) => {
      persistPseudonym(name);
      setPseudonym(name);
      setAskPseudonym(false);
      const queued = pendingMessage.current;
      pendingMessage.current = null;
      if (queued) {
        sendChat(name, queued).then((created) => {
          if (created) appendMessage(created);
        });
      }
    },
    [appendMessage],
  );

  // Our own RTMP→HLS server is served as a `.m3u8` URL → played via hls.js;
  // everything else (YouTube / Facebook) is embedded as an iframe.
  const isHls = /\.m3u8(\?|$)/i.test(config.streamUrl);
  const embedUrl = toEmbedUrl(config.streamUrl);
  // Chat / audience / reactions are only meaningful while on air.
  const chatActive = config.isLive && config.chatEnabled;

  // Tabs: chat + prière + notes always; description only during a live.
  const tabs: { id: LiveTab; label: string }[] = [
    { id: "chat", label: "Tchat" },
    { id: "priere", label: "Prière" },
    { id: "notes", label: "Notes" },
    ...(config.isLive ? [{ id: "description" as LiveTab, label: "Description" }] : []),
  ];
  // If the chat tab is no longer available (live ended), fall back to Prière.
  const activeTab: LiveTab = !chatActive && tab === "chat" ? "priere" : tab;

  return (
    <section className="grid h-[calc(100vh-72px)] grid-cols-1 bg-[#0d091e] text-white lg:grid-cols-[1fr_380px]">
      {/* ── Stage (player) ─────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center gap-3 px-5 py-3.5">
          {config.isLive ? (
            <span className="flex items-center gap-2 rounded-lg bg-live px-3 py-1.5 text-xs font-extrabold tracking-wide">
              <LiveDot className="size-2" /> EN DIRECT
            </span>
          ) : (
            <span className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-extrabold tracking-wide text-white/60">
              <Radio className="size-3.5" /> HORS DIRECT
            </span>
          )}
          <h1 className="truncate font-display text-lg font-semibold italic">{config.title}</h1>
          {config.isLive && (
            <span className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-white/70">
              <Users className="size-4 text-online" />
              {audience.toLocaleString("fr-FR")}
            </span>
          )}
        </div>

        <div className="relative flex-1 overflow-hidden bg-black">
          {config.isLive && isHls ? (
            <HlsPlayer src={config.streamUrl} title={config.title} live />
          ) : config.isLive && embedUrl ? (
            <iframe
              src={embedUrl}
              title={config.title}
              className="absolute inset-0 size-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center px-6 text-center">
              <div className="max-w-md animate-fade-up">
                {justEnded ? (
                  <>
                    <p className="font-display text-2xl font-semibold italic text-white/90">
                      Le direct vient de se terminer.
                    </p>
                    <p className="mt-3 text-sm font-medium tracking-wide text-gold">
                      Merci d’avoir suivi le culte — la rediffusion sera bientôt disponible.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-display text-2xl font-semibold italic text-white/90">
                      Le prochain culte débutera bientôt.
                    </p>
                    <p className="mt-3 text-sm font-medium tracking-wide text-gold">
                      Rejoignez-nous chaque dimanche à 9h00.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Ephemeral reactions — only while on air. */}
          {config.isLive && <LiveReactions ref={reactionsRef} onReact={handleReact} />}
        </div>
      </div>

      {/* ── Side panel (tabs) ──────────────────────────────────────── */}
      <aside className="flex min-h-0 flex-col border-t border-white/10 bg-[#120d28] lg:border-t-0 lg:border-l">
        <div className="flex border-b border-white/10">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="relative flex-1 cursor-pointer px-1.5 py-3.5 text-[13px] font-bold text-white transition-colors hover:bg-white/5"
            >
              {t.label}
              {activeTab === t.id && (
                <span className="absolute right-1/5 bottom-0 left-1/5 h-[2.5px] rounded-sm bg-gold" />
              )}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {activeTab === "chat" && (
            <div className="flex h-full min-h-0 flex-col">
              <div className="min-h-0 flex-1">
                <LiveChat
                  messages={messages}
                  pseudonym={pseudonym}
                  onSend={chatActive ? handleSend : undefined}
                  disabled={!chatActive}
                  readOnly={!chatActive || askPseudonym}
                  emptyLabel={
                    chatActive
                      ? "Soyez le premier à écrire un message."
                      : config.isLive
                        ? "Le chat est désactivé pour ce direct."
                        : "Le chat sera disponible pendant le direct."
                  }
                />
              </div>
              {chatActive && askPseudonym && <PseudonymGate onSubmit={handlePseudonym} />}
            </div>
          )}

          {activeTab === "priere" && (
            <div className="flex h-full min-h-0 flex-col">
              <PrayerTab />
            </div>
          )}

          {activeTab === "notes" && (
            <div className="flex h-full min-h-0 flex-col">
              <NotesTab
                sermonTitle={config.sermonTitle}
                sermonReference={config.sermonReference}
                sermonPoints={config.sermonPoints}
              />
            </div>
          )}

          {activeTab === "description" && (
            <div className="flex h-full min-h-0 flex-col">
              <DescriptionTab description={config.description} />
            </div>
          )}
        </div>
      </aside>
    </section>
  );
}
