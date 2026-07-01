"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { motion, type Variants, type Easing } from "framer-motion";

import type { ScriptureVerse } from "@/lib/studio";
import { cn } from "@/lib/utils";
import { getContainerStyle, getElementStyle, getOverlayBoxStyle } from "./studio-style";
import { isBackgroundLayer, imageHatch, type StudioLayer } from "./studio-layers";
import { resolveEmbed } from "./embed";
import {
  attachMediaMeter,
  attachYouTube,
  registerAudioProbe,
  youtubeId,
  type MediaMeter,
  type YouTubeController,
} from "./studio-audio";
import { registerVideoController, type VideoController } from "./studio-video";
import { MONO } from "./studio-tokens";

const EASING_MAP: Record<string, Easing> = {
  linear: "linear",
  "ease-in": "easeIn",
  "ease-out": "easeOut",
  "ease-in-out": "easeInOut",
  bounce: [0.175, 0.885, 0.32, 1.275] as Easing,
};

const ANIMATION_PLUGINS: Record<string, (dur: number, ease: Easing) => Variants> = {
  none: () => ({
    initial: {},
    animate: {},
    exit: {},
  }),
  fade_slide: (dur, ease) => ({
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0, transition: { duration: dur / 1000, ease } },
    exit: { opacity: 0, y: 20, transition: { duration: dur / 1000, ease } },
  }),
  scale: (dur, ease) => ({
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1, transition: { duration: dur / 1000, ease } },
    exit: { opacity: 0, scale: 0.93, transition: { duration: dur / 1000, ease } },
  }),
  slide_left: (dur, ease) => ({
    initial: { opacity: 0, x: -100 },
    animate: { opacity: 1, x: 0, transition: { duration: dur / 1000, ease } },
    exit: { opacity: 0, x: -50, transition: { duration: dur / 1000, ease } },
  }),
  slide_right: (dur, ease) => ({
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0, transition: { duration: dur / 1000, ease } },
    exit: { opacity: 0, x: 50, transition: { duration: dur / 1000, ease } },
  }),
  clip_reveal: (dur, ease) => ({
    initial: { clipPath: "polygon(0 0, 0 0, 0 100%, 0% 100%)", opacity: 0.5 },
    animate: { clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)", opacity: 1, transition: { duration: dur / 1000, ease } },
    exit: { clipPath: "polygon(100% 0, 100% 0, 100% 100%, 100% 100%)", opacity: 0, transition: { duration: dur / 1000, ease } },
  }),
  neon_slide: (dur, ease) => ({
    initial: { opacity: 0, x: -80, scale: 0.98 },
    animate: { opacity: 1, x: 0, scale: 1, transition: { duration: dur / 1000, ease } },
    exit: { opacity: 0, x: 40, scale: 0.98, transition: { duration: dur / 1000, ease } },
  }),
  typewriter: (dur, ease) => ({
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: dur / 1000, ease } },
    exit: { opacity: 0, transition: { duration: 0.3 } },
  }),
  scroll_left: (dur) => ({
    initial: { x: "100%" },
    animate: {
      x: "-100%",
      transition: {
        x: {
          repeat: Infinity,
          repeatType: "loop",
          duration: dur > 100 ? (dur * 12) / 1000 : 12,
          ease: "linear",
        },
      },
    },
    exit: { opacity: 0 },
  }),
  scroll_right: (dur) => ({
    initial: { x: "-100%" },
    animate: {
      x: "100%",
      transition: {
        x: {
          repeat: Infinity,
          repeatType: "loop",
          duration: dur > 100 ? (dur * 12) / 1000 : 12,
          ease: "linear",
        },
      },
    },
    exit: { opacity: 0 },
  }),
  scroll_up: (dur) => ({
    initial: { y: "100%" },
    animate: {
      y: "-100%",
      transition: {
        y: {
          repeat: Infinity,
          repeatType: "loop",
          duration: dur > 100 ? (dur * 12) / 1000 : 12,
          ease: "linear",
        },
      },
    },
    exit: { opacity: 0 },
  }),
  scroll_down: (dur) => ({
    initial: { y: "-100%" },
    animate: {
      y: "100%",
      transition: {
        y: {
          repeat: Infinity,
          repeatType: "loop",
          duration: dur > 100 ? (dur * 12) / 1000 : 12,
          ease: "linear",
        },
      },
    },
    exit: { opacity: 0 },
  }),
};

