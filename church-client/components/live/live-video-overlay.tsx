"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";

import { cn } from "@/lib/utils";
import { DEFAULT_STUDIO_SETTINGS, type ScripturePayload, type StudioSettings, type StudioAnimation } from "@/lib/studio";

/* ── Animation Easing Map ───────────────────────────────────────── */
const EASING_MAP: Record<string, string | number[]> = {
  linear: "linear",
  "ease-in": "easeIn",
  "ease-out": "easeOut",
  "ease-in-out": "easeInOut",
  bounce: [0.175, 0.885, 0.32, 1.275], // elastic spring-like bounce curve
};

/* ── Modular Animation Plugins ──────────────────────────────────── */
export type OverlayAnimationPlugin = {
  name: string;
  getVariants: (durationMs: number, ease: any) => Variants;
};

export const ANIMATION_PLUGINS: Record<string, OverlayAnimationPlugin> = {
  fade_slide: {
    name: "Fondu & Glissement",
    getVariants: (dur, ease) => ({
      initial: { opacity: 0, y: 30 },
      animate: { opacity: 1, y: 0, transition: { duration: dur / 1000, ease } },
      exit: { opacity: 0, y: 20, transition: { duration: dur / 1000, ease } },
    }),
  },
  scale: {
    name: "Zoom progressif",
    getVariants: (dur, ease) => ({
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1, transition: { duration: dur / 1000, ease } },
      exit: { opacity: 0, scale: 0.93, transition: { duration: dur / 1000, ease } },
    }),
  },
  slide_left: {
    name: "Glissement Gauche",
    getVariants: (dur, ease) => ({
      initial: { opacity: 0, x: -100 },
      animate: { opacity: 1, x: 0, transition: { duration: dur / 1000, ease } },
      exit: { opacity: 0, x: -50, transition: { duration: dur / 1000, ease } },
    }),
  },
  slide_right: {
    name: "Glissement Droite",
    getVariants: (dur, ease) => ({
      initial: { opacity: 0, x: 100 },
      animate: { opacity: 1, x: 0, transition: { duration: dur / 1000, ease } },
      exit: { opacity: 0, x: 50, transition: { duration: dur / 1000, ease } },
    }),
  },
  clip_reveal: {
    name: "Déploiement (Clip-path)",
    getVariants: (dur, ease) => ({
      initial: { clipPath: "polygon(0 0, 0 0, 0 100%, 0% 100%)", opacity: 0.5 },
      animate: { clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)", opacity: 1, transition: { duration: dur / 1000, ease } },
      exit: { clipPath: "polygon(100% 0, 100% 0, 100% 100%, 100% 100%)", opacity: 0, transition: { duration: dur / 1000, ease } },
    }),
  },
  typewriter: {
    name: "Machine à écrire (Stagger)",
    getVariants: (dur, ease) => ({
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: dur / 1000, ease } },
      exit: { opacity: 0, transition: { duration: 0.3 } },
    }),
  },
};

/* ── Typewriter Animator ────────────────────────────────────────── */
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
        animate={{ opacity: [1, 1, 0, 0, 1] }}
        transition={{ repeat: Infinity, duration: 0.8, times: [0, 0.5, 0.5, 1, 1], ease: "linear" }}
        className="ml-0.5 inline-block w-[2px] bg-[#e2b85f] align-middle"
        style={{ height: "1.2em" }}
      >
        &nbsp;
      </motion.span>
    </motion.span>
  );
}

