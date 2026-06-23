"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type Category = { id: string; icon: string; label: string; emojis: string[] };

const CATEGORIES: Category[] = [
  {
    id: "smileys",
    icon: "😀",
    label: "Émotions",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘",
      "😋", "😛", "😝", "🤪", "🤨", "🧐", "🤓", "😎", "🥳", "😏", "😔", "😟", "🙁", "😣", "😫", "😩",
      "🥺", "😢", "😭", "😤", "😠", "😡", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😥", "😓", "🤗", "🤔",
      "🤭", "🤫", "😶", "😐", "😑", "🙄", "😮", "😲", "🥱", "😴", "🤤", "😵", "🤐", "🥴", "🤢", "🤧",
    ],
  },
  {
    id: "gestures",
    icon: "👍",
    label: "Gestes",
    emojis: [
      "👍", "👎", "👏", "🙌", "🙏", "👋", "🤝", "✊", "👊", "🤛", "🤜", "🤚", "✋", "🖐️", "🖖", "👌",
      "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "👈", "👉", "👆", "👇", "☝️", "💪", "🦾", "👀", "🧠", "🗣️",
    ],
  },
  {
    id: "hearts",
    icon: "❤️",
    label: "Cœurs",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖",
      "💘", "💝", "💟", "❤️‍🔥", "💌", "💋", "😻",
    ],
  },
  {
    id: "faith",
    icon: "🙏",
    label: "Foi",
    emojis: [
      "🙏", "✝️", "📖", "🕊️", "👑", "🔥", "⛪", "🕯️", "😇", "👼", "🎶", "🎵", "🎼", "🎤", "🥁", "🎹",
      "📿", "🛐", "✨", "💫", "⭐", "🌟",
    ],
  },
  {
    id: "nature",
    icon: "🌿",
    label: "Nature",
    emojis: [
      "🌿", "🌸", "🌺", "🌻", "🌹", "🌷", "🌳", "🌲", "🍀", "🌈", "☀️", "🌙", "⚡", "💧", "🌊", "🦁",
      "🦅", "🐑", "🐝", "🦋", "🍇", "🍞", "🌾", "🕯️",
    ],
  },
  {
    id: "party",
    icon: "🎉",
    label: "Fête",
    emojis: [
      "🎉", "🎊", "🥳", "🎈", "🎁", "🏆", "🥇", "🎯", "📣", "📢", "💯", "✅", "❎", "💡", "🔔", "📅",
      "🕒", "🔑", "🎓", "🧧", "🎀", "🪅",
    ],
  },
];

/** Dependency-free, categorised emoji picker for the chat input. */
export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [cat, setCat] = useState(0);

  return (
    <div className="w-[268px] rounded-xl border border-white/10 bg-[#1b1436] p-2 shadow-2xl">
      <div className="mb-1.5 flex gap-1 border-b border-white/10 pb-1.5">
        {CATEGORIES.map((c, i) => (
          <button
            key={c.id}
            type="button"
            title={c.label}
            onClick={() => setCat(i)}
            className={cn(
              "grid size-7 flex-1 cursor-pointer place-items-center rounded-lg text-base transition",
              i === cat ? "bg-white/10" : "hover:bg-white/5",
            )}
          >
            {c.icon}
          </button>
        ))}
      </div>
      <div className="grid max-h-[180px] grid-cols-7 gap-0.5 overflow-y-auto [scrollbar-width:thin]">
        {CATEGORIES[cat].emojis.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onPick(e)}
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-lg transition hover:bg-white/10"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
