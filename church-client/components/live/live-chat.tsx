"use client";

import { Send, Smile } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";

import type { ChatMessage } from "@/lib/live";

import { ChatText } from "./chat-text";
import { EmojiPicker } from "./emoji-picker";
import { UserAvatar } from "./user-avatar";

// The token being typed after a trailing "@" (drives mention autocomplete).
const MENTION_TOKEN = /(?:^|\s)@([\p{L}\p{N}_-]*)$/u;

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
  const [emojiOpen, setEmojiOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  // Close the emoji picker on an outside click.
  useEffect(() => {
    if (!emojiOpen) return;
    const onDown = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setEmojiOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [emojiOpen]);

  // Mention autocomplete sourced from recent chat participants.
  const recentAuthors = useMemo(() => {
    const seen: string[] = [];
    for (let i = messages.length - 1; i >= 0 && seen.length < 60; i--) {
      const name = messages[i].author_name;
      if (name !== pseudonym && !seen.includes(name)) seen.push(name);
    }
    return seen;
  }, [messages, pseudonym]);

  const mentionMatch = MENTION_TOKEN.exec(draft);
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : null;
  const suggestions =
    mentionQuery !== null
      ? recentAuthors.filter((a) => a.toLowerCase().includes(mentionQuery)).slice(0, 5)
      : [];

  const applyMention = (name: string) => {
    setDraft((d) => d.replace(/@([\p{L}\p{N}_-]*)$/u, `@${name} `));
    inputRef.current?.focus();
  };

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
            <div key={m.id} className="flex animate-fade-up items-start gap-2.5 text-sm leading-snug">
              <UserAvatar name={m.author_name} className="mt-0.5" />
              <div className="min-w-0">
                <span className="font-semibold text-gold">{m.author_name}</span>
                <span className="ml-2 break-words text-white/80">
                  <ChatText text={m.message} />
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {!readOnly && (
        <form onSubmit={submit} className="relative border-t border-white/10 p-3">
          {suggestions.length > 0 && (
            <div className="absolute inset-x-3 bottom-full mb-1 overflow-hidden rounded-xl border border-white/10 bg-[#1b1436] shadow-xl">
              {suggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => applyMention(name)}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/5"
                >
                  <UserAvatar name={name} />
                  <span className="truncate">{name}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 focus-within:border-gold/40">
            <div ref={emojiRef} className="relative shrink-0">
              {emojiOpen && (
                <div className="absolute bottom-full left-0 z-20 mb-2">
                  <EmojiPicker
                    onPick={(emoji) => {
                      setDraft((d) => d + emoji);
                      inputRef.current?.focus();
                    }}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => setEmojiOpen((o) => !o)}
                disabled={disabled}
                aria-label="Ajouter un emoji"
                className="grid size-7 cursor-pointer place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-gold disabled:opacity-40"
              >
                <Smile className="size-5" />
              </button>
            </div>
            <input
              ref={inputRef}
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
