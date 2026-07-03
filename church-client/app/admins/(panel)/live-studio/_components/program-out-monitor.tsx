"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Loader2, Radio, Square, RadioTower } from "lucide-react";

import { cn } from "@/lib/utils";
import { startFacebookBroadcast, stopFacebookBroadcast } from "@/lib/admin-api";
import { MONO } from "./studio-tokens";
import { startProgramOut, type BibleContext, type ProgramOut } from "./program-out";
import { publishWhip, type WhipPublisher, type WhipState } from "./whip-publisher";
import type { ScriptureVerse, StudioLayer } from "./studio-layers";
import type { StudioSettings } from "@/lib/studio";

// Persist the program-out state so a page refresh can resume it (the compositor
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

/**
 * "Sortie programme" — the flat feed (camera + backgrounds burned in) the studio
 * pushes to Facebook. Fed with the ON-AIR layers so it mirrors the antenne.
 *
 * Two actions:
 *  - "Démarrer" runs the {@link startProgramOut} compositor and previews its
 *    `MediaStream` locally (infra-free).
 *  - "Diffuser sur Facebook" asks the backend for a one-shot WHIP url, then
 *    {@link publishWhip publishes} that same stream to our SRS, which relays to
 *    Facebook RTMPS. The compositor is started on demand if it isn't already.
 *
 * The compositor is driven imperatively (not via an effect) so the button click
 * is the user gesture that unlocks autoplay + the AudioContext.
 */
