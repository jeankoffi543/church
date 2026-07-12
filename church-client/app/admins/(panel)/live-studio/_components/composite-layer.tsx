"use client";

import type React from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useAnimationControls, type TargetAndTransition } from "framer-motion";

import { assetUrl } from "@/lib/asset-url";
import type { ScriptureVerse } from "@/lib/studio";
import {
  TypewriterText,
  domAnimVariants,
  getAnimEffect,
  type AnimSourceKind,
} from "@/lib/studio-animations";
import { cn } from "@/lib/utils";
import { getContainerStyle, getElementStyle, getOverlayBoxStyle } from "./studio-style";
import { isBackgroundLayer, imageHatch, reactionStyle, type StudioLayer } from "./studio-layers";
import { resolveEmbed } from "./embed";
import {
  attachMediaMeter,
  attachStreamMeter,
  attachYouTube,
  getMonitorMuted,
  registerAudioProbe,
  subscribeMonitorMuted,
  youtubeId,
  type AudioProbe,
  type MediaMeter,
  type StreamMeter,
  type YouTubeController,
} from "./studio-audio";
import { getVideoController, registerVideoController, type VideoController } from "./studio-video";
import {
  acquireCameraStream,
  getCameraStream,
  setCameraStream,
  subscribeCameraStreams,
} from "./studio-camera";
import { MONO } from "./studio-tokens";

/**
 * Every animatable property any effect touches, reset to its resting/identity
 * value. Applied (imperatively, on media sources) BEFORE (re)starting an
 * animation so a previously-running CONTINUOUS loop is fully cancelled — e.g.
 * switching a camera from "battement"/"onde" (which loop `scale`) to "aucune"
 * (whose empty variant would otherwise leave the `scale` loop running). Without
 * this, only a new effect that drives the SAME property (e.g. zoom) would stop it.
 */
const MEDIA_RESET = {
  opacity: 1,
  scale: 1,
  rotate: 0,
  rotateX: 0,
  rotateY: 0,
  x: 0,
  y: 0,
  filter: "blur(0px)",
  clipPath: "none",
} as const;

// Resolve a stored media path for THIS tenant: a same-origin `/tenancy/assets/…`
// URL (CHR-154), which also avoids tainting the compositor canvas. blob/data/http
// pass through untouched.
const getImageUrl = (url: string | undefined | null): string => assetUrl(url) ?? "";

export type ResizeCorner = "nw" | "ne" | "sw" | "se";

const CORNER_POS: Record<ResizeCorner, string> = {
  nw: "cursor-nw-resize",
  ne: "cursor-ne-resize",
  sw: "cursor-sw-resize",
  se: "cursor-se-resize",
};

