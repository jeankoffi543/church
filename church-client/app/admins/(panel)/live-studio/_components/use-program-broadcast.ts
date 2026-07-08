"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { startFacebookBroadcast, stopFacebookBroadcast } from "@/lib/admin-api";
import { fixWebmDuration } from "./webm-duration-fix";
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
  /** Raw WebRTC stats of the outgoing WHIP connection — `null` when not
   *  publishing (compositor-only / idle). Feeds `use-encoder-stats.ts`. */
  getStats: () => Promise<RTCStatsReport | null>;
  /** A local MediaRecorder capture of the exact program feed is running. */
  recording: boolean;
  /**
   * Starts recording the program feed to a local file (CHR-59). Decoupled from
   * Facebook: starts the compositor on its own if nothing is broadcasting yet
   * (rehearsal recording), so it works whether or not a real direct is live.
   * Resolves `true` on success.
   */
  startRecording: () => Promise<boolean>;
  /** Stops recording and triggers a local file download of exactly what was
   *  captured. Only tears down the compositor if recording had started it
   *  (never interrupts an active real broadcast). */
  stopRecording: () => Promise<void>;
  /** Starts the compositor LOCALLY ONLY — no Facebook publish, no WHIP. Used by
   *  sandbox mode (CHR-59) so the operator can rehearse the composited output
   *  without ever going out over the wire. `stopBroadcast()` tears it back down
   *  the same way it already does for a real broadcast (no-op on the
   *  Facebook/WHIP side since neither was ever started). */
  ensureCompositor: () => void;
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
  replaySet = null,
  activeTriggers = null,
  composition,
  output,
  autoResume = true,
}: {
  layers: StudioLayer[];
  bibleVerse: ScriptureVerse | null;
  bibleStyle: StudioSettings;
  /** Program animation nonce — bumps on CUT / advance / on-air edit to replay entrances. */
  animNonce: number;
  /** Layer ids that replay on a CUT (frozen at cut time); null = replay all. */
  replaySet?: ReadonlySet<string> | null;
  /** Trigger source ids currently on air — drives CHR-57 reactions on the canvas. */
  activeTriggers?: ReadonlySet<string> | null;
  /** Logical composition (OBS base canvas) the layer styles are authored in. */
  composition: { width: number; height: number };
  /** Broadcast canvas resolution + framerate (OBS output). */
  output: { width: number; height: number; fps: number };
  /** Resume a broadcast a page refresh interrupted (default true). */
  autoResume?: boolean;
}): ProgramBroadcast {
  const [on, setOn] = useState(false);
  const [whipState, setWhipState] = useState<WhipState | "idle">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whepUrl, setWhepUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  const outRef = useRef<ProgramOut | null>(null);
  const publisherRef = useRef<WhipPublisher | null>(null);
  const broadcastStreamRef = useRef<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordingStartedAtRef = useRef(0);
  /** Recording started the compositor itself (no broadcast was running) — so
   *  stopping recording should tear it back down, unless a real broadcast has
   *  since started using it too. */
  const compositorOwnedByRecordingRef = useRef(false);
  const layersRef = useRef(layers);
  const bibleRef = useRef<BibleContext>({ verse: bibleVerse, style: bibleStyle });
  const animRef = useRef(animNonce);
  const replayRef = useRef<ReadonlySet<string> | null>(replaySet);
  const triggersRef = useRef<ReadonlySet<string> | null>(activeTriggers);
  const resumedRef = useRef(false);

  const broadcasting = whipState !== "idle";

  /**
   * Create the compositor (once) at the chosen OUTPUT resolution. Styles are
   * authored in composition px (the preview stage renders 1:1 in that space), so
   * the px scale is exactly `output.height / composition.height` — no fragile
   * DOM measurement, preview and broadcast are metrically identical.
   */
  function startCompositor(): ProgramOut {
    if (outRef.current) return outRef.current;
    const scale = composition.height > 0 ? output.height / composition.height : 1;
    const out = startProgramOut({ width: output.width, height: output.height, fps: output.fps, scale });
    out.setScene(layersRef.current, bibleRef.current, animRef.current, replayRef.current, triggersRef.current);
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
      // The compositor is now jointly needed by the real broadcast — recording
      // (if any) no longer solely "owns" it, so stopping recording later must
      // not tear it down while Facebook is still using it.
      compositorOwnedByRecordingRef.current = false;
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
    // A local recording in progress keeps the compositor alive — stopping the
    // PUBLIC broadcast must never cut off a recording the operator is keeping
    // rolling (e.g. closing remarks after ending the public feed).
    if (recorderRef.current) {
      compositorOwnedByRecordingRef.current = true;
    } else {
      stopCompositor();
    }
    setBusy(false);
  }

  /** video/webm is the only container every Chromium/Firefox build reliably
   *  produces without extra licensing — try the best codec pair first. */
  function pickRecorderMimeType(): string | undefined {
    if (typeof MediaRecorder === "undefined") return undefined;
    const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    return candidates.find((c) => MediaRecorder.isTypeSupported(c));
  }

  function downloadRecording(blob: Blob) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const d = new Date();
    const name = `culte-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.webm`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function startRecording(): Promise<boolean> {
    if (recorderRef.current) return true; // already recording
    setError(null);
    try {
      const wasOn = !!outRef.current;
      const out = startCompositor();
      compositorOwnedByRecordingRef.current = !wasOn;
      const mimeType = pickRecorderMimeType();
      const mr = mimeType ? new MediaRecorder(out.stream, { mimeType }) : new MediaRecorder(out.stream);
      recordedChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mr.start(1000); // 1s timeslice — flush periodically, resilient to a crash
      recorderRef.current = mr;
      recordingStartedAtRef.current = Date.now();
      setRecording(true);
      return true;
    } catch (e) {
      setError(`Enregistrement impossible : ${e instanceof Error ? e.message : String(e)}`);
      // Only undo what WE started — never rip out a compositor the broadcast owns.
      if (compositorOwnedByRecordingRef.current) stopCompositor();
      return false;
    }
  }

  async function stopRecording(): Promise<void> {
    const mr = recorderRef.current;
    if (!mr) return;
    await new Promise<void>((resolve) => {
      mr.addEventListener("stop", () => resolve(), { once: true });
      mr.stop();
    });
    recorderRef.current = null;
    setRecording(false);
    const durationMs = Date.now() - recordingStartedAtRef.current;
    const raw = new Blob(recordedChunksRef.current, { type: mr.mimeType || "video/webm" });
    recordedChunksRef.current = [];
    if (raw.size > 0) {
      // Chrome's MediaRecorder never writes a Duration for a live capture
      // (confirmed: Segment→Info only has TimecodeScale/MuxingApp/WritingApp)
      // — the file plays in Chrome/VLC but many stricter players refuse a
      // duration-less webm outright ("impossible de lire la vidéo"). Patch it
      // in before offering the download; falls back to the raw blob if the
      // bytes don't match the expected structure.
      const blob = await fixWebmDuration(raw, durationMs);
      downloadRecording(blob);
    }
    // Only recording's OWN compositor comes down — never a live broadcast's.
    if (compositorOwnedByRecordingRef.current && !publisherRef.current) {
      compositorOwnedByRecordingRef.current = false;
      stopCompositor();
    }
  }

  // Keep the compositor scene + on-air verse in sync (animNonce replays entrances,
  // filtered by the frozen replaySet).
  useEffect(() => {
    layersRef.current = layers;
    bibleRef.current = { verse: bibleVerse, style: bibleStyle };
    animRef.current = animNonce;
    replayRef.current = replaySet;
    triggersRef.current = activeTriggers;
    outRef.current?.setScene(layers, bibleRef.current, animNonce, replaySet, activeTriggers);
  }, [layers, bibleVerse, bibleStyle, animNonce, replaySet, activeTriggers]);

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

  // Warn before leaving/refreshing while the output, a broadcast, or a
  // recording is live — a refresh would silently drop it.
  useEffect(() => {
    if (!on && !broadcasting && !recording) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [on, broadcasting, recording]);

  // Release everything on unmount.
  useEffect(
    () => () => {
      void publisherRef.current?.stop();
      if (recorderRef.current) recorderRef.current.stop();
      outRef.current?.stop();
    },
    [],
  );

  // Stable identities (read only from refs) — CHR-59 fix: these used to be
  // recreated inline on every render. `getStats` is a dependency of
  // `useEncoderStats`'s effect, so a fresh function every render tore that
  // effect down and re-ran it (→ `setStats` → re-render → new `getStats` →
  // repeat), pinning a tight loop that made the status bar flicker/blink
  // almost too fast to read.
  const getStats = useCallback(() => publisherRef.current?.getStats() ?? Promise.resolve(null), []);
  const ensureCompositor = useCallback(() => {
    startCompositor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    on,
    broadcasting,
    whipState,
    busy,
    error,
    whepUrl,
    startBroadcast,
    stopBroadcast,
    getStats,
    recording,
    startRecording,
    stopRecording,
    ensureCompositor,
  };
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
