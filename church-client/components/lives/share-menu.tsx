"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/* Brand glyphs (lucide no longer ships brand icons). */
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.043z" />
  </svg>
);
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Advanced share control: native Web Share on mobile, with a desktop popover
 * offering copy-to-clipboard, an optional "start at {mm:ss}" timestamped link
 * (built from the player's current time), and direct social targets.
 */
export function ShareMenu({ slug, title, getTime }: { slug: string; title: string; getTime: () => number }) {
  const [open, setOpen] = useState(false);
  const [withTime, setWithTime] = useState(false);
  const [time, setTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const [canNativeShare] = useState(() => typeof navigator !== "undefined" && typeof navigator.share === "function");
  const ref = useRef<HTMLDivElement>(null);

  // Close the popover on an outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const buildUrl = (): string => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const base = `${origin}/lives-archives?v=${encodeURIComponent(slug)}`;
    return withTime ? `${base}&t=${Math.floor(time)}` : base;
  };

  const toggleTimestamp = () => {
    setTime(getTime());
    setWithTime((v) => !v);
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, url: buildUrl() });
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const social = (target: "whatsapp" | "facebook" | "twitter") => {
    const url = encodeURIComponent(buildUrl());
    const text = encodeURIComponent(title);
    const href =
      target === "whatsapp"
        ? `https://wa.me/?text=${text}%20${url}`
        : target === "facebook"
          ? `https://www.facebook.com/sharer/sharer.php?u=${url}`
          : `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => (canNativeShare ? handleNativeShare() : setOpen((o) => !o))}
        aria-label="Partager"
        className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-black/60"
      >
        <Share2 className="size-3.5" /> Partager
      </button>

      {open && !canNativeShare && (
        <div className="absolute top-full left-0 z-10 mt-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-[#1b1436] p-2 text-white shadow-2xl">
          <button
            type="button"
            onClick={handleCopy}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition hover:bg-white/5"
          >
            {copied ? <Check className="size-4 text-online" /> : <Copy className="size-4 text-gold" />}
            {copied ? "Lien copié !" : "Copier le lien"}
          </button>

          <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-white/5">
            <span>Démarrer à {formatTimestamp(time)}</span>
            <input type="checkbox" checked={withTime} onChange={toggleTimestamp} className="size-4 cursor-pointer accent-gold" />
          </label>

          <div className="my-1 h-px bg-white/10" />

          <div className="grid grid-cols-3 gap-1">
            <SocialButton label="WhatsApp" color="#25d366" onClick={() => social("whatsapp")}>
              <WhatsAppIcon />
            </SocialButton>
            <SocialButton label="Facebook" color="#1877f2" onClick={() => social("facebook")}>
              <FacebookIcon />
            </SocialButton>
            <SocialButton label="Twitter" color="#1da1f2" onClick={() => social("twitter")}>
              <TwitterIcon />
            </SocialButton>
          </div>
        </div>
      )}
    </div>
  );
}

function SocialButton({
  label,
  color,
  onClick,
  children,
}: {
  label: string;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex cursor-pointer flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-semibold text-white/70 transition hover:bg-white/5"
    >
      <span style={{ color }}>{children}</span>
      {label}
    </button>
  );
}