/** Corner offsets in px, scaled with the handle size (half overlaps the edge). */
function cornerOffset(c: ResizeCorner, half: number): React.CSSProperties {
  switch (c) {
    case "nw":
      return { top: -half, left: -half };
    case "ne":
      return { top: -half, right: -half };
    case "sw":
      return { bottom: -half, left: -half };
    case "se":
      return { bottom: -half, right: -half };
  }
}

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
  allLayers = [],
  selectedLayerId = null,
  uiScale = 1,
  replayToken = 0,
  activeTriggers = null,
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
  allLayers?: StudioLayer[];
  selectedLayerId?: string | null;
  /** Editing-chrome compensation for a scaled-down composition stage (1/k): the
   *  monitor renders in composition px, so selection rings / resize handles are
   *  multiplied by this to stay a usable on-screen size. Never broadcast. */
  uiScale?: number;
  /** Per-layer entrance-replay signal for the STABLE-key media types (camera /
   *  video / embed). Text/image replay by remounting on a token-keyed React key;
   *  media can't (that would re-`getUserMedia` / reload), so they replay
   *  imperatively via animation controls when this token changes. The token
   *  advances only on a CUT/preview where this layer is due to replay — NOT when
   *  its animation SETTING changes — so picking an effect never fires it on air. */
  replayToken?: number;
  /** Ids of TRIGGER sources currently on air (or being tested). If this layer's
   *  `reactTo` is in the set, it renders its reaction pose (CHR-57). */
  activeTriggers?: ReadonlySet<string> | null;
}) {
  const isBg = isBackgroundLayer(layer);
  // CHR-57 reaction: while the trigger is active, use the reaction pose. The DOM
  // animates the box via a CSS transition, so the blend is a hard 0/1 here — the
  // easing/duration below matches the canvas interpolation for parity.
  const reactActive = !!layer.reactTo && !!activeTriggers?.has(layer.reactTo);
  const effStyle = reactionStyle(layer, reactActive ? 1 : 0);
  const reactCss: React.CSSProperties = layer.reactStyle
    ? {
        transition: [
          "left",
          "top",
          "width",
          "height",
          "border-radius",
          "border-width",
          "padding",
          "box-shadow",
          "background-color",
          "border-color",
        ]
          .map((p) => `${p} ${layer.reactTransitionMs ?? 600}ms cubic-bezier(0,0,0.58,1)`)
          .join(", "),
      }
    : {};
  // Variants come from the SHARED effect registry (CHR-56): per-source
  // availability is resolved there, so an effect the source doesn't support
  // degrades to "none" here exactly like on the broadcast canvas.
  const variants = domAnimVariants(
    layer.style.animation,
    layer.style.animDuration || 500,
    layer.style.animEasing,
    layer.type as AnimSourceKind,
  );

  // Camera / video / embed keep a stable React key so the media element is never
  // torn down (no re-getUserMedia / reload). That also means a nonce-keyed
  // remount can't replay their entrance — so we drive it imperatively: set the
  // initial variant, then animate to the final one, whenever the effect or the
  // replay nonce changes. The media element underneath stays mounted and live.
  const isStableMedia =
    layer.type === "camera" ||
    layer.type === "screen" ||
    layer.type === "video" ||
    layer.type === "embed";
  const mediaControls = useAnimationControls();
  // The registry only emits object variants (never the TargetResolver form), so
  // narrowing to TargetAndTransition here is safe.
  const mediaInitial = (variants.initial ?? {}) as TargetAndTransition;
  const mediaAnimate = (variants.animate ?? {}) as TargetAndTransition;
  const mediaExit = (variants.exit ?? {}) as TargetAndTransition;
  const mediaIsLoop = !!getAnimEffect(layer.style.animation).loop;
  // A signature that changes only when a CONTINUOUS loop's identity changes (its
  // id/speed/easing); one-shot⇄one-shot changes keep it "" so they never re-fire.
  const mediaLoopSig = mediaIsLoop
    ? `${layer.style.animation}:${layer.style.animDuration}:${layer.style.animEasing}`
    : "";

  // Replay ON TOKEN: a CUT/preview where this layer is due. Reset every property
  // first (kills any running loop) then run the entrance / start the loop.
  useEffect(() => {
    if (!isStableMedia) return;
    mediaControls.stop();
    mediaControls.set({ ...MEDIA_RESET, ...mediaInitial });
    void mediaControls.start(mediaAnimate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStableMedia, replayToken]);

  // Reconcile a LOOP change WITHOUT a replay (e.g. editing an on-air source):
  // starting/stopping a continuous loop must reflect live, but a one-shot effect
  // change must NOT re-trigger on air. Guarded to skip the initial mount (the
  // token effect already set the state there).
  const mediaMounted = useRef(false);
  useEffect(() => {
    if (!isStableMedia) return;
    if (!mediaMounted.current) {
      mediaMounted.current = true;
      return;
    }
    mediaControls.stop();
    if (mediaIsLoop) {
      void mediaControls.set({ ...MEDIA_RESET, ...mediaInitial });
      void mediaControls.start(mediaAnimate);
    } else {
      // Leaving a loop for a one-shot / "aucune": settle to identity, don't replay.
      mediaControls.set(MEDIA_RESET);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStableMedia, mediaLoopSig]);

  const isSelectedChildsParent = selectedLayerId && allLayers.find((l) => l.id === selectedLayerId)?.parentId === layer.id;
  // Selection chrome as inline styles so it scales with `uiScale` (a class-based
  // 2px outline would render sub-pixel inside a scaled-down composition stage).
  const editRingStyle: React.CSSProperties = {
    ...(isSelectedChildsParent
      ? { outline: `${2 * uiScale}px solid #e2b85f`, outlineOffset: 2 * uiScale }
      : {}),
    ...(selected
      ? isBg
        ? { boxShadow: `inset 0 0 0 ${2 * uiScale}px #b270ff` }
        : { outline: `${2 * uiScale}px dashed #b270ff`, outlineOffset: 4 * uiScale }
      : {}),
  };
  const movable = draggable && !!onPointerDown && !isBg;
  const dragProps = movable
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          e.stopPropagation();
          onPointerDown!(e, layer.id);
        },
      }
    : {};

  const alignX = layer.style.textAlign || "center";
  const alignY = layer.style.textVerticalAlign || "center";
  const alignClass = cn(
    "absolute flex flex-col overflow-hidden",
    alignX === "left" ? "items-start text-left" : alignX === "right" ? "items-end text-right" : "items-center text-center",
    alignY === "top" ? "justify-start" : alignY === "bottom" ? "justify-end" : "justify-center",
    movable && "cursor-move",
  );

  // Inner marquee — text sources only (the registry's per-source condition:
  // on other types a persisted scroll_* resolves to "none").
  const isScroll = layer.type === "text" && !!layer.style.animation?.startsWith("scroll_");
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
              "absolute z-20 rounded-full border-studio-purple bg-studio-bg shadow",
              CORNER_POS[c],
            )}
            style={{
              width: 12 * uiScale,
              height: 12 * uiScale,
              borderWidth: Math.max(1, uiScale),
              borderStyle: "solid",
              ...cornerOffset(c, 6 * uiScale),
            }}
          />
        ))
      : null;

  // Bible verse overlay
  if (layer.type === "bible") {
    const versionLabel = verse?.texts ? Object.keys(verse.texts)[0] : verse?.translation || "LSG";
    // Dynamic frame: the OUTER box keeps its exact configured geometry (stable
    // drag/resize target); the INNER container hugs the content (min 100% of the
    // box) and overflows the box in the operator-chosen direction. The canvas
    // mirrors this in growBoxToContent.
    const dir = layer.style.overflowDirection ?? "down";
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
          "absolute flex flex-col",
          dir === "up" ? "justify-end" : dir === "center" ? "justify-center" : "justify-start",
          movable && "cursor-move",
        )}
        style={{ ...getOverlayBoxStyle(effStyle), zIndex: z, ...editRingStyle, ...reactCss }}
      >
        {handles}
        <div
          className={cn(
            // shrink-0 is LOAD-BEARING: as a flex item of the fixed-height box,
            // the default flex-shrink:1 squashed the container below its content
            // (measured: 44px bg for ~110px of text) — the frame then never
            // "hugged" the verse.
            "flex w-full shrink-0 flex-col",
            (layer.style.textAlign || "center") === "left"
              ? "items-start text-left"
              : (layer.style.textAlign || "center") === "right"
                ? "items-end text-right"
                : "items-center text-center",
            (layer.style.textVerticalAlign || "center") === "top"
              ? "justify-start"
              : (layer.style.textVerticalAlign || "center") === "bottom"
                ? "justify-end"
                : "justify-center",
          )}
          style={{ ...getContainerStyle(effStyle), minHeight: "100%" }}
        >
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
        </div>
      </motion.div>
    );
  }

  // External live embed (YouTube / Facebook / Vimeo / HLS) — real video preview
  if (layer.type === "embed") {
    return (
      <motion.div
        key={layer.id}
        initial={mediaInitial}
        animate={mediaControls}
        exit={mediaExit}
        data-layer
        {...dragProps}
        className={cn(
          "absolute overflow-hidden rounded-xl bg-black",
          movable && "cursor-move",
        )}
        style={{ ...getOverlayBoxStyle(effStyle), zIndex: z, ...editRingStyle, ...reactCss }}
      >
        {handles}
        <EmbedMedia layer={layer} audioOwner={audioOwner} />
        <span className="pointer-events-none absolute top-2.5 left-2.5 rounded-md bg-studio-onair/85 px-2 py-1 text-[9px] font-extrabold tracking-[1px] text-white" style={{ transform: `scale(${uiScale})`, transformOrigin: "top left" }}>
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
        initial={mediaInitial}
        animate={mediaControls}
        exit={mediaExit}
        data-layer
        {...dragProps}
        className={cn(
          "absolute overflow-hidden rounded-xl bg-black",
          movable && "cursor-move",
        )}
        style={{ ...getOverlayBoxStyle(effStyle), zIndex: z, ...editRingStyle, ...reactCss }}
      >
        {handles}
        <VideoMedia layer={layer} audioOwner={audioOwner} />
        <span className="pointer-events-none absolute top-2.5 left-2.5 rounded-md bg-[#f0a868]/85 px-2 py-1 text-[9px] font-extrabold tracking-[1px] text-white" style={{ transform: `scale(${uiScale})`, transformOrigin: "top left" }}>
          FLUX VIDÉO
        </span>
      </motion.div>
    );
  }

  // Camera / capture — real getUserMedia preview, movable overlay
  if (layer.type === "camera") {
    return (
      <motion.div
        key={layer.id}
        initial={mediaInitial}
        animate={mediaControls}
        exit={mediaExit}
        data-layer
        {...dragProps}
        className={cn(
          "absolute overflow-hidden rounded-xl bg-black",
          movable && "cursor-move",
        )}
        style={{ ...getOverlayBoxStyle(effStyle), zIndex: z, ...editRingStyle, ...reactCss }}
      >
        {handles}
        {/* Monitors are always camera CONSUMERS — the getUserMedia stream is owned
            by the console-level <CameraKeepAlive> (which survives scene switches),
            so an on-air camera stays on air when the Preview changes scene. */}
        <CameraMedia layer={layer} audioOwner={false} />
        <span className="pointer-events-none absolute top-2.5 left-2.5 rounded-md bg-[#c89af0]/85 px-2 py-1 text-[9px] font-extrabold tracking-[1px] text-white" style={{ transform: `scale(${uiScale})`, transformOrigin: "top left" }}>
          CAMÉRA
        </span>
      </motion.div>
    );
  }

  // Screen / window / tab capture — getDisplayMedia, movable overlay
  if (layer.type === "screen") {
    return (
      <motion.div
        key={layer.id}
        initial={mediaInitial}
        animate={mediaControls}
        exit={mediaExit}
        data-layer
        {...dragProps}
        className={cn(
          "absolute overflow-hidden rounded-xl bg-black",
          movable && "cursor-move",
        )}
        style={{ ...getOverlayBoxStyle(effStyle), zIndex: z, ...editRingStyle, ...reactCss }}
      >
        {handles}
        {/* Monitors are pure CONSUMERS — the getDisplayMedia stream is owned by the
            console-level <ScreenKeepAlive>, so an on-air capture survives a Preview
            scene switch (no re-prompt possible anyway). */}
        <ScreenMedia layer={layer} audioOwner={false} />
        <span className="pointer-events-none absolute top-2.5 left-2.5 rounded-md bg-[#5eb0d0]/85 px-2 py-1 text-[9px] font-extrabold tracking-[1px] text-white" style={{ transform: `scale(${uiScale})`, transformOrigin: "top left" }}>
          CAPTURE D&apos;ÉCRAN
        </span>
      </motion.div>
    );
  }

  // Image layer
  if (layer.type === "image") {
    // H/V alignment picks which part of a cover image stays visible.
    const bgPos = `${layer.style.textAlign ?? "center"} ${layer.style.textVerticalAlign ?? "center"}`;
    const bgStyle: React.CSSProperties = layer.imageUrl
      ? {
          backgroundImage: `url(${getImageUrl(layer.imageUrl)})`,
          backgroundPosition: bgPos,
          // Overlay images fit (keep ratio, no crop); full-frame backgrounds cover.
          backgroundSize: isBg ? "cover" : "contain",
          backgroundRepeat: "no-repeat",
        }
      : {
          backgroundImage: imageHatch(layer.imageHue ?? 265),
        };
    // CHR-56 P2 — "machine à écrire" on an image: a linear left→right sweep.
    // The clip animates on an INNER wrapper (not the outer box) so the gold
    // cursor bar at the reveal edge is never cut by its own clip — mirroring
    // the canvas, which draws the bar after restoring the clip.
    const isTypeSweep = layer.style.animation === "typewriter";
    const sweepSec = Math.max(800, layer.style.animDuration || 500) / 1000;
    const sweepInner = isTypeSweep ? (
      <>
        <motion.div
          className="absolute inset-0"
          style={bgStyle}
          variants={variants}
          initial="initial"
          animate="animate"
        />
        <motion.div
          className="pointer-events-none absolute inset-y-0 z-10 w-[3px] bg-[#e2b85f]"
          initial={{ left: "0%", opacity: 0.9 }}
          animate={{
            left: "100%",
            opacity: 0,
            transition: {
              left: { duration: sweepSec, ease: "linear" },
              opacity: { duration: 0.15, delay: sweepSec },
            },
          }}
        />
      </>
    ) : null;
    if (isBg) {
      return (
        <motion.div
          key={layer.id}
          variants={isTypeSweep ? undefined : variants}
          initial={isTypeSweep ? undefined : "initial"}
          animate={isTypeSweep ? undefined : "animate"}
          exit={isTypeSweep ? undefined : "exit"}
          {...selectProps}
          className={cn("absolute inset-0", draggable && "cursor-pointer")}
          style={{ zIndex: z, ...(isTypeSweep ? {} : bgStyle), ...editRingStyle, ...reactCss }}
        >
          {sweepInner}
          <span
            className={cn(
              "absolute bottom-2.5 left-2.5 z-20 rounded-md bg-black/45 px-2 py-1 text-[9.5px] tracking-[1px] text-white/55",
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
        variants={isTypeSweep ? undefined : variants}
        initial={isTypeSweep ? undefined : "initial"}
        animate={isTypeSweep ? undefined : "animate"}
        exit={isTypeSweep ? undefined : "exit"}
        data-layer
        {...dragProps}
        className={cn("absolute overflow-hidden", movable && "cursor-move")}
        style={{
          ...getContainerStyle(effStyle),
          ...getOverlayBoxStyle(effStyle),
          zIndex: z,
          ...(isTypeSweep ? {} : bgStyle),
          ...editRingStyle,
        }}
      >
        {handles}
        {sweepInner}
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
        style={{ ...getContainerStyle(effStyle), ...getOverlayBoxStyle(effStyle), zIndex: z, ...editRingStyle, ...reactCss }}
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

  // Group layer (feature/CHR-41)
  if (layer.type === "group") {
    return (
      <motion.div
        key={layer.id}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        data-layer
        {...dragProps}
        className={cn("absolute inset-0 select-none")}
        style={{ ...getContainerStyle(effStyle), ...getOverlayBoxStyle(effStyle), zIndex: z, ...editRingStyle, ...reactCss }}
      >
        {handles}
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
      style={{ ...getContainerStyle(effStyle), ...getOverlayBoxStyle(effStyle), zIndex: z, ...editRingStyle, ...reactCss }}
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
  // Local monitor mute (operator's studio only, doesn't affect on-air).
  const monitorMuted = useSyncExternalStore(subscribeMonitorMuted, getMonitorMuted, () => false);

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

  // Apply the mixer fader / mute to whichever audio path is live. The local
  // monitor mute silences the operator's output on top of the on-air mute.
  useEffect(() => {
    meterRef.current?.setGain(level, muted || monitorMuted);
    ytRef.current?.setVolume(level, muted || monitorMuted);
  }, [level, muted, monitorMuted]);

  if (!src) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-1 text-center">
        <div className={cn("text-[34px] font-semibold tracking-[5px] text-[#ff8a8a]", MONO)}>
          DIRECT EXTERNE
        </div>
        <div className="text-[26px] text-white/35">Collez un lien YouTube / Facebook…</div>
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
 * a direct file. Played NATIVELY (no Web Audio / CORS) so both uploads and
 * external links are always audible and never fail to load. The audio owner
 * (Preview) exposes a transport controller + a playback-state VU probe (the
 * mixer meter animates while the clip plays with sound); the mixer fader/mute
 * drive the element's `volume`/`muted`. Non-owner (Program) mirrors the Preview.
 */
function VideoMedia({ layer, audioOwner }: { layer: StudioLayer; audioOwner: boolean }) {
  const src = (layer.feedUrl || "").trim();
  const videoRef = useRef<HTMLVideoElement>(null);
  // Browsers block UNMUTED autoplay; start muted (so the clip is always visible)
  // and unmute once the operator has interacted with the page.
  const [primed, setPrimed] = useState(false);
  // Local monitor mute: silences the operator's studio only (element.muted),
  // NOT the on-air level (element.volume) — so the VU meter keeps animating.
  const monitorMuted = useSyncExternalStore(subscribeMonitorMuted, getMonitorMuted, () => false);

  const level = layer.audioLevel ?? 80;
  const mutedSetting = layer.audioMuted ?? false;
  const loop = layer.loop ?? true;

  // Owner: transport controller + a playback-state VU probe. The probe tracks the
  // ON-AIR signal (playing + on-air volume) and ignores the local monitor mute.
  useEffect(() => {
    if (!audioOwner || !src) return;
    const el = videoRef.current;
    if (!el) return;

    let peak = 0;
    const isSounding = () => !el.paused && el.volume > 0.001;
    const probe: AudioProbe = {
      getLevel: () => {
        const ceiling = isSounding() ? el.volume * 88 : 0;
        peak = Math.max(0, Math.min(100, peak + (Math.random() * ceiling - peak) * 0.5));
        return peak;
      },
      isActive: isSounding,
    };
    const unregisterProbe = registerAudioProbe(layer.id, probe);

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
    };
  }, [audioOwner, layer.id, src]);

  // Prime the unmute once the operator interacts (autoplay policy needs a gesture).
  useEffect(() => {
    if (!audioOwner || primed) return;
    const onGesture = () => setPrimed(true);
    window.addEventListener("pointerdown", onGesture, { once: true });
    return () => window.removeEventListener("pointerdown", onGesture);
  }, [audioOwner, primed]);

  // On-air level: the fader sets element.volume; the per-channel (on-air) mute
  // drops it to 0 (also flattens the meter). The LOCAL monitor mute is separate
  // (the JSX `muted` attr) so it never affects the on-air level or the meter.
  useEffect(() => {
    if (!audioOwner) return;
    const el = videoRef.current;
    if (el) el.volume = mutedSetting ? 0 : Math.max(0, Math.min(1, level / 100));
  }, [audioOwner, level, mutedSetting, src]);

  // Program (non-owner) = synchronised follower of the Preview: same play/pause
  // and position, so the transport controls (which drive the Preview) are
  // mirrored on air. Falls back to independent playback if the Preview isn't up.
  useEffect(() => {
    if (audioOwner || !src) return;
    const el = videoRef.current;
    if (!el) return;
    const t = setInterval(() => {
      const master = getVideoController(layer.id);
      if (!master) return;
      const s = master.getState();
      if (!s.ready) return;
      if (Math.abs(el.currentTime - s.currentTime) > 0.4) {
        el.currentTime = s.currentTime;
      }
      if (s.paused && !el.paused) {
        el.pause();
      } else if (!s.paused && el.paused) {
        void el.play().catch(() => {});
      }
    }, 250);
    return () => clearInterval(t);
  }, [audioOwner, layer.id, src]);

  if (!src) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-1 text-center">
        <div className={cn("text-[34px] font-semibold tracking-[5px]", MONO)} style={{ color: "rgba(240,168,104,.8)" }}>
          FLUX VIDÉO
        </div>
        <div className="text-[26px] text-white/35">Renseignez l&apos;URL du flux (.m3u8 / .mp4)…</div>
      </div>
    );
  }

  return (
    <video
      key={src}
      ref={videoRef}
      src={src}
      className="pointer-events-none absolute inset-0 size-full object-cover"
      autoPlay
      muted={!audioOwner || !primed || monitorMuted}
      loop={loop}
      playsInline
    />
  );
}

/**
 * The live media of a "Caméra / Capture" source (getUserMedia device). The audio
 * owner (Preview) acquires ONE stream, plays it, publishes it for the Program to
 * share, and meters its audio for real (local stream → not tainted). The fader /
 * on-air mute scale the VU; local monitoring is off by default (anti-Larsen) and
 * toggled per source (`listenLocal`), on top of the global monitor mute.
 */
function CameraMedia({ layer, audioOwner }: { layer: StudioLayer; audioOwner: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const monitorMuted = useSyncExternalStore(subscribeMonitorMuted, getMonitorMuted, () => false);

  const deviceId = layer.deviceId || "";
  const audioDeviceId = layer.audioDeviceId;
  const level = layer.audioLevel ?? 80;
  const mutedSetting = layer.audioMuted ?? false; // on-air mute (drives the meter)
  const listenLocal = layer.listenLocal ?? false;

  // Live values for the probe (updated via effect, never read in render).
  const audioRef = useRef({ level, mutedSetting });
  useEffect(() => {
    audioRef.current = { level, mutedSetting };
  }, [level, mutedSetting]);

  // Program (non-owner) shares the Preview's live stream.
  const sharedStream = useSyncExternalStore(
    subscribeCameraStreams,
    () => getCameraStream(layer.id),
    () => undefined,
  );

  // Owner: acquire the device stream once, publish it, meter its audio.
  useEffect(() => {
    if (!audioOwner || !deviceId) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let meter: StreamMeter | null = null;
    let unregisterProbe = () => {};
    acquireCameraStream({ deviceId, audioDeviceId, withAudio: true })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setError(null);
        stream = s;
        const el = videoRef.current;
        if (el) {
          el.srcObject = s;
          void el.play().catch(() => {});
        }
        setCameraStream(layer.id, s);
        meter = attachStreamMeter(s);
        if (meter) {
          const activeMeter = meter;
          let peak = 0;
          const probe: AudioProbe = {
            getLevel: () => {
              const { level: lv, mutedSetting: mm } = audioRef.current;
              const raw = mm ? 0 : activeMeter.getLevel() * (lv / 100);
              peak = Math.max(0, Math.min(100, peak + (raw - peak) * 0.5));
              return peak;
            },
            isActive: () => {
              const { level: lv, mutedSetting: mm } = audioRef.current;
              return !mm && lv > 0 && activeMeter.hasAudio();
            },
          };
          unregisterProbe = registerAudioProbe(layer.id, probe);
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "Autorisation caméra refusée."
            : "Caméra indisponible (débranchée ?).",
        );
      });
    return () => {
      cancelled = true;
      unregisterProbe();
      meter?.dispose();
      if (stream) stream.getTracks().forEach((t) => t.stop());
      setCameraStream(layer.id, null);
    };
  }, [audioOwner, deviceId, audioDeviceId, layer.id]);

  // Program: attach the shared live stream to this element.
  useEffect(() => {
    if (audioOwner) return;
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = sharedStream ?? null;
    if (sharedStream) void el.play().catch(() => {});
  }, [audioOwner, sharedStream]);

  // Local monitor volume (only audible when listening locally).
  useEffect(() => {
    if (!audioOwner) return;
    const el = videoRef.current;
    if (el) el.volume = Math.max(0, Math.min(1, level / 100));
  }, [audioOwner, level]);

  if (!deviceId) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-1 text-center">
        <div className={cn("text-[34px] font-semibold tracking-[5px]", MONO)} style={{ color: "rgba(200,154,240,.85)" }}>
          CAMÉRA
        </div>
        <div className="text-[26px] text-white/35">Sélectionnez un périphérique dans l&apos;inspecteur…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-1 text-center">
        <div className={cn("text-[34px] font-semibold tracking-[5px] text-[#ff8a8a]", MONO)}>CAMÉRA</div>
        <div className="px-3 text-[26px] leading-relaxed text-white/45">{error}</div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className="pointer-events-none absolute inset-0 size-full object-cover"
      autoPlay
      muted={!audioOwner || !listenLocal || monitorMuted}
      playsInline
    />
  );
}

/**
 * Off-screen owner of every camera's getUserMedia stream. Rendered ONCE at the
 * console level for the UNION of the preview + program cameras, so a camera that
 * is on air keeps its stream + audio metering ALIVE even when the operator
 * switches the Preview to another scene. Because ownership no longer lives in the
 * (transient) Preview monitor, there is no ownership handoff on a scene switch —
 * hence no re-`getUserMedia` black flash on air. The monitors render cameras as
 * pure consumers ({@link CompositeLayer} forces `audioOwner={false}`) and read
 * this shared stream. Deduped by `layer.id`, with the on-air (program) copy first
 * so a shared id keeps the antenne stream. Positioned off-screen (NOT
 * `display:none`) so playback/local-monitor audio keep running.
 */
export function CameraKeepAlive({ layers }: { layers: StudioLayer[] }) {
  const seen = new Set<string>();
  const cameras = layers.filter((l) => {
    if (l.type !== "camera" || !l.deviceId || seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-[-9999px] top-[-9999px] size-px overflow-hidden opacity-0"
    >
      {cameras.map((l) => (
        <div key={l.id} className="relative size-px">
          <CameraMedia layer={l} audioOwner />
        </div>
      ))}
    </div>
  );
}

/**
 * The live media of a "Capture d'écran" source (getDisplayMedia). Unlike a
 * camera, the owner NEVER acquires here — the stream is captured on a user
 * gesture in the inspector and published to the shared registry. The owner only
 * plays it (local monitor), meters its audio for the mixer VU, and watches the
 * VIDEO track's `ended` event (the browser's native "Stop sharing" bar) to clean
 * up and notify the console so `captureActive` flips back off.
 */
function ScreenMedia({
  layer,
  audioOwner,
  onEnded,
}: {
  layer: StudioLayer;
  audioOwner: boolean;
  onEnded?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const monitorMuted = useSyncExternalStore(subscribeMonitorMuted, getMonitorMuted, () => false);

  const level = layer.audioLevel ?? 80;
  const mutedSetting = layer.audioMuted ?? false; // on-air mute (drives the meter)
  const listenLocal = layer.listenLocal ?? false;

  // Live values for the probe (updated via effect, never read in render).
  const audioRef = useRef({ level, mutedSetting });
  useEffect(() => {
    audioRef.current = { level, mutedSetting };
  }, [level, mutedSetting]);

  // Keep the latest onEnded without re-running the owner effect.
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  const sharedStream = useSyncExternalStore(
    subscribeCameraStreams,
    () => getCameraStream(layer.id),
    () => undefined,
  );

  // Owner: play the registry stream, meter its audio, register the probe, and
  // detect the user ending the share. No acquisition (getDisplayMedia is gesture
  // -bound — it happens in the inspector).
  useEffect(() => {
    if (!audioOwner || !sharedStream) return;
    const el = videoRef.current;
    if (el) {
      el.srcObject = sharedStream;
      void el.play().catch(() => {});
    }
    let unregisterProbe = () => {};
    const meter = attachStreamMeter(sharedStream);
    if (meter) {
      let peak = 0;
      const probe: AudioProbe = {
        getLevel: () => {
          const { level: lv, mutedSetting: mm } = audioRef.current;
          const raw = mm ? 0 : meter.getLevel() * (lv / 100);
          peak = Math.max(0, Math.min(100, peak + (raw - peak) * 0.5));
          return peak;
        },
        isActive: () => {
          const { level: lv, mutedSetting: mm } = audioRef.current;
          return !mm && lv > 0 && meter.hasAudio();
        },
      };
      unregisterProbe = registerAudioProbe(layer.id, probe);
    }
    // The browser "Stop sharing" bar ends the video track.
    const vTrack = sharedStream.getVideoTracks()[0];
    const handleEnded = () => {
      sharedStream.getTracks().forEach((t) => t.stop());
      setCameraStream(layer.id, null);
      onEndedRef.current?.();
    };
    vTrack?.addEventListener("ended", handleEnded);
    return () => {
      unregisterProbe();
      meter?.dispose();
      vTrack?.removeEventListener("ended", handleEnded);
    };
  }, [audioOwner, sharedStream, layer.id]);

  // Program: attach the shared live stream to this element.
  useEffect(() => {
    if (audioOwner) return;
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = sharedStream ?? null;
    if (sharedStream) void el.play().catch(() => {});
  }, [audioOwner, sharedStream]);

  // Local monitor volume (only audible when listening locally).
  useEffect(() => {
    if (!audioOwner) return;
    const el = videoRef.current;
    if (el) el.volume = Math.max(0, Math.min(1, level / 100));
  }, [audioOwner, level]);

  if (!sharedStream) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-1 text-center">
        <div
          className={cn("text-[34px] font-semibold tracking-[5px]", MONO)}
          style={{ color: "rgba(94,176,208,.85)" }}
        >
          CAPTURE D&apos;ÉCRAN
        </div>
        <div className="text-[26px] text-white/35">
          Partagez un écran depuis l&apos;inspecteur…
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className="pointer-events-none absolute inset-0 size-full object-cover"
      autoPlay
      muted={!audioOwner || !listenLocal || monitorMuted}
      playsInline
    />
  );
}

/**
 * Off-screen owner of every screen-capture stream (parallel to
 * {@link CameraKeepAlive}). Because a getDisplayMedia stream can never be
 * re-acquired without a fresh user gesture, this owner NEVER acquires — it holds
 * ownership of the audio metering + "stop sharing" detection for whatever stream
 * the inspector has published to the registry, so an on-air capture survives a
 * Preview scene switch. Deduped by id, program copy first. `onEnded(id)` lets the
 * console flip the layer's `captureActive` back off.
 */
export function ScreenKeepAlive({
  layers,
  onEnded,
}: {
  layers: StudioLayer[];
  onEnded: (id: string) => void;
}) {
  const seen = new Set<string>();
  const screens = layers.filter((l) => {
    if (l.type !== "screen" || seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-[-9999px] top-[-9999px] size-px overflow-hidden opacity-0"
    >
      {screens.map((l) => (
        <div key={l.id} className="relative size-px">
          <ScreenMedia layer={l} audioOwner onEnded={() => onEnded(l.id)} />
        </div>
      ))}
    </div>
  );
}
