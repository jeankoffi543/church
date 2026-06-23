"use client";

import { Send } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";

import type { ChatMessage } from "@/lib/live";

/**
 * Synchronous chat panel. Auto-sticks to the newest message unless the reader
 * has scrolled up to revisit history. Reused, in read-only mode, by the
 * time-synced replay on the archives page.
 */
export function LiveChat({
  messages,
  pseudonym,
  onSend,
  disabled = false,
  readOnly = false,
  emptyLabel = "Soyez le premier à écrire un message.",
}: {
  messages: ChatMessage[];
  pseudonym: string | null;
  onSend?: (message: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  emptyLabel?: string;
}) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  // Track whether we're pinned to the bottom (so a new message doesn't yank the
  // reader away from older messages they're reading).
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  useLayoutEffect(() => {
    if (stickRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || disabled || !onSend) return;
    onSend(text);
    setDraft("");
    stickRef.current = true;
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4 [scrollbar-width:thin]"
      >
        {messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-white/35">{emptyLabel}</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="animate-fade-up text-sm leading-snug">
              <span className="font-semibold text-gold">{m.author_name}</span>
              <span className="ml-2 break-words text-white/80">{m.message}</span>
            </div>
          ))
        )}
      </div>

      {!readOnly && (
        <form onSubmit={submit} className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 focus-within:border-gold/40">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
              disabled={disabled}
              placeholder={pseudonym ? `Message en tant que ${pseudonym}…` : "Votre message…"}
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={disabled || draft.trim().length === 0}
              aria-label="Envoyer"
              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg bg-gold/90 text-ink transition hover:bg-gold disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** First-message gate: capture an ephemeral pseudonym before chatting. */
export function PseudonymGate({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (trimmed) onSubmit(trimmed);
      }}
      className="border-t border-white/10 p-3"
    >
      <p className="mb-2 px-1 text-xs text-white/50">Choisissez un pseudo pour participer au chat.</p>
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 focus-within:border-gold/40">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="Votre pseudo…"
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
        />
        <button
          type="submit"
          disabled={name.trim().length === 0}
          className="shrink-0 cursor-pointer rounded-lg bg-gold/90 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-gold disabled:opacity-40"
        >
          Rejoindre
        </button>
      </div>
    </form>
  );
}