/* ── Helper: Typography Style generator ─────────────────────────── */
const getElementStyle = (prefix: "fontRef" | "fontBody" | "fontVer", s: StudioSettings): React.CSSProperties => {
  const colorVal = s[`${prefix}Color` as keyof StudioSettings] as string;
  const isGradient = colorVal?.includes("gradient");

  const baseStyle: React.CSSProperties = {
    fontFamily: s[`${prefix}Family` as keyof StudioSettings] as string,
    fontSize: `${s[`${prefix}Size` as keyof StudioSettings]}px`,
    fontWeight: s[`${prefix}Weight` as keyof StudioSettings] as string,
    fontStyle: s[`${prefix}Style` as keyof StudioSettings] as string,
    textTransform: s[`${prefix}Transform` as keyof StudioSettings] as any,
    textDecoration: s[`${prefix}Decoration` as keyof StudioSettings] as string,
    letterSpacing: `${s[`${prefix}Spacing` as keyof StudioSettings]}px`,
    lineHeight: s[`${prefix}LineHeight` as keyof StudioSettings] as number,
  };

  if (isGradient) {
    return {
      ...baseStyle,
      backgroundImage: colorVal,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      display: "inline-block",
    };
  }

  return {
    ...baseStyle,
    color: colorVal,
  };
};

/* ── Helper: Container Style generator ───────────────────────────── */
const getContainerStyle = (s: StudioSettings): React.CSSProperties => {
  if (s.containerShape === "transparent") {
    return {
      backgroundColor: "transparent",
      backgroundImage: "none",
      borderStyle: "none",
      borderWidth: "0px",
      boxShadow: "none",
      padding: `${s.containerPaddingY}px ${s.containerPaddingX}px`,
    };
  }

  let borderRadius = `${s.containerBorderRadius}px`;
  if (s.containerShape === "rectangle") borderRadius = "0px";
  if (s.containerShape === "capsule") borderRadius = "9999px";
  if (s.containerShape === "asymmetric") borderRadius = "32px 6px 32px 6px";

  const isGradient = s.containerBg?.includes("gradient");

  const baseStyle: React.CSSProperties = {
    backgroundColor: isGradient ? "transparent" : s.containerBg,
    backgroundImage: isGradient ? s.containerBg : "none",
    borderRadius,
    padding: `${s.containerPaddingY}px ${s.containerPaddingX}px`,
  };

  // Border Style & Width
  const borderW = s.containerBorderWidth;
  const borderCol = s.containerBorderColor || "rgba(255, 255, 255, 0.15)";
  
  if (s.containerBorderStyle === "none") {
    baseStyle.borderStyle = "none";
    baseStyle.borderWidth = "0px";
  } else if (s.containerBorderStyle === "glow") {
    baseStyle.borderStyle = "solid";
    baseStyle.borderWidth = `${borderW}px`;
    baseStyle.borderColor = borderCol;
    baseStyle.boxShadow = `0 0 20px ${borderCol}, inset 0 0 10px ${borderCol}`;
  } else {
    baseStyle.borderStyle = s.containerBorderStyle;
    baseStyle.borderWidth = `${borderW}px`;
    baseStyle.borderColor = borderCol;
  }

  // Shadow Portée
  const shadowStr = `${s.shadowOffsetX}px ${s.shadowOffsetY}px ${s.shadowBlur}px ${s.shadowSpread}px ${s.shadowColor}`;
  if (baseStyle.boxShadow) {
    baseStyle.boxShadow = `${baseStyle.boxShadow}, ${shadowStr}`;
  } else {
    baseStyle.boxShadow = shadowStr;
  }

  return baseStyle;
};

/* ── Predefined Layout Placement mapping ──────────────────────────── */
const PREDEFINED_WRAP_CLASSES: Record<string, string> = {
  lower_third_left: "items-end justify-start pb-[8vh] pl-[6vw] px-4",
  lower_third_right: "items-end justify-end pb-[8vh] pr-[6vw] px-4",
  centered_bottom: "items-end justify-center pb-[8vh] px-4",
  ticker: "items-end justify-center pb-0 px-0",
  full_screen_cinema: "items-center justify-center p-12",
};

