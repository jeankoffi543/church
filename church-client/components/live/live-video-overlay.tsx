"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, type Variants, type Easing } from "framer-motion";

import { cn } from "@/lib/utils";
import { DEFAULT_STUDIO_SETTINGS, type ScripturePayload, type StudioSettings } from "@/lib/studio";

// The overlay is laid out in the SAME logical composition space the régie
// authors in (see stage-monitor.tsx): a 1920×1080 stage contain-fitted onto the
// player and scaled down. Every px style then renders at the exact metric the
// studio preview/canvas uses — identical on desktop, tablet and phone.
const COMP_W = 1920;
const COMP_H = 1080;

/* ── Animation Easing Map ───────────────────────────────────────── */
const EASING_MAP: Record<string, Easing> = {
  linear: "linear",
  "ease-in": "easeIn",
  "ease-out": "easeOut",
  "ease-in-out": "easeInOut",
  bounce: [0.175, 0.885, 0.32, 1.275] as Easing, // elastic spring-like bounce curve
};

/* ── Modular Animation Plugins ──────────────────────────────────── */
export type OverlayAnimationPlugin = {
  name: string;
  getVariants: (durationMs: number, ease: Easing) => Variants;
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
    textTransform: s[`${prefix}Transform` as keyof StudioSettings] as React.CSSProperties["textTransform"],
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

/* ── Predefined Layout Placement mapping ──────────────────────────────
 * Same % boxes as the régie (studio-style.ts getPredefinedAbsolutePosition +
 * program-out PREDEFINED_BOX), so a preset lands at the exact same spot on the
 * public overlay as on the studio preview and the burned-in broadcast. */
const PREDEFINED_BOX: Record<string, React.CSSProperties> = {
  lower_third_left: { left: "6%", top: "72%", width: "40%", height: "20%" },
  lower_third_right: { left: "54%", top: "72%", width: "40%", height: "20%" },
  centered_top: { left: "10%", top: "8%", width: "80%", height: "20%" },
  ticker: { left: "0%", top: "86%", width: "100%", height: "14%" },
  banner_top: { left: "0%", top: "0%", width: "100%", height: "14%" },
  full_screen_cinema: { left: "10%", top: "10%", width: "80%", height: "80%" },
  full_screen: { left: "0%", top: "0%", width: "100%", height: "100%" },
  pip_top_left: { left: "4%", top: "5%", width: "34%", height: "34%" },
  pip_top_right: { left: "62%", top: "5%", width: "34%", height: "34%" },
  pip_bottom_left: { left: "4%", top: "61%", width: "34%", height: "34%" },
  pip_bottom_right: { left: "62%", top: "61%", width: "34%", height: "34%" },
  centered_bottom: { left: "10%", top: "72%", width: "80%", height: "20%" },
};

export function LiveVideoOverlay({ payload }: { payload: ScripturePayload | null }) {
  const visible = payload?.action === "show" && !!payload.verse;
  const verse = payload?.verse ?? null;
  const s: StudioSettings = { ...DEFAULT_STUDIO_SETTINGS, ...(payload?.settings ?? {}) } as StudioSettings;

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

  // Contain-fit the 16:9 composition inside the player area (any device size).
  // Wired through a CALLBACK ref: the component returns null until a verse
  // exists, so a mount-time effect would never see the element — the observer
  // must attach whenever the node (re)appears. setState is guarded by a 1px
  // threshold so sub-pixel ResizeObserver ticks can't re-render in a loop.
  const roRef = useRef<ResizeObserver | null>(null);
  const [fit, setFit] = useState({ w: 0, h: 0, x: 0, y: 0 });
  const hostRef = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    roRef.current = null;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      const k = Math.min(width / COMP_W, height / COMP_H);
      const w = Math.round(COMP_W * k);
      const h = Math.round(COMP_H * k);
      const x = Math.round((width - w) / 2);
      const y = Math.round((height - h) / 2);
      setFit((prev) =>
        Math.abs(prev.w - w) < 1 && Math.abs(prev.h - h) < 1 && prev.x === x && prev.y === y
          ? prev
          : { w, h, x, y },
      );
    };
    measure();
    roRef.current = new ResizeObserver(measure);
    roRef.current.observe(el);
  }, []);
  useEffect(() => () => roRef.current?.disconnect(), []);
  const k = fit.w > 0 ? fit.w / COMP_W : 0;

  const isCurrentlyVisible = visible && !autoHidden && !!verse;

  if (!verse) return null;

  const hasMultipleTexts = verse.texts && Object.keys(verse.texts).length > 1;
  const textsArray = verse.texts ? Object.entries(verse.texts) : [[verse.translation || "LSG", verse.text]];

  // Geometry in composition space — the SAME % boxes the régie composes with.
  const isCustom = s.positionMode === "custom";
  // Dynamic frame (parity with the studio): the OUTER box keeps its configured
  // geometry; the INNER container hugs long verses and overflows the box in the
  // operator-chosen direction (overflowDirection).
  const rawBox = isCustom
    ? {
        left: `${s.customX}%`,
        top: `${s.customY}%`,
        width: `${s.customWidth}%`,
        height: `${s.customHeight}%`,
      }
    : { ...(PREDEFINED_BOX[s.predefinedPosition || "centered_bottom"] ?? PREDEFINED_BOX.centered_bottom) };
  const dir = s.overflowDirection ?? "down";
  const boxStyle: React.CSSProperties = {
    position: "absolute",
    ...rawBox,
    display: "flex",
    flexDirection: "column",
    justifyContent: dir === "up" ? "flex-end" : dir === "center" ? "center" : "flex-start",
  };
  const innerStyle: React.CSSProperties = {
    minHeight: "100%",
    width: "100%",
    // Without this the fixed-height flex box squashes the container below its
    // content (default flex-shrink) and the frame never hugs a long verse.
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent:
      s.textVerticalAlign === "top" ? "flex-start" : s.textVerticalAlign === "bottom" ? "flex-end" : "center",
    textAlign: (s.textAlign as React.CSSProperties["textAlign"]) ?? "center",
  };

  // Easing & Plugin
  const animEase = EASING_MAP[s.animEasing || "ease-out"] || EASING_MAP["ease-out"];
  const animPlugin = ANIMATION_PLUGINS[s.animation] || ANIMATION_PLUGINS.fade_slide;
  const variants = animPlugin.getVariants(s.animDuration || 500, animEase);

  const containerStyle = getContainerStyle(s);

  return (
    <div ref={hostRef} className="pointer-events-none absolute inset-0 z-30">
      {k > 0 && (
        <div
          className="absolute overflow-hidden"
          style={{ left: fit.x, top: fit.y, width: fit.w, height: fit.h, contain: "strict" }}
        >
          <div
            className="absolute top-0 left-0"
            style={{
              width: COMP_W,
              height: COMP_H,
              transform: `scale(${k})`,
              transformOrigin: "top left",
            }}
          >
      <AnimatePresence>
        {isCurrentlyVisible && (
          <motion.div
            key={shownKey}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={boxStyle}
          >
            <div style={{ ...containerStyle, ...innerStyle }} className="ring-1 ring-white/5">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