const getImageUrl = (url: string | undefined | null): string => {
  if (!url) return "";
  if (url.startsWith("blob:") || url.startsWith("data:") || url.startsWith("http:") || url.startsWith("https:")) {
    return url;
  }
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const backendUrl = apiUrl ? apiUrl.replace("/api/v1", "") : "http://127.0.0.1:8000";
  return url.startsWith("/") ? `${backendUrl}${url}` : url;
};

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

export type ResizeCorner = "nw" | "ne" | "sw" | "se";

const CORNER_POS: Record<ResizeCorner, string> = {
  nw: "-top-1.5 -left-1.5 cursor-nw-resize",
  ne: "-top-1.5 -right-1.5 cursor-ne-resize",
  sw: "-bottom-1.5 -left-1.5 cursor-sw-resize",
  se: "-bottom-1.5 -right-1.5 cursor-se-resize",
};

/**
 * Renders one composite layer (bible / text / song / image / camera / video /
 * embed) onto a monitor. Backgrounds fill the frame; overlays are positioned
 * from their style, draggable (move) and resizable (corner handles) in the
 * Preview. Inline styles are data-driven. Selection shows a dashed ring.
 */
export function CompositeLayer({
  layer,
  verse,
  z,
  selected,
  draggable = false,
  audioOwner = false,
  onPointerDown,
  onResize,
  onSelect,
}: {
  layer: StudioLayer;
  verse?: ScriptureVerse | null;
  z: number;
  selected: boolean;
  draggable?: boolean;
  /** When true, this instance owns the source's audio (analyser / player). Only
   *  one monitor should own it to avoid double audio. */
  audioOwner?: boolean;
  onPointerDown?: (e: React.PointerEvent, id: string) => void;
  onResize?: (e: React.PointerEvent, id: string, corner: ResizeCorner) => void;
  onSelect?: (id: string) => void;
}) {
  const isBg = isBackgroundLayer(layer);
  const animEase = EASING_MAP[layer.style.animEasing || "ease-out"] || EASING_MAP["ease-out"];
  const getVariants = ANIMATION_PLUGINS[layer.style.animation] || ANIMATION_PLUGINS.fade_slide;
  const variants = getVariants(layer.style.animDuration || 500, animEase);

  const ring = selected
    ? isBg
      ? "shadow-[inset_0_0_0_2px_#b270ff]"
      : "outline-2 outline-dashed outline-studio-purple outline-offset-4"
    : "";
  const movable = draggable && !!onPointerDown && !isBg;
  const dragProps = movable
    ? { onPointerDown: (e: React.PointerEvent) => onPointerDown!(e, layer.id) }
    : {};

  const alignX = layer.style.textAlign || "center";
  const alignY = layer.style.textVerticalAlign || "center";
  const alignClass = cn(
    "absolute flex flex-col overflow-hidden",
    alignX === "left" ? "items-start text-left" : alignX === "right" ? "items-end text-right" : "items-center text-center",
    alignY === "top" ? "justify-start" : alignY === "bottom" ? "justify-end" : "justify-center",
    movable && "cursor-move",
    ring
  );

  const isScroll = layer.style.animation?.startsWith("scroll_");
  const outerVariants = isScroll ? undefined : variants;
  const innerVariants = isScroll ? variants : undefined;

  // Full-frame backgrounds aren't draggable, but a click still selects them so
  // the inspector binds to the source.
  const selectProps =
    draggable && onSelect && isBg
      ? { onClick: () => onSelect(layer.id), role: "button" as const }
      : {};

  const handles =
    selected && movable && onResize
      ? (Object.keys(CORNER_POS) as ResizeCorner[]).map((c) => (
          <div
            key={c}
            onPointerDown={(e) => onResize(e, layer.id, c)}
            className={cn(
              "absolute z-20 size-3 rounded-full border border-studio-purple bg-studio-bg shadow",
              CORNER_POS[c],
            )}
          />
        ))
      : null;

  // Bible verse overlay
  if (layer.type === "bible") {
    const versionLabel = verse?.texts ? Object.keys(verse.texts)[0] : verse?.translation || "LSG";
    return (
      <motion.div
        key={layer.id}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        data-layer
        {...dragProps}
        className={alignClass}
        style={{ ...getContainerStyle(layer.style), ...getOverlayBoxStyle(layer.style), zIndex: z }}
      >
        {handles}
        {verse ? (
          <>
            <span style={{ ...getElementStyle("fontRef", layer.style), whiteSpace: "pre-wrap" }} className="mb-2 block">
              {verse.reference}
            </span>
            <p style={{ ...getElementStyle("fontBody", layer.style), whiteSpace: "pre-wrap" }}>
              {layer.style.animation === "typewriter" ? (
                <TypewriterText text={verse.text} />
              ) : (
                verse.text
              )}
            </p>
            <span style={{ ...getElementStyle("fontVer", layer.style), whiteSpace: "pre-wrap" }} className="mt-1 block">
              {versionLabel}
            </span>
          </>
        ) : (
          <span className={cn("text-[11px] tracking-[2px] text-white/25", MONO)}>
            Sélectionnez un verset
          </span>
        )}
      </motion.div>
    );
  }

  // External live embed (YouTube / Facebook / Vimeo / HLS) — real video preview
  if (layer.type === "embed") {
    return (
      <motion.div
        key={layer.id}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        data-layer
        {...dragProps}
        className={cn(
          "absolute overflow-hidden rounded-xl bg-black",
          movable && "cursor-move",
          ring,
        )}
        style={{ ...getOverlayBoxStyle(layer.style), zIndex: z }}
      >
        {handles}
        <EmbedMedia layer={layer} audioOwner={audioOwner} />
        <span className="pointer-events-none absolute top-2.5 left-2.5 rounded-md bg-studio-onair/85 px-2 py-1 text-[9px] font-extrabold tracking-[1px] text-white">
          DIRECT EXTERNE
        </span>
      </motion.div>
    );
  }

  // Network video stream (Flux VLC / HLS / direct file) — real, movable preview
  if (layer.type === "video") {
    return (
      <motion.div
        key={layer.id}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        data-layer
        {...dragProps}
        className={cn(
          "absolute overflow-hidden rounded-xl bg-black",
          movable && "cursor-move",
          ring,
        )}
        style={{ ...getOverlayBoxStyle(layer.style), zIndex: z }}
      >
        {handles}
        <VideoMedia layer={layer} audioOwner={audioOwner} />
        <span className="pointer-events-none absolute top-2.5 left-2.5 rounded-md bg-[#f0a868]/85 px-2 py-1 text-[9px] font-extrabold tracking-[1px] text-white">
          FLUX VIDÉO
        </span>
      </motion.div>
    );
  }

  // Camera feed placeholder (background)
  if (layer.type === "camera") {
    const meta = { label: "FLUX CAMÉRA · NDI", color: "rgba(255,255,255,.5)", hatch: "rgba(255,255,255,.03)", hatch2: "rgba(255,255,255,.06)" };
    return (
      <motion.div
        key={layer.id}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        {...selectProps}
        className={cn("absolute inset-0 flex items-center justify-center", draggable && "cursor-pointer", ring)}
        style={{
          zIndex: z,
          backgroundImage: `repeating-linear-gradient(45deg,${meta.hatch} 0 14px,${meta.hatch2} 14px 28px)`,
        }}
      >
        <div className="max-w-[80%] text-center">
          <div className={cn("text-[13px] font-semibold tracking-[2px]", MONO)} style={{ color: meta.color }}>
            {meta.label}
          </div>
          <div className="mt-1 truncate text-[10px] text-white/30">{layer.feedUrl || layer.name}</div>
        </div>
      </motion.div>
    );
  }

  // Image layer
  if (layer.type === "image") {
    const bgStyle: React.CSSProperties = layer.imageUrl
      ? {
          backgroundImage: `url(${getImageUrl(layer.imageUrl)})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }
      : {
          backgroundImage: imageHatch(layer.imageHue ?? 265),
        };
    if (isBg) {
      return (
        <motion.div
          key={layer.id}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          {...selectProps}
          className={cn("absolute inset-0", draggable && "cursor-pointer", ring)}
          style={{ zIndex: z, ...bgStyle }}
        >
          <span
            className={cn(
              "absolute bottom-2.5 left-2.5 rounded-md bg-black/45 px-2 py-1 text-[9.5px] tracking-[1px] text-white/55",
              MONO,
            )}
          >
            🖼 {layer.name}
          </span>
        </motion.div>
      );
    }
    return (
      <motion.div
        key={layer.id}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        data-layer
        {...dragProps}
        className={cn("absolute overflow-hidden", movable && "cursor-move", ring)}
        style={{ ...getContainerStyle(layer.style), ...getOverlayBoxStyle(layer.style), zIndex: z, ...bgStyle }}
      >
        {handles}
      </motion.div>
    );
  }

  // Song lyrics — a centered stack of lines
  if (layer.type === "song") {
    const activeStanza = layer.stanzas && layer.activeStanzaIndex !== undefined ? layer.stanzas[layer.activeStanzaIndex] : null;
    const lyricsContent = activeStanza ? activeStanza.content : (layer.content ?? "");
    const lines = lyricsContent.split("\n");
    return (
      <motion.div
        key={layer.id}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        data-layer
        {...dragProps}
        className={alignClass}
        style={{ ...getContainerStyle(layer.style), ...getOverlayBoxStyle(layer.style), zIndex: z }}
      >
        {handles}
        {lines.map((line, i) => (
          <div key={i} style={{ ...getElementStyle("fontBody", layer.style), whiteSpace: "pre-wrap" }}>
            {layer.style.animation === "typewriter" ? (
              <TypewriterText text={line || ""} />
            ) : (
              line || " "
            )}
          </div>
        ))}
      </motion.div>
    );
  }

  // Text layer
  return (
    <motion.div
      key={layer.id}
      variants={outerVariants}
      initial={isScroll ? undefined : "initial"}
      animate={isScroll ? undefined : "animate"}
      exit={isScroll ? undefined : "exit"}
      data-layer
      {...dragProps}
      className={alignClass}
      style={{ ...getContainerStyle(layer.style), ...getOverlayBoxStyle(layer.style), zIndex: z }}
    >
      {handles}
      {isScroll ? (
        <motion.div
          variants={innerVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={cn(
            "w-full h-full flex flex-col justify-center",
            (layer.style.animation === "scroll_left" || layer.style.animation === "scroll_right") && "whitespace-nowrap flex-row items-center"
          )}
        >
          <div className="flex flex-col">
            <p style={{ ...getElementStyle("fontBody", layer.style), whiteSpace: (layer.style.animation === "scroll_left" || layer.style.animation === "scroll_right") ? "nowrap" : "pre-wrap" }}>
              {layer.content}
            </p>
            {layer.sub ? (
              <span className="mt-1 text-[12px] text-white/55" style={{ whiteSpace: (layer.style.animation === "scroll_left" || layer.style.animation === "scroll_right") ? "nowrap" : "pre-wrap" }}>
                {layer.sub}
              </span>
            ) : null}
          </div>
        </motion.div>
      ) : (
        <>
          <p style={{ ...getElementStyle("fontBody", layer.style), whiteSpace: "pre-wrap" }}>
            {layer.style.animation === "typewriter" ? (
              <TypewriterText text={layer.content ?? ""} />
            ) : (
              layer.content
            )}
          </p>
          {layer.sub ? (
            <span className="mt-1 text-[12px] text-white/55" style={{ whiteSpace: "pre-wrap" }}>
              {layer.style.animation === "typewriter" ? (
                <TypewriterText text={layer.sub} />
              ) : (
                layer.sub
              )}
            </span>
          ) : null}
        </>
      )}
    </motion.div>
  );
}

/**
 * The playable media of a "Direct externe" source. When this instance is the
 * audio owner, it captures/controls the source's sound and publishes a meter
 * probe: real Web Audio RMS for owned `<video>` media, or YouTube player-state
 * sync for YouTube embeds. Non-owner instances render muted (no double audio),
 * and non-YouTube iframes expose no probe (audio not capturable cross-origin).
 */
function EmbedMedia({ layer, audioOwner }: { layer: StudioLayer; audioOwner: boolean }) {
  const { type, src } = resolveEmbed(layer.feedUrl || "");
  const ytId = type === "iframe" ? youtubeId(layer.feedUrl || "") : null;
  const isYouTube = !!ytId;

  const videoRef = useRef<HTMLVideoElement>(null);
  const ytHostRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<MediaMeter | null>(null);
  const ytRef = useRef<YouTubeController | null>(null);

  const level = layer.audioLevel ?? 80;
  const muted = layer.audioMuted ?? false;

  // Owned <video> (direct / HLS) → real Web Audio analyser + gain control.
  useEffect(() => {
    if (!audioOwner) return;
    const el = videoRef.current;
    if (!el) return;
    const meter = attachMediaMeter(el);
    if (!meter) return;
    meterRef.current = meter;
    const unregister = registerAudioProbe(layer.id, meter);
    void el.play?.().catch(() => {});
    return () => {
      unregister();
      meter.dispose();
      meterRef.current = null;
    };
  }, [audioOwner, layer.id, src, type]);

  // YouTube → player-state metering + volume control via the IFrame API.
  useEffect(() => {
    if (!audioOwner || !isYouTube || !ytId) return;
    const host = ytHostRef.current;
    if (!host) return;
    const mount = document.createElement("div");
    mount.style.cssText = "position:absolute;inset:0;";
    host.appendChild(mount);
    const yt = attachYouTube(mount, ytId);
    ytRef.current = yt;
    const unregister = registerAudioProbe(layer.id, yt);
    return () => {
      unregister();
      yt.dispose();
      ytRef.current = null;
      host.innerHTML = "";
    };
  }, [audioOwner, isYouTube, ytId, layer.id]);

  // Apply the mixer fader / mute to whichever audio path is live.
  useEffect(() => {
    meterRef.current?.setGain(level, muted);
    ytRef.current?.setVolume(level, muted);
  }, [level, muted]);

  if (!src) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-1 text-center">
        <div className={cn("text-[12px] font-semibold tracking-[2px] text-[#ff8a8a]", MONO)}>
          DIRECT EXTERNE
        </div>
        <div className="text-[10px] text-white/35">Collez un lien YouTube / Facebook…</div>
      </div>
    );
  }

  if (type === "video") {
    return (
      <video
        key={src}
        ref={videoRef}
        src={src}
        className="pointer-events-none absolute inset-0 size-full object-cover"
        autoPlay
        muted={!audioOwner}
        loop
        playsInline
      />
    );
  }

  // YouTube owner → the IFrame API builds the player inside this host.
  if (isYouTube && audioOwner) {
    return <div ref={ytHostRef} className="absolute inset-0" />;
  }

  // Non-owner YouTube (muted mirror) or another platform iframe (no capture).
  const iframeSrc = isYouTube
    ? `${src}${src.includes("?") ? "&" : "?"}autoplay=1&mute=1&controls=0&modestbranding=1&playsinline=1`
    : src;
  return (
    <iframe
      src={iframeSrc}
      title={layer.name}
      className="pointer-events-none absolute inset-0 size-full border-0"
      allow="autoplay; encrypted-media; picture-in-picture"
    />
  );
}

/**
 * The playable media of a "Vidéo" source — a network stream (Flux VLC / HLS) or
 * a direct file, played in an owned `<video>` element. When this instance is the
 * audio owner it captures the real signal (Web Audio RMS) and applies the mixer
 * fader/mute via a gain node; non-owner instances render muted (no double audio).
 */
function VideoMedia({ layer, audioOwner }: { layer: StudioLayer; audioOwner: boolean }) {
  const src = (layer.feedUrl || "").trim();
  const videoRef = useRef<HTMLVideoElement>(null);
  const meterRef = useRef<MediaMeter | null>(null);
  // Browsers block UNMUTED autoplay; we start muted (so the clip is always
  // visible in Preview) and unmute once the operator has interacted with the page.
  const [primed, setPrimed] = useState(false);

  const level = layer.audioLevel ?? 80;
  const mutedSetting = layer.audioMuted ?? false;
  const loop = layer.loop ?? true;
  // Our own uploads are CORS-enabled → real Web Audio metering; external links
  // stay same-origin-tainted (meter flat, but playback still works).
  const isOurMedia = /\/studio\/media\//.test(src);

  // Owner: real audio meter + transport controller registration.
  useEffect(() => {
    if (!audioOwner || !src) return;
    const el = videoRef.current;
    if (!el) return;
    const meter = attachMediaMeter(el);
    if (meter) meterRef.current = meter;
    const unregisterProbe = meter ? registerAudioProbe(layer.id, meter) : () => {};

    const controller: VideoController = {
      play: () => void el.play().catch(() => {}),
      pause: () => el.pause(),
      toggle: () => (el.paused ? void el.play().catch(() => {}) : el.pause()),
      stop: () => {
        el.pause();
        el.currentTime = 0;
      },
      restart: () => {
        el.currentTime = 0;
        void el.play().catch(() => {});
      },
      seek: (t) => {
        el.currentTime = t;
      },
      skip: (d) => {
        const dur = Number.isFinite(el.duration) ? el.duration : 0;
        el.currentTime = Math.max(0, Math.min(dur || el.currentTime + d, el.currentTime + d));
      },
      getState: () => ({
        currentTime: el.currentTime || 0,
        duration: Number.isFinite(el.duration) ? el.duration : 0,
        paused: el.paused,
        ended: el.ended,
        ready: el.readyState >= 2,
      }),
    };
    const unregisterCtl = registerVideoController(layer.id, controller);
    void el.play().catch(() => {});
    return () => {
      unregisterProbe();
      unregisterCtl();
      meter?.dispose();
      meterRef.current = null;
    };
  }, [audioOwner, layer.id, src]);

  // Prime the unmute once the operator interacts (autoplay policy needs a gesture).
  useEffect(() => {
    if (!audioOwner || primed) return;
    const onGesture = () => setPrimed(true);
    window.addEventListener("pointerdown", onGesture, { once: true });
    return () => window.removeEventListener("pointerdown", onGesture);
  }, [audioOwner, primed]);

  // Apply the mixer fader / mute to the captured signal.
  useEffect(() => {
    meterRef.current?.setGain(level, mutedSetting);
  }, [level, mutedSetting]);

  if (!src) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-1 text-center">
        <div className={cn("text-[12px] font-semibold tracking-[2px]", MONO)} style={{ color: "rgba(240,168,104,.8)" }}>
          FLUX VIDÉO
        </div>
        <div className="text-[10px] text-white/35">Renseignez l&apos;URL du flux (.m3u8 / .mp4)…</div>
      </div>
    );
  }

  return (
    <video
      key={src}
      ref={videoRef}
      src={src}
      crossOrigin={isOurMedia ? "anonymous" : undefined}
      className="pointer-events-none absolute inset-0 size-full object-cover"
      autoPlay
      muted={!audioOwner || mutedSetting || !primed}
      loop={loop}
      playsInline
    />
  );
}