const PREDEFINED_CARD_CLASSES: Record<string, string> = {
  lower_third_left: "w-full max-w-xl text-left",
  lower_third_right: "w-full max-w-xl text-left",
  centered_bottom: "w-full max-w-4xl text-center",
  ticker: "w-full max-w-none rounded-none text-center border-x-0 border-b-0",
  full_screen_cinema: "w-full max-w-5xl text-center",
};

export function LiveVideoOverlay({ payload }: { payload: ScripturePayload | null }) {
  const visible = payload?.action === "show" && !!payload.verse;
  const verse = payload?.verse ?? null;
  const s: StudioSettings = { ...DEFAULT_STUDIO_SETTINGS, ...(payload?.settings ?? {}) } as any;

  // Auto-hide after `duration` seconds
  const shownKey = `${payload?.action ?? "hide"}|${verse?.reference ?? ""}|${payload?.at ?? ""}`;
  const [autoHidden, setAutoHidden] = useState(false);
  const [seenKey, setSeenKey] = useState(shownKey);

  if (seenKey !== shownKey) {
    setSeenKey(shownKey);
    setAutoHidden(false);
  }

  useEffect(() => {
    if (!visible || s.duration <= 0) return;
    const t = setTimeout(() => setAutoHidden(true), s.duration * 1000);
    return () => clearTimeout(t);
  }, [visible, shownKey, s.duration]);

  const isCurrentlyVisible = visible && !autoHidden && !!verse;

  if (!verse) return null;

  const hasMultipleTexts = verse.texts && Object.keys(verse.texts).length > 1;
  const textsArray = verse.texts ? Object.entries(verse.texts) : [[verse.translation || "LSG", verse.text]];

  // Positioning
  const isCustom = s.positionMode === "custom";
  const wrapClass = isCustom ? "absolute inset-0 z-30" : cn("pointer-events-none absolute inset-0 z-30 flex", PREDEFINED_WRAP_CLASSES[s.predefinedPosition || "centered_bottom"]);
  const cardClass = isCustom ? "" : cn(PREDEFINED_CARD_CLASSES[s.predefinedPosition || "centered_bottom"]);

  // Custom positioning styles
  const customPosStyle: React.CSSProperties = isCustom ? {
    position: "absolute",
    left: `${s.customX}%`,
    top: `${s.customY}%`,
    width: `${s.customWidth}%`,
    height: `${s.customHeight}%`,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  } : {};

  // Easing & Plugin
  const animEase = EASING_MAP[s.animEasing || "ease-out"] || EASING_MAP["ease-out"];
  const animPlugin = ANIMATION_PLUGINS[s.animation] || ANIMATION_PLUGINS.fade_slide;
  const variants = animPlugin.getVariants(s.animDuration || 500, animEase);

  const containerStyle = {
    ...getContainerStyle(s),
    ...customPosStyle,
  };

  return (
    <div className={wrapClass}>
      <AnimatePresence>
        {isCurrentlyVisible && (
          <motion.div
            key={shownKey}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={containerStyle}
            className={cn(
              "ring-1 ring-white/5",
              cardClass
            )}
          >
            {/* Reference */}
            <span 
              style={getElementStyle("fontRef", s)}
              className="block mb-3"
            >
              {verse.reference}
            </span>

            {/* Content grid */}
            <div className={cn(
              "grid gap-5 w-full",
              hasMultipleTexts && s.predefinedPosition !== "ticker" ? "grid-cols-1 md:grid-cols-2 text-left" : "grid-cols-1"
            )}>
              {textsArray.map(([version, text]) => (
                <div 
                  key={version} 
                  className={cn(
                    "flex flex-col relative py-1",
                    hasMultipleTexts ? "border-l-2 border-white/20 pl-4 text-left" : "border-none"
                  )}
                >
                  <p style={getElementStyle("fontBody", s)}>
                    {s.animation === "typewriter" ? (
                      <TypewriterText text={text} />
                    ) : (
                      text
                    )}
                  </p>
                  <span style={getElementStyle("fontVer", s)} className="mt-2 block">
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
