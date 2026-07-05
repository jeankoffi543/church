"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import { startFacebookBroadcast, stopFacebookBroadcast } from "@/lib/admin-api";
import { startProgramOut, type BibleContext, type ProgramOut } from "./program-out";
import { publishWhip, type WhipPublisher, type WhipState } from "./whip-publisher";
import type { ScriptureVerse, StudioLayer } from "./studio-layers";
import type { StudioSettings } from "@/lib/studio";

// Persist the broadcast state so a page refresh can resume it (the compositor
// and WHIP publish live in the tab — a reload otherwise drops the broadcast).
const LS_ON = "studio_progout_on";
const LS_BROADCASTING = "studio_progout_broadcasting";
function setFlag(key: string, value: boolean) {
  try {
    if (value) window.localStorage.setItem(key, "1");
    else window.localStorage.removeItem(key);
  } catch {
    /* private mode / storage disabled */
  }
}
function getFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export type ProgramBroadcast = {
  /** The compositor is running (its stream exists). */
  on: boolean;
  /** A WHIP publish to Facebook is active (any non-idle state). */
  broadcasting: boolean;
  whipState: WhipState | "idle";
  busy: boolean;
  error: string | null;
  /** WHEP playback url the site plays while broadcasting (null when idle). */
  whepUrl: string | null;
  /**
   * Runs the compositor + publishes to Facebook. Resolves the WHEP playback url
   * on success (for the public site), or `null` on failure.
   */
  startBroadcast: () => Promise<string | null>;
  /** Stops publishing + the local compositor and tells the backend to kill the relay. */
  stopBroadcast: () => Promise<void>;
};

/**
 * Headless program-out broadcaster. Runs the {@link startProgramOut} compositor
 * (camera + backgrounds burned in) and publishes its flat `MediaStream` to our
 * SRS via WHIP, which relays to Facebook RTMPS. Extracted from the old "Sortie
 * programme" card so a single studio control can drive Facebook + the site live
 * together — there is no local preview element anymore (the Antenne monitor
 * already mirrors the on-air feed).
 *
 * Driven imperatively (start/stop are user gestures) so the click unlocks
 * autoplay + the AudioContext.
 */
export function useProgramBroadcast({
  layers,
  bibleVerse,
  bibleStyle,
  animNonce,
  previewStageRef,
  autoResume = true,
}: {
  layers: StudioLayer[];
  bibleVerse: ScriptureVerse | null;
  bibleStyle: StudioSettings;
  /** Program animation nonce — bumps on CUT / advance / on-air edit to replay entrances. */
  animNonce: number;
  /** The preview stage — its height is the reference for scaling burned-in text. */
  previewStageRef: RefObject<HTMLDivElement | null>;
  /** Resume a broadcast a page refresh interrupted (default true). */
  autoResume?: boolean;
}): ProgramBroadcast {
  const [on, setOn] = useState(false);
  const [whipState, setWhipState] = useState<WhipState | "idle">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whepUrl, setWhepUrl] = useState<string | null>(null);

  const outRef = useRef<ProgramOut | null>(null);
  const publisherRef = useRef<WhipPublisher | null>(null);
  const broadcastStreamRef = useRef<string | null>(null);
  const layersRef = useRef(layers);
  const bibleRef = useRef<BibleContext>({ verse: bibleVerse, style: bibleStyle });
  const animRef = useRef(animNonce);
  const resumedRef = useRef(false);

  const broadcasting = whipState !== "idle";

  /** Create the compositor (once). Renders at 1080p so HD images/text stay sharp. */
  function startCompositor(): ProgramOut {
    if (outRef.current) return outRef.current;
    const refH = previewStageRef.current?.getBoundingClientRect().height ?? 0;
    const scale = refH > 0 ? 1080 / refH : 1;
    const out = startProgramOut({ width: 1920, height: 1080, fps: 30, scale });
    out.setScene(layersRef.current, bibleRef.current, animRef.current);
    outRef.current = out;
    setOn(true);
    setFlag(LS_ON, true);
    return out;
  }

  function stopCompositor() {
    outRef.current?.stop();
    outRef.current = null;
    setOn(false);
    setFlag(LS_ON, false);
    setFlag(LS_BROADCASTING, false);
  }

  async function startBroadcast(): Promise<string | null> {
    setBusy(true);
    setError(null);
    try {
      const out = startCompositor();
      const { whipUrl, stream, whepUrl: whep } = await startFacebookBroadcast();
      broadcastStreamRef.current = stream;
      setWhipState("connecting");
      publisherRef.current = await publishWhip({
        endpoint: whipUrl,
        stream: out.stream,
        onState: setWhipState,
      });
      setWhepUrl(whep);
      setFlag(LS_BROADCASTING, true);
      return whep;
    } catch (e) {
      setError(broadcastError(e));
      await teardownBroadcast();
      stopCompositor();
      return null;
    } finally {
      setBusy(false);
    }
  }

  /** Stop publishing + tell the backend to kill the relay. */
  async function teardownBroadcast() {
    try {
      await publisherRef.current?.stop();
    } catch {
      /* closing the peer connection is enough */
    }
    publisherRef.current = null;
    const stream = broadcastStreamRef.current;
    broadcastStreamRef.current = null;
    setWhipState("idle");
    setWhepUrl(null);
    setFlag(LS_BROADCASTING, false);
    if (stream) {
      try {
        await stopFacebookBroadcast(stream);
      } catch {
        /* best-effort — the relay also stops on SRS on_unpublish */
      }
    }
  }

  async function stopBroadcast() {
    setBusy(true);
    await teardownBroadcast();
    stopCompositor();
    setBusy(false);
  }

  // Keep the compositor scene + on-air verse in sync (animNonce replays entrances).
  useEffect(() => {
    layersRef.current = layers;
    bibleRef.current = { verse: bibleVerse, style: bibleStyle };
    animRef.current = animNonce;
    outRef.current?.setScene(layers, bibleRef.current, animNonce);
  }, [layers, bibleVerse, bibleStyle, animNonce]);

  // On mount, resume a broadcast a page refresh interrupted (it lives in the tab).
  useEffect(() => {
    if (!autoResume || resumedRef.current) return;
    resumedRef.current = true;
    const t = setTimeout(() => {
      if (getFlag(LS_BROADCASTING)) void startBroadcast();
      else if (getFlag(LS_ON)) startCompositor();
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn before leaving/refreshing while the output or a broadcast is live.
  useEffect(() => {
    if (!on && !broadcasting) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [on, broadcasting]);

  // Release everything on unmount.
  useEffect(
    () => () => {
      void publisherRef.current?.stop();
      outRef.current?.stop();
    },
    [],
  );

  return { on, broadcasting, whipState, busy, error, whepUrl, startBroadcast, stopBroadcast };
}

/** Human-readable message for a broadcast start failure. */
function broadcastError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg === "FORBIDDEN" || msg === "UNAUTHORIZED") {
    return "Accès refusé — permission « manage_live » requise.";
  }
  if (msg.includes("Clé de stream Facebook")) {
    return "Aucune clé Facebook configurée (Réglages → Stream).";
  }
  return `Diffusion impossible : ${msg}`;
}
