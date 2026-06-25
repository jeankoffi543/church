"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";

import { cn } from "@/lib/utils";
import { DEFAULT_STUDIO_SETTINGS, type ScripturePayload, type StudioSettings, type StudioAnimation } from "@/lib/studio";

/* ── Settings → presentation maps ───────────────────────────────── */

const LAYOUT_WRAP: Record<StudioSettings["layout"], string> = {
  lower_third: "items-end justify-center pb-[8vh] px-4",
  full_screen: "items-center justify-center p-6",
  sidebar: "items-center justify-end pr-[4vw] py-6",
};

const LAYOUT_CARD: Record<StudioSettings["layout"], string> = {
  lower_third: "w-full max-w-4xl text-center",
  full_screen: "w-full max-w-3xl text-center",
  sidebar: "w-full max-w-sm text-left",
};

const BACKGROUND_STYLES: Record<string, string> = {
  gradient_purple: "linear-gradient(135deg, rgba(27, 15, 58, 0.96) 0%, rgba(22, 15, 51, 0.92) 50%, rgba(11, 7, 32, 0.96) 100%)",
  blur: "rgba(0, 0, 0, 0.35)",
  solid_dark: "rgba(11, 7, 32, 0.96)",
  none: "transparent",
};

const FONT_STYLES: Record<string, string> = {
  "Cormorant Garamond": "'Cormorant Garamond', Georgia, serif",
  "Plus Jakarta Sans": "'Plus Jakarta Sans', system-ui, sans-serif",
};

const ANIMATION_VARIANTS: Record<StudioAnimation, Variants> = {
  fade_slide: {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as any } },
    exit: { opacity: 0, y: 20, transition: { duration: 0.3 } },
  },
  scale: {
    initial: { opacity: 0, scale: 0.93 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as any } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.3 } },
  },
  typewriter: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.3 } },
  },
  neon_slide: {
    initial: { x: "-100vw", opacity: 0 },
    animate: {
      x: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 75, damping: 14, mass: 1 },
    },
    exit: { x: "-100vw", opacity: 0, transition: { duration: 0.3 } },
  },
};

/* ── Typewriter Animation with Stagger ──────────────────────────── */

const typewriterContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.015,
    },
  },
};

const typewriterChar = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.04 },
  },
};

function TypewriterText({ text }: { text: string }) {
  const characters = Array.from(text);
  return (
    <motion.span variants={typewriterContainer} initial="hidden" animate="visible" className="inline">
      {characters.map((char, index) => (
        <motion.span key={index} variants={typewriterChar} className="inline">
          {char}
        </motion.span>
      ))}
      <motion.span
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ repeat: Infinity, duration: 0.8, ease: "steps(2)" as any }}
        className="ml-0.5 inline-block w-[2px] bg-gold align-middle"
        style={{ height: "1.2em" }}
      >
        &nbsp;
      </motion.span>
    </motion.span>
  );
}

/* ── Main Component ─────────────────────────────────────────────── */

export function LiveVideoOverlay({ payload }: { payload: ScripturePayload | null }) {
  const visible = payload?.action === "show" && !!payload.verse;
  const verse = payload?.verse ?? null;
  const settings: StudioSettings = { ...DEFAULT_STUDIO_SETTINGS, ...(payload?.settings ?? {}) };

  // Auto-hide after `duration` seconds (0 = stays until the régie hides it).
  const shownKey = `${payload?.action ?? "hide"}|${verse?.reference ?? ""}|${payload?.at ?? ""}`;
  const [autoHidden, setAutoHidden] = useState(false);
  const [seenKey, setSeenKey] = useState(shownKey);

  // Reset the auto-hide whenever a new overlay arrives
  if (seenKey !== shownKey) {
    setSeenKey(shownKey);
    setAutoHidden(false);
  }

  useEffect(() => {
    if (!visible || settings.duration <= 0) return;
    const t = setTimeout(() => setAutoHidden(true), settings.duration * 1000);
    return () => clearTimeout(t);
  }, [visible, shownKey, settings.duration]);

  const isCurrentlyVisible = visible && !autoHidden && !!verse;

  if (!verse) return null;

  // Prepare texts for single or multi-version display
  const hasMultipleTexts = verse.texts && Object.keys(verse.texts).length > 1;
  const textsArray = verse.texts ? Object.entries(verse.texts) : [[verse.translation || "LSG", verse.text]];

  // Inline styling with design tokens as CSS variables
  const overlayBg = BACKGROUND_STYLES[settings.background] ?? settings.background;
  const overlayFont = FONT_STYLES[settings.font] ?? settings.font;

  const customStyle = {
    "--overlay-bg": overlayBg,
    "--overlay-font": overlayFont,
    background: settings.background === "blur" ? undefined : "var(--overlay-bg)",
    fontFamily: "var(--overlay-font)",
    ...(settings.animation === "neon_slide" && {
      "--overlay-glow": "rgba(168, 85, 247, 0.55)",
      "--tw-shadow": "0 0 30px var(--overlay-glow), 0 24px 80px rgba(0, 0, 0, 0.55)",
      boxShadow: "var(--tw-shadow)",
    }),
  } as React.CSSProperties;

  return (
    <div className={cn("pointer-events-none absolute inset-0 z-30 flex", LAYOUT_WRAP[settings.layout])}>
      <AnimatePresence>
        {isCurrentlyVisible && (
          <motion.div
            key={shownKey}
            variants={ANIMATION_VARIANTS[settings.animation] ?? ANIMATION_VARIANTS.fade_slide}
            initial="initial"
            animate="animate"
            exit="exit"
            style={customStyle}
            className={cn(
              "rounded-2xl px-7 py-6",
              settings.background === "blur" && "backdrop-blur-xl ring-1 ring-white/15 bg-black/35",
              settings.background !== "blur" && "ring-1 ring-white/10",
              settings.animation !== "neon_slide" && "shadow-[0_24px_80px_rgba(0,0,0,0.55)]",
              LAYOUT_CARD[settings.layout]
            )}
          >
            <span className="text-[11px] font-bold tracking-[0.25em] text-gold uppercase block mb-3">
              {verse.reference}
            </span>

            <div className={cn(
              "grid gap-5 w-full",
              hasMultipleTexts && settings.layout !== "sidebar" ? "grid-cols-1 md:grid-cols-2 text-left" : "grid-cols-1"
            )}>
              {textsArray.map(([version, text]) => (
                <div 
                  key={version} 
                  className={cn(
                    "flex flex-col relative py-1",
                    hasMultipleTexts ? "border-l-2 border-gold/30 pl-4 text-left" : "border-none"
                  )}
                >
                  <p
                    className={cn(
                      "leading-snug text-white",
                      settings.layout === "full_screen"
                        ? "text-[clamp(1.5rem,3.6vw,2.8rem)]"
                        : settings.layout === "sidebar"
                          ? "text-[clamp(1rem,1.8vw,1.35rem)]"
                          : "text-[clamp(1.2rem,2.4vw,1.9rem)]",
                    )}
                  >
                    {settings.animation === "typewriter" ? (
                      <TypewriterText text={text} />
                    ) : (
                      text
                    )}
                  </p>
                  <span className={cn(
                    "font-sans italic text-gold/80 mt-2 block",
                    settings.layout === "full_screen"
                      ? "text-[clamp(0.9rem,1.8vw,1.2rem)]"
                      : settings.layout === "sidebar"
                        ? "text-[clamp(0.75rem,1.2vw,0.9rem)]"
                        : "text-[clamp(0.8rem,1.5vw,1rem)]"
                  )}>
                    {version}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
