"use client";

import { useRef, useState } from "react";
import { ShieldCheck, Send, Check, Download, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  INITIAL_CHAT,
  SERMON_NOTES,
  type ChatMessage,
} from "@/lib/data";

export type LiveTab = "chat" | "priere" | "notes";

const TABS: { id: LiveTab; label: string }[] = [
  { id: "chat", label: "Tchat" },
  { id: "priere", label: "Prière" },
  { id: "notes", label: "Notes" },
];

export function LivePanel({
  tab,
  onTabChange,
  chatEnabled = true,
}: {
  tab: LiveTab;
  onTabChange: (t: LiveTab) => void;
  chatEnabled?: boolean;
}) {
  // Hide the chat tab when the module is disabled in the backoffice.
  const tabs = chatEnabled ? TABS : TABS.filter((t) => t.id !== "chat");

  return (
    <div className="flex max-h-[660px] min-h-[540px] flex-[1_1_340px] flex-col overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.04]">
      {/* Tab bar */}
      <div className="flex border-b border-white/10">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className="relative flex-1 cursor-pointer px-1.5 py-4 text-[13px] font-bold text-white transition-colors hover:bg-white/5"
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute right-1/5 bottom-0 left-1/5 h-[2.5px] rounded-sm bg-gold" />
            )}
          </button>
        ))}
      </div>

      {tab === "chat" && chatEnabled && <ChatTab />}
      {tab === "priere" && <PrayerTab />}
      {tab === "notes" && <NotesTab />}
    </div>
  );
}

/* ── Tchat ────────────────────────────────────────────────── */
function ChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [draft, setDraft] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { name: "Vous", you: true, text }]);
    setDraft("");
    requestAnimationFrame(() => {
      if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1.5 border-b border-white/[0.07] px-4 py-2.5 text-[11.5px] text-white/45">
        <ShieldCheck className="size-3.5" /> Tchat modéré — restons bienveillants
      </div>
      <div
        ref={boxRef}
        className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-4"
      >
        {messages.map((msg, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            <span
              className={cn(
                "flex items-center gap-1.5 text-[11.5px] font-bold",
                msg.you ? "text-white/80" : "text-gold"
              )}
            >
              {msg.name}
              {msg.mod && (
                <span className="rounded-[5px] bg-gold/20 px-1.5 py-px text-[9px] tracking-wide text-gold">
                  MODÉRATEUR
                </span>
              )}
            </span>
            <span className="text-sm leading-snug text-white/85">{msg.text}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-white/10 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Écris un message…"
          className="flex-1 rounded-[10px] border border-white/15 bg-white/10 px-3 py-[11px] text-sm text-white outline-none placeholder:text-white/40"
        />
        <button
          onClick={send}
          aria-label="Envoyer"
          className="flex w-11 items-center justify-center rounded-[10px] bg-gradient-to-br from-gold to-gold-dark text-indigo transition hover:brightness-105"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Prière ───────────────────────────────────────────────── */
function PrayerTab() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="flex flex-1 animate-fade-up flex-col items-center justify-center gap-4 px-5 py-5 text-center">
        <div className="flex size-[72px] items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-dark text-[34px] text-indigo">
          <Check className="size-9" />
        </div>
        <h3 className="font-display text-[26px] text-white italic">
          Nous prions pour toi
        </h3>
        <p className="max-w-[260px] text-sm leading-relaxed text-white/65">
          Ta demande a été transmise. Tu n&apos;es pas seul(e) — la Maison se
          tient avec toi dans la prière.
        </p>
        <button
          onClick={() => setSent(false)}
          className="cursor-pointer rounded-[10px] border border-white/20 bg-white/10 px-[22px] py-[11px] text-[13px] font-semibold text-white transition hover:bg-white/15"
        >
          Nouvelle demande
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3.5 p-5">
      <div>
        <h3 className="mb-2 font-display text-[23px] text-white italic">
          Demande de prière
        </h3>
        <p className="text-[13.5px] leading-snug text-white/60">
          Tu traverses une épreuve ? L&apos;équipe d&apos;intercession prie avec
          toi, en toute confidentialité.
        </p>
      </div>
      <textarea
        placeholder="Partage ton sujet de prière…"
        className="min-h-[120px] flex-1 resize-none rounded-xl border border-white/15 bg-white/10 p-3.5 text-sm leading-relaxed text-white outline-none placeholder:text-white/40"
      />
      <button
        onClick={() => setSent(true)}
        className="cursor-pointer rounded-xl bg-gradient-to-br from-gold to-gold-dark py-3.5 text-[15px] font-bold text-indigo transition hover:brightness-105"
      >
        Envoyer ma demande
      </button>
      <div className="flex items-center justify-center gap-1.5 text-center text-[11.5px] text-white/45">
        <Lock className="size-3" /> Confidentiel · transmis à l&apos;équipe
        d&apos;intercession
      </div>
    </div>
  );
}

/* ── Notes ────────────────────────────────────────────────── */
function NotesTab() {
  return (
    <div className="flex-1 overflow-y-auto p-5">
      <span className="text-[11px] font-bold tracking-[0.12em] text-gold uppercase">
        Notes du sermon
      </span>
      <h3 className="mt-1.5 mb-1 font-display text-2xl text-white italic">
        La grâce qui transforme
      </h3>
      <div className="mb-5 text-[13px] text-white/55">Romains 5.1-11</div>
      <div className="flex flex-col gap-3.5">
        {SERMON_NOTES.map((p) => (
          <div key={p.n} className="flex items-start gap-3">
            <span className="w-6 shrink-0 font-display text-lg font-bold text-gold-dark italic">
              {p.n}
            </span>
            <div>
              <div className="text-[14.5px] font-semibold leading-tight text-white">
                {p.title}
              </div>
              <div className="mt-0.5 text-[12.5px] text-white/50">{p.verse}</div>
            </div>
          </div>
        ))}
      </div>
      <button className="mt-[22px] flex w-full items-center justify-center gap-1.5 rounded-[11px] border border-white/15 bg-white/10 py-3 text-[13px] font-semibold text-white transition hover:bg-white/15">
        <Download className="size-4" /> Télécharger les notes (PDF)
      </button>
    </div>
  );
}