export function ProgramOutMonitor({
  layers,
  bibleVerse,
  bibleStyle,
  animNonce,
  previewStageRef,
}: {
  layers: StudioLayer[];
  bibleVerse: ScriptureVerse | null;
  bibleStyle: StudioSettings;
  /** Program animation nonce — bumps on CUT / advance / on-air edit to replay entrances. */
  animNonce: number;
  /** The preview stage — its height is the reference for scaling burned-in text. */
  previewStageRef: RefObject<HTMLDivElement | null>;
}) {
  const [on, setOn] = useState(false);
  const [whipState, setWhipState] = useState<WhipState | "idle">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const outRef = useRef<ProgramOut | null>(null);
  const publisherRef = useRef<WhipPublisher | null>(null);
  const broadcastStreamRef = useRef<string | null>(null);
  const layersRef = useRef(layers);
  const bibleRef = useRef<BibleContext>({ verse: bibleVerse, style: bibleStyle });
  const resumedRef = useRef(false);

  const broadcasting = whipState !== "idle";

  /** Create the compositor (once) and mirror its stream in the preview. */
  function startCompositor(): ProgramOut {
    if (outRef.current) return outRef.current;
    // Scale burned-in text to match the preview the operator tuned against.
    const refH = previewStageRef.current?.getBoundingClientRect().height ?? 0;
    const scale = refH > 0 ? 720 / refH : 1;
    const out = startProgramOut({ width: 1280, height: 720, fps: 30, scale });
    out.setScene(layersRef.current, bibleRef.current, animNonce);
    outRef.current = out;
    const el = videoRef.current;
    if (el) {
      el.srcObject = out.stream;
      void el.play().catch(() => {});
    }
    setOn(true);
    setFlag(LS_ON, true);
    return out;
  }

  function stopCompositor() {
    outRef.current?.stop();
    outRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setOn(false);
    setFlag(LS_ON, false);
    setFlag(LS_BROADCASTING, false);
  }

  async function startBroadcast() {
    setBusy(true);
    setError(null);
    try {
      const out = startCompositor();
      const { whipUrl, stream } = await startFacebookBroadcast();
      broadcastStreamRef.current = stream;
      setWhipState("connecting");
      publisherRef.current = await publishWhip({
        endpoint: whipUrl,
        stream: out.stream,
        onState: setWhipState,
      });
      setFlag(LS_BROADCASTING, true);
    } catch (e) {
      setError(broadcastError(e));
      await teardownBroadcast();
    } finally {
      setBusy(false);
    }
  }

  /** Stop publishing + tell the backend to kill the relay. Leaves the local
   *  preview running so the operator can restart without losing the compositor. */
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
    setBusy(false);
  }

  // Keep the compositor scene + on-air verse in sync (animNonce replays entrances).
  useEffect(() => {
    layersRef.current = layers;
    bibleRef.current = { verse: bibleVerse, style: bibleStyle };
    outRef.current?.setScene(layers, bibleRef.current, animNonce);
  }, [layers, bibleVerse, bibleStyle, animNonce]);

  // On mount, resume a broadcast/preview a page refresh interrupted (it lives in
  // the tab). The camera permission + admin session persist; audio resumes on the
  // operator's first click (AudioContext gesture policy).
  useEffect(() => {
    if (resumedRef.current) return;
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

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-studio-panel">
      <div className="flex flex-none items-center gap-2 border-b border-white/6 px-3.5 py-2.5">
        <Radio
          className={cn("size-[15px]", on ? "text-studio-onair" : "text-white/45")}
          strokeWidth={1.8}
        />
        <span className="text-[11px] font-extrabold tracking-[1.2px] text-white uppercase">
          Sortie programme
        </span>
        {broadcasting && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-md px-1.5 py-[3px] text-[9px] font-bold tracking-wide uppercase",
              MONO,
              whipState === "connected"
                ? "bg-studio-onair/15 text-studio-onair"
                : whipState === "failed"
                  ? "bg-red-500/15 text-red-400"
                  : "bg-studio-sandbox/15 text-studio-sandbox",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                whipState === "connected"
                  ? "animate-onair-pulse bg-studio-onair"
                  : whipState === "failed"
                    ? "bg-red-400"
                    : "bg-studio-sandbox",
              )}
            />
            {whipState === "connected"
              ? "En direct FB"
              : whipState === "failed"
                ? "Échec"
                : "Connexion…"}
          </span>
        )}
        <button
          type="button"
          onClick={() => (on ? stopCompositor() : startCompositor())}
          disabled={broadcasting}
          className={cn(
            "ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold tracking-wide uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40",
            on
              ? "bg-studio-onair/15 text-studio-onair hover:bg-studio-onair/25"
              : "bg-white/6 text-white/70 hover:bg-white/12 hover:text-white",
          )}
        >
          {on ? <Square className="size-3 fill-current" /> : <Radio className="size-3" />}
          {on ? "Arrêter" : "Démarrer"}
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-[#0a0613] p-2">
        {on ? (
          <video
            ref={videoRef}
            className="size-full rounded-lg bg-black object-contain"
            muted
            playsInline
            autoPlay
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 px-6 text-center text-white/40">
            <Radio className="size-6 text-white/25" strokeWidth={1.4} />
            <div className="text-[12px] font-semibold text-white/55">Sortie inactive</div>
            <div className="text-[11px] leading-relaxed">
              Démarre pour prévisualiser le flux plat (caméra + fonds incrustés) qui partira vers
              Facebook.
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-none flex-col gap-2 border-t border-white/6 px-3.5 py-2.5">
        <button
          type="button"
          onClick={() => void (broadcasting ? stopBroadcast() : startBroadcast())}
          disabled={busy}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12px] font-bold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            broadcasting
              ? "bg-studio-onair/15 text-studio-onair hover:bg-studio-onair/25"
              : "bg-[#1877f2] text-white hover:bg-[#1877f2]/85",
          )}
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : broadcasting ? (
            <Square className="size-3.5 fill-current" />
          ) : (
            <RadioTower className="size-3.5" />
          )}
          {broadcasting ? "Arrêter la diffusion Facebook" : "Diffuser sur Facebook"}
        </button>
        {error ? (
          <p className="text-[10.5px] leading-snug text-red-400">{error}</p>
        ) : (
          <p className="text-[10px] leading-snug text-white/35">
            Diffuse cette sortie vers Facebook via notre serveur. La clé se règle dans Réglages →
            Stream.
          </p>
        )}
      </div>
    </div>
  );
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
