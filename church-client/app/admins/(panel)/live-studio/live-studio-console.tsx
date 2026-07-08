"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, AlertCircle, AlertTriangle, Square, Maximize } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  searchBible,
  navigateBible,
  getBibleTranslations,
  getCurrentScripture,
  DEFAULT_STUDIO_SETTINGS,
  type ScriptureVerse,
  type StudioSettings,
  type NavigateDirection,
} from "@/lib/studio";
import {
  broadcastScripture,
  importStudioMediaFromUrl,
  setPreparedVerses,
  updateAdminSettings,
} from "@/lib/admin-api";
import { parseResolution } from "./_components/studio-style";
import { StudioHeader } from "./_components/studio-header";
import { StageMonitor } from "./_components/stage-monitor";
import { CameraKeepAlive, ScreenKeepAlive } from "./_components/composite-layer";
import { TransitionBar } from "./_components/transition-bar";
import { ScenesDock } from "./_components/scenes-dock";
import { SourcesDock } from "./_components/sources-dock";
import { MixerDock } from "./_components/mixer-dock";
import { InspectorDock } from "./_components/inspector-dock";
import { ControlsDock } from "./_components/controls-dock";
import { useProgramBroadcast } from "./_components/use-program-broadcast";
import { useEncoderStats } from "./_components/use-encoder-stats";
import {
  lsGet,
  lsGetJSON,
  lsSet,
  lsSetJSON,
  SS_CURRENT_SCENE,
  SS_PREVIEW_VERSE,
  SS_PROGRAM_LAYERS,
  SS_PROGRAM_SCENE,
} from "./_components/studio-persist";
import { ResizableRow } from "./_components/resizable-row";
import { StatusBar } from "./_components/status-bar";
import { SettingsModal } from "./_components/settings-modal";
import {
  createLayer,
  hasAudio,
  replaysOnCut,
  type StudioLayer,
  type StudioLayerType,
  type StudioScene,
} from "./_components/studio-layers";
import { attachMediaMeter, registerAudioProbe, resumeAudioContext, registerAudioController, getMonitorMuted, subscribeMonitorMuted } from "./_components/studio-audio";

type Status = { type: "success" | "error"; message: string } | null;


const PRELOADED_PRESETS: Array<{ name: string; settings: StudioSettings }> = [
  {
    name: "Culte Dominical Doré",
    settings: {
      layout: "lower_third",
      animation: "clip_reveal",
      font: "Cormorant Garamond",
      background: "gradient_purple",
      duration: 0,
      fontRefFamily: "Plus Jakarta Sans",
      fontRefWeight: "700",
      fontRefStyle: "normal",
      fontRefTransform: "uppercase",
      fontRefDecoration: "none",
      fontRefSpacing: 7.5,
      fontRefSize: 39,
      fontRefLineHeight: 1.2,
      fontRefColor: "#e2b85f",
      fontBodyFamily: "Cormorant Garamond",
      fontBodyWeight: "500",
      fontBodyStyle: "normal",
      fontBodyTransform: "none",
      fontBodyDecoration: "none",
      fontBodySpacing: 0,
      fontBodySize: 84,
      fontBodyLineHeight: 1.3,
      fontBodyColor: "#ffffff",
      fontVerFamily: "Plus Jakarta Sans",
      fontVerWeight: "600",
      fontVerStyle: "italic",
      fontVerTransform: "uppercase",
      fontVerDecoration: "none",
      fontVerSpacing: 3,
      fontVerSize: 33,
      fontVerLineHeight: 1.2,
      fontVerColor: "#e2b85f",
      containerShape: "rounded_rectangle",
      containerBg: "rgba(22, 15, 51, 0.95)",
      containerBorderRadius: 48,
      containerBorderWidth: 4.5,
      containerBorderStyle: "solid",
      containerBorderColor: "rgba(226, 184, 95, 0.25)",
      containerPaddingX: 84,
      containerPaddingY: 72,
      shadowBlur: 105,
      shadowSpread: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 36,
      shadowColor: "rgba(0, 0, 0, 0.6)",
      positionMode: "predefined",
      predefinedPosition: "centered_bottom",
      customX: 10,
      customY: 70,
      customWidth: 80,
      customHeight: 20,
      animDuration: 600,
      animEasing: "ease-out"
    }
  },
  {
    name: "Jeunesse Néon Vif",
    settings: {
      layout: "lower_third",
      animation: "scale",
      font: "Plus Jakarta Sans",
      background: "solid_dark",
      duration: 0,
      fontRefFamily: "Inter",
      fontRefWeight: "800",
      fontRefStyle: "normal",
      fontRefTransform: "uppercase",
      fontRefDecoration: "none",
      fontRefSpacing: 6,
      fontRefSize: 36,
      fontRefLineHeight: 1.2,
      fontRefColor: "#ff007f",
      fontBodyFamily: "Plus Jakarta Sans",
      fontBodyWeight: "700",
      fontBodyStyle: "normal",
      fontBodyTransform: "none",
      fontBodyDecoration: "none",
      fontBodySpacing: 1.5,
      fontBodySize: 75,
      fontBodyLineHeight: 1.2,
      fontBodyColor: "linear-gradient(90deg, #ff007f 0%, #00e5ff 100%)",
      fontVerFamily: "Plus Jakarta Sans",
      fontVerWeight: "600",
      fontVerStyle: "italic",
      fontVerTransform: "uppercase",
      fontVerDecoration: "none",
      fontVerSpacing: 3,
      fontVerSize: 33,
      fontVerLineHeight: 1.2,
      fontVerColor: "#00e5ff",
      containerShape: "asymmetric",
      containerBg: "rgba(10, 5, 25, 0.96)",
      containerBorderRadius: 48,
      containerBorderWidth: 6,
      containerBorderStyle: "glow",
      containerBorderColor: "#ff007f",
      containerPaddingX: 72,
      containerPaddingY: 60,
      shadowBlur: 60,
      shadowSpread: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 24,
      shadowColor: "rgba(255, 0, 127, 0.25)",
      positionMode: "predefined",
      predefinedPosition: "lower_third_left",
      customX: 10,
      customY: 70,
      customWidth: 80,
      customHeight: 20,
      animDuration: 400,
      animEasing: "ease-out"
    }
  },
  {
    name: "Ticker Transparent Bas",
    settings: {
      layout: "lower_third",
      animation: "slide_left",
      font: "Inter",
      background: "none",
      duration: 0,
      fontRefFamily: "Inter",
      fontRefWeight: "700",
      fontRefStyle: "normal",
      fontRefTransform: "uppercase",
      fontRefDecoration: "none",
      fontRefSpacing: 9,
      fontRefSize: 33,
      fontRefLineHeight: 1.2,
      fontRefColor: "#00e5ff",
      fontBodyFamily: "Inter",
      fontBodyWeight: "500",
      fontBodyStyle: "normal",
      fontBodyTransform: "none",
      fontBodyDecoration: "none",
      fontBodySpacing: 0,
      fontBodySize: 54,
      fontBodyLineHeight: 1.2,
      fontBodyColor: "#ffffff",
      fontVerFamily: "Inter",
      fontVerWeight: "600",
      fontVerStyle: "italic",
      fontVerTransform: "uppercase",
      fontVerDecoration: "none",
      fontVerSpacing: 3,
      fontVerSize: 30,
      fontVerLineHeight: 1.2,
      fontVerColor: "#00e5ff",
      containerShape: "transparent",
      containerBg: "transparent",
      containerBorderRadius: 0,
      containerBorderWidth: 0,
      containerBorderStyle: "none",
      containerBorderColor: "transparent",
      containerPaddingX: 60,
      containerPaddingY: 30,
      shadowBlur: 0,
      shadowSpread: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowColor: "transparent",
      positionMode: "predefined",
      predefinedPosition: "ticker",
      customX: 0,
      customY: 86,
      customWidth: 100,
      customHeight: 14,
      animDuration: 800,
      animEasing: "linear"
    }
  }
];

const DEFAULT_SCENES: StudioScene[] = [
  {
    id: "scene-1",
    name: "Culte · Bible",
    layers: [
      { id: "bible", type: "bible", name: "Verset biblique", visible: true, style: DEFAULT_STUDIO_SETTINGS },
    ],
  },
  {
    id: "scene-2",
    name: "Caméra plein cadre",
    layers: [
      {
        id: "cam-1",
        type: "camera",
        name: "Caméra principale",
        visible: true,
        style: {
          ...DEFAULT_STUDIO_SETTINGS,
          containerShape: "transparent",
          positionMode: "predefined",
          predefinedPosition: "full_screen",
        },
      },
    ],
  },
];

/** Hydrate the scene list from the persisted `live_scenes` setting, or fall
 *  back to the starter scenes on first use. */
function buildInitialScenes(
  initialSettings: Record<string, Record<string, unknown>>,
): StudioScene[] {
  const saved = (initialSettings.live_broadcast_styles || {}).live_scenes as
    | StudioScene[]
    | undefined;
  return Array.isArray(saved) && saved.length > 0 ? saved : DEFAULT_SCENES;
}

/** Drop transient blob: image URLs before persisting (they don't survive a reload). */
function sanitizeScenes(scenes: StudioScene[]): StudioScene[] {
  return scenes.map((s) => ({
    ...s,
    layers: s.layers.map((l) =>
      l.imageUrl?.startsWith("blob:") ? { ...l, imageUrl: "" } : l,
    ),
  }));
}

const getAudioUrl = (url: string | undefined | null): string => {
  if (!url) return "";
  if (url.startsWith("blob:") || url.startsWith("data:") || url.startsWith("http:") || url.startsWith("https:")) {
    return url;
  }
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const backendUrl = apiUrl ? apiUrl.replace("/api/v1", "") : "http://127.0.0.1:8000";
  return url.startsWith("/") ? `${backendUrl}${url}` : url;
};

function AudioElementPlayer({
  layer,
  onEnded,
}: {
  layer: StudioLayer;
  onEnded: () => void;
}) {
  const monitorMuted = useSyncExternalStore(subscribeMonitorMuted, getMonitorMuted, () => false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastLoadedUrlRef = useRef<string | undefined>(undefined);

  // Register AudioController so the inspector can control playback and seek
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const controller = {
      play: () => {
        el.play().catch((err) => console.log("Audio playback failed:", err));
      },
      pause: () => {
        el.pause();
      },
      stop: () => {
        el.pause();
        el.currentTime = 0;
      },
      seek: (time: number) => {
        const parsedTime = parseFloat(String(time));
        if (!isNaN(parsedTime) && isFinite(parsedTime)) {
          el.currentTime = parsedTime;
        }
      },
      getState: () => ({
        currentTime: el.currentTime,
        duration: el.duration || 0,
        paused: el.paused,
        ended: el.ended,
        ready: el.readyState >= 2,
      }),
    };

    const unregister = registerAudioController(layer.id, controller);
    return () => {
      unregister();
    };
  }, [layer.id, layer.audioFileUrl]);

  // Register AudioProbe for VU meter animation
  useEffect(() => {
    const unregister = registerAudioProbe(layer.id, {
      getLevel: () => {
        if (layer.audioPlaying && !layer.audioMuted) {
          // Generate a lively simulated peak level scaled by current volume
          return Math.max(5, Math.random() * (layer.audioLevel ?? 80) * 0.9);
        }
        return 0;
      },
      isActive: () => !!layer.audioPlaying && !layer.audioMuted,
    });
    return () => {
      unregister();
    };
  }, [layer.id, layer.audioPlaying, layer.audioMuted, layer.audioLevel]);

  // Sync src imperatively using a reference to the raw URL
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (layer.audioFileUrl) {
      if (lastLoadedUrlRef.current !== layer.audioFileUrl) {
        lastLoadedUrlRef.current = layer.audioFileUrl;
        el.src = getAudioUrl(layer.audioFileUrl);
        el.load();
      }
    } else {
      if (lastLoadedUrlRef.current !== undefined) {
        lastLoadedUrlRef.current = undefined;
        el.removeAttribute("src");
        el.load();
      }
    }
  }, [layer.audioFileUrl]);

  // Sync settings — ONLY write to DOM when the value actually changed
  // to prevent browser soft-reset of the audio buffer on redundant assignments
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const targetLoop = !!layer.audioLoop;
    if (el.loop !== targetLoop) el.loop = targetLoop;

    const targetSpeed = layer.audioSpeed ?? 1.0;
    if (el.playbackRate !== targetSpeed) el.playbackRate = targetSpeed;

    const targetVolume = (layer.audioMuted || monitorMuted) ? 0 : (layer.audioLevel ?? 80) / 100;
    if (el.volume !== targetVolume) el.volume = targetVolume;
  }, [layer.audioLoop, layer.audioSpeed, layer.audioLevel, layer.audioMuted, monitorMuted]);

  // Sync playing state — only act if the DOM state disagrees with the layer state
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (layer.audioPlaying && el.paused) {
      el.play().catch((err) => console.log("Audio playback blocked:", err));
    } else if (!layer.audioPlaying && !el.paused) {
      el.pause();
    }
  }, [layer.audioPlaying]);

  return (
    <audio
      ref={audioRef}
      onEnded={onEnded}
      preload="auto"
      style={{ display: "none" }}
    />
  );
}

export function LiveStudioConsole({
  initialPrepared,
  initialSettings,
}: {
  initialPrepared: ScriptureVerse[];
  initialSettings: Record<string, Record<string, unknown>>;
}) {
  // Navigation & UI States
  const [showGeneralConfig, setShowGeneralConfig] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState("general");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ScriptureVerse[]>([]);
  const [searching, setSearching] = useState(false);

  // Extended UI/UX Design States
  const [showFullscreenPreview, setShowFullscreenPreview] = useState(false);
  const [dockResetNonce, setDockResetNonce] = useState(0);
  const [newPresetName, setNewPresetName] = useState("");
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [animNonce, setAnimNonce] = useState(0);
  // PER-SOURCE replay tokens for the PREVIEW DOM. A source's token advances ONLY
  // when that source is due to replay (an effect-preview action AND its "Rejouer
  // au CUT" setting resolves true, or it's the source being edited). Encoding
  // replay-ness as a per-source token — not `inSet ? nonce : 0` — avoids a
  // spurious remount when a source merely LEAVES the replay set (e.g. set to
  // "Jamais"): its token then stays put, so it isn't re-triggered. Honours the
  // per-source setting so a "Jamais" source no longer re-animates in the preview
  // when you edit another source; the selected one always previews.
  const [previewTokens, setPreviewTokens] = useState<Record<string, number>>({});
  // Latest inputs for the freeze, assigned after their state is declared below
  // (avoids a temporal-dead-zone on `layers`/`selectedLayerId`/`replayOnCut`).
  const previewReplayInputs = useRef<{ layers: StudioLayer[]; sel: string; global: boolean }>({
    layers: [],
    sel: "",
    global: true,
  });
  const bumpPreviewAnim = useCallback(() => {
    const { layers: ls, sel, global } = previewReplayInputs.current;
    setPreviewTokens((prev) => {
      const next = { ...prev };
      for (const l of ls) {
        if (replaysOnCut(l, global) || l.id === sel) next[l.id] = (next[l.id] ?? 0) + 1;
      }
      return next;
    });
    setAnimNonce((n) => n + 1);
  }, []);
  const playAnim = bumpPreviewAnim;

  // Re-hydrated presets state
  const [presets, setPresets] = useState<Array<{ name: string; settings: StudioSettings }>>(() => {
    const liveStyles = initialSettings.live_broadcast_styles || {};
    const dbPresets = liveStyles.live_presets as Array<{ name: string; settings: StudioSettings }> || [];
    return dbPresets.length > 0 ? dbPresets : PRELOADED_PRESETS;
  });

  const [preview, setPreview] = useState<ScriptureVerse | null>(null);
  const [live, setLive] = useState<ScriptureVerse | null>(null);
  const [onAirSettings, setOnAirSettings] = useState<StudioSettings>(() => {
    const liveStyles = initialSettings.live_broadcast_styles || {};
    const layout = (liveStyles.live_layout as Record<string, unknown>) || {};
    const typo = (liveStyles.live_typography as Record<string, unknown>) || {};
    const container = (liveStyles.live_container as Record<string, unknown>) || {};
    const anim = (liveStyles.live_animations as Record<string, unknown>) || {};
    return {
      ...DEFAULT_STUDIO_SETTINGS,
      ...layout,
      ...typo,
      ...container,
      ...anim,
    };
  });
  const [settings, setSettings] = useState<StudioSettings>(() => {
    const liveStyles = initialSettings.live_broadcast_styles || {};
    const layout = (liveStyles.live_layout as Record<string, unknown>) || {};
    const typo = (liveStyles.live_typography as Record<string, unknown>) || {};
    const container = (liveStyles.live_container as Record<string, unknown>) || {};
    const anim = (liveStyles.live_animations as Record<string, unknown>) || {};
    return {
      ...DEFAULT_STUDIO_SETTINGS,
      ...layout,
      ...typo,
      ...container,
      ...anim,
    };
  });

  /** Setter for dynamically-computed keys (template-literal element styling). */
  const setStudioField = useCallback(<K extends keyof StudioSettings>(key: K, value: StudioSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);

  // Load typography fonts dynamically
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Inter:wght@100..900&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Outfit:wght@100..900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=Roboto:ital,wght@0,100..900;1,100..900&display=swap";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const handleSavePreset = async () => {
    const name = newPresetName.trim();
    if (!name) return;
    const targetStyle = selectedLayer?.type === "bible" ? settings : (selectedLayer?.style ?? settings);
    const updated = [
      ...presets.filter((p) => p.name !== name),
      { name, settings: { ...targetStyle } }
    ];
    setPresets(updated);
    localStorage.setItem("studio_presets", JSON.stringify(updated));
    setNewPresetName("");
    setStatus({ type: "success", message: `Preset "${name}" enregistré !` });
    try {
      await updateAdminSettings([
        { key: "live_presets", value: updated, group: "live_broadcast_styles" }
      ]);
    } catch (e) {
      console.error("Failed to save preset to database", e);
    }
  };


  const handleDeletePreset = async (name: string) => {
    const updated = presets.filter((p) => p.name !== name);
    setPresets(updated);
    localStorage.setItem("studio_presets", JSON.stringify(updated));
    try {
      await updateAdminSettings([
        { key: "live_presets", value: updated, group: "live_broadcast_styles" }
      ]);
    } catch (e) {
      console.error("Failed to delete preset from database", e);
    }
  };

  const closeFullscreenPreview = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    setShowFullscreenPreview(false);
  };
  useEffect(() => {
    if (!showFullscreenPreview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowFullscreenPreview(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showFullscreenPreview]);

  // Fullscreen Handlers
  const toggleNativeFullscreen = async () => {
    if (!modalContainerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await modalContainerRef.current.requestFullscreen();
        setIsNativeFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsNativeFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error", err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsNativeFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);


  // Dynamic versions/translations selection
  const [allTranslations, setAllTranslations] = useState<string[]>([]);
  const [translationSearch, setTranslationSearch] = useState("");

  const [prepared, setPrepared] = useState<ScriptureVerse[]>(initialPrepared);
  const [busy, setBusy] = useState(false);
  // CHR-59 — Mode Test · Sandbox: while true, nothing may reach Facebook or the
  // public /live site (video, verse, `live_status`). Declared here (early) since
  // `pushLive`/`masquer` below read it in their `useCallback` deps.
  const [sandbox, setSandbox] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  // Gate the toast portal until after mount (createPortal needs `document`).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // One-shot mount gate for the toast portal — terminal, cannot cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Transferred Live Configuration States
  const liveSettings = initialSettings.live || {};
  const [liveEmbedUrl, setLiveEmbedUrl] = useState((liveSettings.live_embed_url as string) ?? "");
  const [liveStreamActive, setLiveStreamActive] = useState(Boolean(liveSettings.live_status));
  const [liveChatEnabled, setLiveChatEnabled] = useState(liveSettings.live_chat_enabled !== false);
  const [liveTitle, setLiveTitle] = useState((liveSettings.live_title as string) ?? "");
  const [liveDescription, setLiveDescription] = useState((liveSettings.live_description as string) ?? "");
  const [streamKey, setStreamKey] = useState((liveSettings.live_stream_key as string) ?? "");
  const [facebookRtmpsUrl, setFacebookRtmpsUrl] = useState((liveSettings.facebook_rtmps_url as string) ?? "");
  const [facebookStreamKey, setFacebookStreamKey] = useState((liveSettings.facebook_stream_key as string) ?? "");
  const [liveFallbackImage, setLiveFallbackImage] = useState((liveSettings.live_fallback_image as string) ?? "");
  const [pendingLiveFallbackFile, setPendingLiveFallbackFile] = useState<File | null>(null);

  const [sermonTitle, setSermonTitle] = useState((liveSettings.live_sermon_title as string) ?? "");
  const [sermonPreacher, setSermonPreacher] = useState((liveSettings.live_sermon_preacher as string) ?? "");
  const [sermonReference, setSermonReference] = useState((liveSettings.live_sermon_reference as string) ?? "");
  const [sermonPoints, setSermonPoints] = useState<Array<{ id: string; text: string; verse: string }>>(
    (liveSettings.live_sermon_points as Array<{ id: string; text: string; verse: string }>) ?? []
  );

  // Loaded once and round-tripped through saveLiveSettings; no in-console editor yet.
  const [advancedConfig] = useState({
    live_lang: (liveSettings.live_lang as string) ?? "fr",
    live_show_in_feed: liveSettings.live_show_in_feed !== false,
    live_stream_platform: (liveSettings.live_stream_platform as string) ?? "custom",
    live_stream_server: (liveSettings.live_stream_server as string) ?? "rtmp://localhost/live",
    live_video_bitrate: (liveSettings.live_video_bitrate as string) ?? "4500",
    live_audio_bitrate: (liveSettings.live_audio_bitrate as string) ?? "128",
    live_encoder_profile: (liveSettings.live_encoder_profile as string) ?? "high",
    live_record_path: (liveSettings.live_record_path as string) ?? "C:/Videos/OBS",
    live_audio_mic: (liveSettings.live_audio_mic as string) ?? "default",
    live_audio_monitor: (liveSettings.live_audio_monitor as string) ?? "default",
    live_audio_gain: (liveSettings.live_audio_gain as number) ?? 0,
    live_noise_suppression: liveSettings.live_noise_suppression !== false,
    live_ui_contrast: (liveSettings.live_ui_contrast as string) ?? "normal",
    live_ui_text_size: (liveSettings.live_ui_text_size as string) ?? "medium",
    live_audio_cues: Boolean(liveSettings.live_audio_cues),
    live_process_priority: (liveSettings.live_process_priority as string) ?? "high",
    live_stream_delay: (liveSettings.live_stream_delay as number) ?? 0,
    live_auto_reconnect: liveSettings.live_auto_reconnect !== false,
    live_db_cache: (liveSettings.live_db_cache as string) ?? "aggressive",
  });

  // ── Video sizing (OBS-like base/output canvas) — REAL, user-editable ─────
  // Base = the logical composition every layer style is authored in (drives the
  // preview/program stages); Output = the broadcast canvas + framerate. Both are
  // persisted with the live settings and wired end-to-end so preview, antenne
  // and diffusion share one metric space whatever sizes the operator picks.
  const [baseResolution, setBaseResolution] = useState(
    (liveSettings.live_base_resolution as string) ?? "1920x1080",
  );
  const [outputResolution, setOutputResolution] = useState(
    (liveSettings.live_output_resolution as string) ?? "1920x1080",
  );
  const [outputFps, setOutputFps] = useState((liveSettings.live_fps as string) ?? "30");
  const composition = parseResolution(baseResolution, 1920, 1080);
  const outputSize = parseResolution(outputResolution, composition.width, composition.height);
  // fps sanity-clamped to [10, 60]. Note: Facebook receives the ffmpeg re-encode
  // (-r 30); a higher canvas rate benefits the site's direct WebRTC playback.
  const output = { ...outputSize, fps: Math.min(60, Math.max(10, parseInt(outputFps, 10) || 30)) };


  const [savingSettings, setSavingSettings] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  // Custom Visibilities & Defaults state variables
  // Use saved preferences, or null as sentinel to mean "show all once loaded"
  const savedVisibleVersions = liveSettings.bible_visible_versions as string[] | undefined;
  const [visibleVersions, setVisibleVersions] = useState<string[]>(
    Array.isArray(savedVisibleVersions) && savedVisibleVersions.length > 0
      ? savedVisibleVersions
      : []
  );
  const [defaultVersion, setDefaultVersionState] = useState<string>(
    (liveSettings.bible_default_version as string) || "LSG"
  );
  const backendUrl = process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace("/api/v1", "")
    : "http://127.0.0.1:8000";

  // Hide the admin layout topbar header for the live studio console
  useEffect(() => {
    const topbar = document.getElementById("admin-topbar");
    const main = document.querySelector("main");
    let originalMainBg = "";

    if (topbar) {
      topbar.style.setProperty("display", "none", "important");
    }

    if (main) {
      originalMainBg = main.style.backgroundColor;
      main.style.backgroundColor = "#090514";
    }

    return () => {
      if (topbar) {
        topbar.style.display = "";
      }
      if (main) {
        main.style.backgroundColor = originalMainBg;
      }
    };
  }, []);

  // Fetch unique translations dynamically from the database
  useEffect(() => {
    getBibleTranslations().then((versions) => {
      const loaded = versions.length > 0 ? versions : ["LSG"];
      setAllTranslations(loaded);
      // If no saved preferences exist, show ALL translations by default
      setVisibleVersions((prev) => (prev.length === 0 ? loaded : prev));
    });
  }, []);

  const visibleVersionsRef = useRef(visibleVersions);
  const defaultVersionRef = useRef(defaultVersion);
  const allTranslationsRef = useRef(allTranslations);

  useEffect(() => {
    visibleVersionsRef.current = visibleVersions;
  }, [visibleVersions]);

  useEffect(() => {
    defaultVersionRef.current = defaultVersion;
  }, [defaultVersion]);

  useEffect(() => {
    allTranslationsRef.current = allTranslations;
  }, [allTranslations]);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 3500);
    return () => clearTimeout(t);
  }, [status]);

  // Recover state: fetch the currently broadcasted scripture and on-air settings
  useEffect(() => {
    getCurrentScripture()
      .then((payload) => {
        if (payload && payload.action === "show" && payload.verse) {
          setLive(payload.verse);
          if (payload.settings) {
            setOnAirSettings(payload.settings);
          }
        } else {
          setLive(null);
        }
      })
      .catch((err) => {
        console.error("Failed to recover live state", err);
      });
  }, []);

  // Debounced auto-save settings to database
  const lastSettingsRef = useRef<StudioSettings>(settings);
  useEffect(() => {
    if (JSON.stringify(lastSettingsRef.current) === JSON.stringify(settings)) {
      return;
    }
    lastSettingsRef.current = settings;

    const timer = setTimeout(async () => {
      const split = {
        live_layout: {
          layout: settings.layout,
          predefinedPosition: settings.predefinedPosition,
          customX: settings.customX,
          customY: settings.customY,
          customWidth: settings.customWidth,
          customHeight: settings.customHeight,
          positionMode: settings.positionMode,
          overflowDirection: settings.overflowDirection,
        },
        live_typography: {
          font: settings.font,
          fontRefFamily: settings.fontRefFamily,
          fontRefWeight: settings.fontRefWeight,
          fontRefStyle: settings.fontRefStyle,
          fontRefTransform: settings.fontRefTransform,
          fontRefDecoration: settings.fontRefDecoration,
          fontRefSpacing: settings.fontRefSpacing,
          fontRefSize: settings.fontRefSize,
          fontRefLineHeight: settings.fontRefLineHeight,
          fontRefColor: settings.fontRefColor,
          fontBodyFamily: settings.fontBodyFamily,
          fontBodyWeight: settings.fontBodyWeight,
          fontBodyStyle: settings.fontBodyStyle,
          fontBodyTransform: settings.fontBodyTransform,
          fontBodyDecoration: settings.fontBodyDecoration,
          fontBodySpacing: settings.fontBodySpacing,
          fontBodySize: settings.fontBodySize,
          fontBodyLineHeight: settings.fontBodyLineHeight,
          fontBodyColor: settings.fontBodyColor,
          fontVerFamily: settings.fontVerFamily,
          fontVerWeight: settings.fontVerWeight,
          fontVerStyle: settings.fontVerStyle,
          fontVerTransform: settings.fontVerTransform,
          fontVerDecoration: settings.fontVerDecoration,
          fontVerSpacing: settings.fontVerSpacing,
          fontVerSize: settings.fontVerSize,
          fontVerLineHeight: settings.fontVerLineHeight,
          fontVerColor: settings.fontVerColor,
        },
        live_container: {
          containerShape: settings.containerShape,
          containerBg: settings.containerBg,
          containerBorderRadius: settings.containerBorderRadius,
          containerBorderWidth: settings.containerBorderWidth,
          containerBorderStyle: settings.containerBorderStyle,
          containerBorderColor: settings.containerBorderColor,
          containerPaddingX: settings.containerPaddingX,
          containerPaddingY: settings.containerPaddingY,
          shadowBlur: settings.shadowBlur,
          shadowSpread: settings.shadowSpread,
          shadowOffsetX: settings.shadowOffsetX,
          shadowOffsetY: settings.shadowOffsetY,
          shadowColor: settings.shadowColor,
        },
        live_animations: {
          animation: settings.animation,
          duration: settings.duration,
          animDuration: settings.animDuration,
          animEasing: settings.animEasing,
        },
      };
      try {
        await updateAdminSettings([
          { key: "live_layout", value: split.live_layout, group: "live_broadcast_styles" },
          { key: "live_typography", value: split.live_typography, group: "live_broadcast_styles" },
          { key: "live_container", value: split.live_container, group: "live_broadcast_styles" },
          { key: "live_animations", value: split.live_animations, group: "live_broadcast_styles" },
        ]);
      } catch (err) {
        console.error("Autosave failed", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [settings]);

  const performSearch = useCallback(async (
    q: string,
    currentVisible: string[],
    currentDefault: string,
    signal?: AbortSignal
  ) => {
    const trimmed = q.trim();
    if (trimmed.length === 0) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    const effectiveVersions = currentVisible.length > 0 ? currentVisible : allTranslationsRef.current;
    const baseVersion = effectiveVersions.includes(currentDefault) ? currentDefault : effectiveVersions[0];
    const activeVersions = [
      baseVersion,
      ...effectiveVersions.filter((v) => v !== baseVersion)
    ];
    try {
      const res = await searchBible(trimmed, activeVersions, signal);
      if (signal?.aborted) return;
      setSearching(false);
      if (!res) return;
      const seen = new Set<string>();
      const merged = [res.match, ...res.suggestions]
        .filter((v): v is ScriptureVerse => !!v)
        .filter((v) => (seen.has(v.reference) ? false : (seen.add(v.reference), true)));
      // Bug 2 (CHR-58): expand each reference into ONE suggestion per selected
      // version — "Jean 1 (LSG)", "Jean 1 (BSD)", "Jean 1 (KVG)" — using the
      // per-version `texts` the API already returns. With no version explicitly
      // selected, keep a single entry (base version), just labelled.
      const expandVersions =
        currentVisible.length > 0
          ? [baseVersion, ...currentVisible.filter((v) => v !== baseVersion)]
          : [baseVersion];
      const expanded: ScriptureVerse[] = [];
      for (const v of merged) {
        const texts = v.texts ?? {};
        const present = expandVersions.filter((ver) => texts[ver] != null);
        const list = present.length > 0 ? present : [v.translation || baseVersion];
        for (const ver of list) {
          expanded.push({
            ...v,
            translation: ver,
            text: texts[ver] ?? v.text,
            texts: { [ver]: texts[ver] ?? v.text },
          });
        }
      }
      setSuggestions(expanded);
    } catch {
      if (signal?.aborted) return;
      setSearching(false);
    }
  }, []);

  /* ── Express search (debounced, abortable) ──────────────────────── */
  useEffect(() => {
    const q = query.trim();
    if (q.length === 0) {
      // Clearing results when the query empties — guarded, cannot cascade.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void performSearch(q, visibleVersionsRef.current, defaultVersionRef.current, controller.signal);
    }, 220);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, performSearch]);

  const pushLive = useCallback(
    async (verse: ScriptureVerse, nextSettings: StudioSettings) => {
      setBusy(true);
      try {
        // CHR-59 sandbox: rehearse locally only. Never call the real public
        // endpoint (persists the verse + fires the Reverb event /live listens
        // to) — the antenne monitor still reflects the verse for the operator,
        // but the public site and Facebook never see it.
        if (!sandbox) {
          await broadcastScripture({ action: "show", verse, settings: nextSettings });
        }
        setLive(verse);
        setOnAirSettings(nextSettings);
        setStatus({
          type: "success",
          message: sandbox ? `Test (sandbox) : ${verse.reference} — non diffusé` : `Diffusé : ${verse.reference}`,
        });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Diffusion impossible." });
      } finally {
        setBusy(false);
      }
    },
    [sandbox],
  );

  const diffuse = useCallback(() => {
    if (!preview) return;
    void pushLive(preview, settings);
  }, [preview, settings, pushLive]);

  const masquer = useCallback(async () => {
    setBusy(true);
    try {
      if (!sandbox) {
        await broadcastScripture({ action: "hide" });
      }
      setLive(null);
      setStatus({ type: "success", message: "Overlay masqué." });
    } catch (err) {
      setStatus({ type: "error", message: (err as Error).message || "Action impossible." });
    } finally {
      setBusy(false);
    }
  }, [sandbox]);

  // Load a verse from the search / prepared list. It always stages it in the
  // preview; when the bible is currently ON AIR (`live`), it ALSO goes straight
  // to the antenne — same behaviour as advancing verses (prev/next), so the
  // operator doesn't have to CUT again for every verse while on air.
  const loadVerse = useCallback(
    (verse: ScriptureVerse) => {
      setPreview(verse);
      if (live) void pushLive(verse, settings);
    },
    [live, settings, pushLive],
  );

  const advance = useCallback(
    async (direction: NavigateDirection) => {
      const base = live ?? preview;
      if (!base) return;
      const effectiveVersions = visibleVersions.length > 0 ? visibleVersions : allTranslations;
      const baseVersion = effectiveVersions.includes(defaultVersion) ? defaultVersion : effectiveVersions[0];
      const activeVersions = [
        baseVersion,
        ...effectiveVersions.filter((v) => v !== baseVersion)
      ];
      const sibling = await navigateBible(base, direction, activeVersions);
      if (!sibling) {
        setStatus({ type: "error", message: "Aucun verset dans cette direction." });
        return;
      }
      setPreview(sibling);
      if (live) void pushLive(sibling, settings);
    },
    [live, preview, settings, pushLive, defaultVersion, visibleVersions, allTranslations],
  );

  // Which navigation directions exist from the current base verse — probed via
  // the same navigate API (null at the bible's edges) so the transition-bar
  // arrows are disabled exactly when there is no previous/next verse or chapter.
  const [navAvail, setNavAvail] = useState({
    prevVerse: true,
    nextVerse: true,
    prevChapter: true,
    nextChapter: true,
  });
  useEffect(() => {
    const base = live ?? preview;
    if (!base) return;
    let cancelled = false;
    const versions = [defaultVersion];
    void (async () => {
      const [pv, nv, pc, nc] = await Promise.all([
        navigateBible(base, "prev_verse", versions),
        navigateBible(base, "next_verse", versions),
        navigateBible(base, "prev_chapter", versions),
        navigateBible(base, "next_chapter", versions),
      ]);
      if (!cancelled) {
        setNavAvail({ prevVerse: !!pv, nextVerse: !!nv, prevChapter: !!pc, nextChapter: !!nc });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [live, preview, defaultVersion]);

  const liveRef = useRef(live);
  useEffect(() => {
    liveRef.current = live;
  });
  useEffect(() => {
    if (!liveRef.current) return;
    const t = setTimeout(() => {
      if (liveRef.current) {
        // CHR-59 sandbox: a style tweak while "live" must not leak the verse
        // to the real public endpoint either.
        if (!sandbox) void broadcastScripture({ action: "show", verse: liveRef.current, settings });
        setOnAirSettings(settings);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [settings, sandbox]);

  const persistPrepared = useCallback(async (next: ScriptureVerse[]) => {
    setPrepared(next);
    try {
      await setPreparedVerses(next);
    } catch {
      /* keep optimistic list; a reload will reconcile */
    }
  }, []);

  const addToPrepared = useCallback(
    (verse: ScriptureVerse) => {
      // Identity is reference + version (CHR-58): the same verse can be prepared
      // in several versions (e.g. Jean 1 in LSG and in BSD).
      const same = (a: ScriptureVerse, b: ScriptureVerse) =>
        a.reference === b.reference && (a.translation || "") === (b.translation || "");
      if (prepared.some((v) => same(v, verse))) return;
      void persistPrepared([...prepared, verse]);
    },
    [prepared, persistPrepared],
  );

  // Media & Settings Handlers
  const getPreviewUrl = (urlOrBlob: string) => {
    if (!urlOrBlob) return "";
    if (urlOrBlob.startsWith("blob:") || urlOrBlob.startsWith("data:")) {
      return urlOrBlob;
    }
    return urlOrBlob.startsWith("/") ? `${backendUrl}${urlOrBlob}` : urlOrBlob;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (liveFallbackImage.startsWith("blob:")) {
      URL.revokeObjectURL(liveFallbackImage);
    }

    const previewUrl = URL.createObjectURL(file);
    setLiveFallbackImage(previewUrl);
    setPendingLiveFallbackFile(file);
  };

  // Sermon Points Modifiers
  const addSermonPoint = () => {
    const nextNum = String(sermonPoints.length + 1).padStart(2, "0");
    setSermonPoints([...sermonPoints, { id: nextNum, text: "", verse: "" }]);
  };

  const removeSermonPoint = (index: number) => {
    const updated = sermonPoints.filter((_, i) => i !== index).map((p, idx) => ({
      ...p,
      id: String(idx + 1).padStart(2, "0"),
    }));
    setSermonPoints(updated);
  };

  const updateSermonPointField = (index: number, field: "text" | "verse" | "id", value: string) => {
    setSermonPoints(
      sermonPoints.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const saveLiveSettings = async (overrideStatus?: boolean, overrideEmbedUrl?: string) => {
    setSavingSettings(true);
    setStatus(null);
    try {
      const targetStatus = overrideStatus !== undefined ? overrideStatus : liveStreamActive;
      // Priority for the site's live source: an explicit override (the studio's own
      // HLS feed) wins; else a visible "Direct externe" source's link; else the
      // link configured in the settings.
      const embedFromSource =
        overrideStatus === true
          ? scenes.flatMap((s) => s.layers).find((l) => l.type === "embed" && l.visible && l.feedUrl)
              ?.feedUrl
          : undefined;
      const effectiveEmbedUrl = overrideEmbedUrl ?? embedFromSource ?? liveEmbedUrl;
      if (effectiveEmbedUrl !== liveEmbedUrl) setLiveEmbedUrl(effectiveEmbedUrl);
      const payload = [
        { key: "live_embed_url", value: effectiveEmbedUrl, group: "live" },
        { key: "live_status", value: targetStatus, group: "live" },
        { key: "live_chat_enabled", value: liveChatEnabled, group: "live" },
        { key: "live_title", value: liveTitle, group: "live" },
        { key: "live_description", value: liveDescription, group: "live" },
        { key: "live_stream_key", value: streamKey, group: "live" },
        { key: "facebook_rtmps_url", value: facebookRtmpsUrl, group: "live" },
        { key: "facebook_stream_key", value: facebookStreamKey, group: "live" },
        { 
          key: "live_fallback_image", 
          value: liveFallbackImage.startsWith("blob:") ? "" : liveFallbackImage, 
          group: "live" 
        },
        { key: "live_sermon_title", value: sermonTitle, group: "live" },
        { key: "live_sermon_preacher", value: sermonPreacher, group: "live" },
        { key: "live_sermon_reference", value: sermonReference, group: "live" },
        { key: "live_sermon_points", value: sermonPoints, group: "live" },
        { key: "bible_visible_versions", value: visibleVersions, group: "live" },
        { key: "bible_default_version", value: defaultVersion, group: "live" },
        { key: "live_base_resolution", value: baseResolution, group: "live" },
        { key: "live_output_resolution", value: outputResolution, group: "live" },
        { key: "live_fps", value: outputFps, group: "live" },
        ...Object.entries(advancedConfig).map(([key, value]) => ({
          key,
          value,
          group: "live"
        }))
      ];

      const files: Record<string, File | null> = {};
      if (pendingLiveFallbackFile) {
        files["live_fallback_image"] = pendingLiveFallbackFile;
      }

      const res = (await updateAdminSettings(payload, files)) as {
        data: Record<string, Record<string, unknown>>;
      };

      if (res?.data?.live) {
        const newFallbackImage = (res.data.live.live_fallback_image as string) ?? "";
        setLiveFallbackImage(newFallbackImage);
        setPendingLiveFallbackFile(null);
      }

      if (overrideStatus !== undefined) {
        setLiveStreamActive(overrideStatus);
      }

      setStatus({ type: "success", message: "Configuration enregistrée avec succès !" });
    } catch (err) {
      const error = err as Error;
      console.error(error);
      setStatus({ type: "error", message: error.message || "Une erreur est survenue lors de l'enregistrement." });
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleVersionVisibility = async (version: string) => {
    const nextVisible = visibleVersions.includes(version)
      ? visibleVersions.filter((v) => v !== version)
      : [...visibleVersions, version];
    
    // Prevent unchecking the last version to ensure at least one is active
    if (nextVisible.length === 0) {
      return;
    }

    setVisibleVersions(nextVisible);

    let nextDefault = defaultVersion;
    if (!nextVisible.includes(defaultVersion)) {
      nextDefault = nextVisible[0];
      setDefaultVersionState(nextDefault);
    }

    // Trigger instant API suggestions update
    void performSearch(query, nextVisible, nextDefault);

    try {
      await updateAdminSettings([
        { key: "bible_visible_versions", value: nextVisible, group: "live" },
        { key: "bible_default_version", value: nextDefault, group: "live" }
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  const setDefaultVersion = async (version: string) => {
    setDefaultVersionState(version);

    let nextVisible = visibleVersions;
    if (visibleVersions.length > 0 && !visibleVersions.includes(version)) {
      nextVisible = [...visibleVersions, version];
      setVisibleVersions(nextVisible);
    }

    // Trigger instant API suggestions update
    void performSearch(query, nextVisible, version);

    try {
      await updateAdminSettings([
        { key: "bible_default_version", value: version, group: "live" },
        { key: "bible_visible_versions", value: nextVisible, group: "live" }
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTranslations = allTranslations.filter((t) =>
    t.toLowerCase().includes(translationSearch.toLowerCase())
  );
  const sortedTranslations = [...filteredTranslations].sort((a, b) => {
    const aChecked = visibleVersions.includes(a);
    const bChecked = visibleVersions.includes(b);
    if (aChecked && !bChecked) return -1;
    if (!aChecked && bChecked) return 1;
    return a.localeCompare(b);
  });


  // TODO(studio): habillage OBS — disposition non encore reliée à un vrai moteur.
  const [dualLayout, setDualLayout] = useState(true);
  const [recTime, setRecTime] = useState(0);
  const recLabel = `${String(Math.floor(recTime / 60)).padStart(2, "0")}:${String(recTime % 60).padStart(2, "0")}`;
  // The program-mode switch is wired to the REAL broadcast: switching to LIVE
  // starts the stream. Starting is EXCLUSIVELY the dock's "Démarrer le live"
  // (runs the real compositor+WHIP+Facebook sequence via `startLive`); the
  // header only offers an emergency stop, confirmed then routed through the
  // SAME real `stopLive()` — never `saveLiveSettings` directly (CHR-59: that
  // used to leave the compositor/WHIP running while the site flipped "offline").
  const requestStopLive = () => {
    if (liveStreamActive) setShowStopConfirm(true);
  };

  // ── Scene compositor: scenes → layer stacks driving preview + inspector ──
  // The bible layer is the REAL broadcast anchor — its verse is `preview`/`live`
  // and its style is `settings`/`onAirSettings`. Other layers are front-end
  // composites (text / image / song / camera / video / embed) overlaid by z-order.
  const [scenes, setScenes] = useState<StudioScene[]>(() => buildInitialScenes(initialSettings));
  const [currentSceneId, setCurrentSceneId] = useState(
    () => buildInitialScenes(initialSettings)[0]?.id ?? "scene-1",
  );
  const [programSceneId, setProgramSceneId] = useState(
    () => buildInitialScenes(initialSettings)[0]?.id ?? "scene-1",
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string>(
    () => buildInitialScenes(initialSettings)[0]?.layers[0]?.id ?? "bible",
  );
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteSceneId, setPendingDeleteSceneId] = useState<string | null>(null);
  const previewStageRef = useRef<HTMLDivElement>(null);
  const [programBlack, setProgramBlack] = useState<boolean>(
    () => Boolean(liveSettings.live_program_black),
  );

  const currentScene = scenes.find((s) => s.id === currentSceneId) ?? scenes[0];
  const layers = currentScene?.layers ?? [];

  // `setLayers` keeps the exact `(prev) => next` signature the handlers use, but
  // now edits the CURRENT scene's layers (scene id read from a ref so the
  // memoised callbacks below never target a stale scene).
  const currentSceneIdRef = useRef(currentSceneId);
  useEffect(() => {
    currentSceneIdRef.current = currentSceneId;
  }, [currentSceneId]);
  /* eslint-disable react-hooks/preserve-manual-memoization -- setLayers edits the
     current scene via a ref, so the compiler can't preserve these memoizations. */
  const setLayers = useCallback((updater: (ls: StudioLayer[]) => StudioLayer[]) => {
    setScenes((scs) =>
      scs.map((s) => (s.id === currentSceneIdRef.current ? { ...s, layers: updater(s.layers) } : s)),
    );
  }, []);

  // The Program monitor shows a SNAPSHOT taken at CUT — editing the preview
  // stack never touches what is on air until "ENVOYER ANTENNE".
  const [programLayers, setProgramLayers] = useState<StudioLayer[]>(() => [
    { id: "bible", type: "bible", name: "Verset biblique", visible: true, style: DEFAULT_STUDIO_SETTINGS },
  ]);
  const [programAnimNonce, setProgramAnimNonce] = useState(0);
  // The set of on-air layer ids that replay their entrance on the CURRENT nonce,
  // FROZEN at CUT time (computed in sendToProgram). Freezing it here — rather than
  // deriving it live from the settings — is what stops a settings toggle from
  // retroactively re-triggering an animation (only a CUT recomputes it).
  const [programReplay, setProgramReplay] = useState<ReadonlySet<string>>(new Set());
  // Per-source replay tokens for the PROGRAM DOM monitor (same rationale as
  // previewTokens: a token advances only when its source actually replays, so a
  // source leaving the set never causes a spurious remount). The broadcast CANVAS
  // keeps using programReplay (its "reset animStart if in set" has no such issue).
  const [programTokens, setProgramTokens] = useState<Record<string, number>>({});

  // Operator filter (CHR-56): replay entrance animations on every CUT to the
  // antenne, or only when a source first appears. Off = calmer air (a re-CUT of
  // the same scene doesn't re-trigger overlays); the bible still animates on a
  // new verse. Persisted per-browser (operator preference, like the dock layout;
  // lazy init from localStorage, mirroring ResizableRow — no setState-in-effect).
  const [replayOnCut, setReplayOnCut] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem("studio_replay_on_cut") !== "0";
    } catch {
      return true;
    }
  });
  const toggleReplayOnCut = useCallback(() => {
    setReplayOnCut((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("studio_replay_on_cut", next ? "1" : "0");
      } catch {
        /* storage disabled */
      }
      return next;
    });
  }, []);
  // Feed the latest inputs to the preview-replay freeze (read only when an
  // action fires bumpPreviewAnim, so toggling a setting never replays — like the
  // antenne). Assigned here, after the inputs' state exists.
  previewReplayInputs.current = { layers, sel: selectedLayerId, global: replayOnCut };

  // CHR-57 — the TRIGGER sources currently on air. ANY source can be a trigger,
  // each judged by its own "on air" condition: audio → diffused (audioLiveActive);
  // bible → a diffused verse (`live` + `bibleOnAir`); every other (visual) source
  // → simply visible in the program (and not blacked out). Memoised so the
  // broadcast effect only re-runs when the on-air set actually changes.
  const onAirTriggerIds = useMemo(() => {
    const s = new Set<string>();
    if (programBlack) return s;
    for (const l of programLayers) {
      if (l.type === "audio") {
        if (l.audioLiveActive) s.add(l.id);
        continue;
      }
      if (!l.visible) continue;
      if (l.type === "bible") {
        if (live && l.bibleOnAir !== false) s.add(l.id);
      } else {
        s.add(l.id);
      }
    }
    return s;
    // `live` presence (not identity) is what matters for the bible gate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programLayers, programBlack, !!live]);

  // Preview "Tester la réaction": the id of the layer whose reaction is being
  // simulated in the Preview; the preview then treats that layer's trigger as
  // active (no CUT required).
  const [testReactionId, setTestReactionId] = useState<string | null>(null);
  const previewTestTriggers = useMemo(() => {
    if (!testReactionId) return null;
    const l = layers.find((x) => x.id === testReactionId);
    return l?.reactTo ? new Set([l.reactTo]) : new Set<string>();
  }, [testReactionId, layers]);

  // Cameras whose getUserMedia stream must stay alive: the union of the on-air
  // (program) cameras and the current preview scene's cameras — program first so a
  // shared id keeps the antenne stream. Owned off-screen by <CameraKeepAlive> so an
  // on-air camera survives a Preview scene switch. Program cameras are kept even
  // while blacked (a temporary cut) so un-blacking doesn't re-`getUserMedia`.
  // (Recomputed each render — cheap; <CameraKeepAlive> keys children by id so
  // nothing remounts / re-acquires.)
  const keepAliveCameras = [...programLayers, ...layers].filter((l) => l.type === "camera");

  // Screen-capture (getDisplayMedia) streams owned off-screen by <ScreenKeepAlive>
  // — same union rationale as cameras. The owner never re-acquires (a display
  // stream needs a fresh user gesture); it only meters + watches the browser's
  // "Stop sharing" bar, which fires onEnded so we flip captureActive back off.
  const keepAliveScreens = [...programLayers, ...layers].filter((l) => l.type === "screen");

  // Headless program-out broadcaster (compositor → WHIP → SRS → Facebook). Fed
  // with the ON-AIR layers so it mirrors the antenne.
  const broadcast = useProgramBroadcast({
    layers: programBlack ? [] : programLayers,
    bibleVerse: programBlack ? null : live,
    bibleStyle: onAirSettings,
    animNonce: programAnimNonce,
    replaySet: programReplay,
    activeTriggers: onAirTriggerIds,
    composition,
    output,
  });
  // Real encoder/network readouts (CHR-59) — replaces the previously hardcoded
  // status-bar numbers with values sampled from the actual WHIP connection.
  const encoderStats = useEncoderStats(broadcast.getStats, broadcast.whipState === "connected", output.fps);
  // REC (CHR-59): drives a real MediaRecorder capture of the program feed
  // (`broadcast.startRecording`/`stopRecording`) — this timer is purely the
  // header/dock's visual "REC 00:00" readout, ticking only while it's genuinely
  // recording.
  useEffect(() => {
    if (!broadcast.recording) {
      setRecTime(0);
      return;
    }
    const id = setInterval(() => setRecTime((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [broadcast.recording]);
  const [recBusy, setRecBusy] = useState(false);
  const toggleRecording = async () => {
    setRecBusy(true);
    try {
      if (broadcast.recording) await broadcast.stopRecording();
      else await broadcast.startRecording();
    } finally {
      setRecBusy(false);
    }
  };
  const [liveBusy, setLiveBusy] = useState(false);
  // One gesture = go live on Facebook AND flip the public site live together.
  const startLive = async () => {
    setLiveBusy(true);
    try {
      // CHR-59 sandbox: rehearse the composited output locally ONLY — never
      // publish to Facebook (`broadcast.startBroadcast`/WHIP) nor flip the
      // public site's `live_status` (`saveLiveSettings(true, ...)`).
      if (sandbox) {
        broadcast.ensureCompositor();
        setStatus({ type: "success", message: "Test (sandbox) démarré — rien n'est diffusé au public." });
        return;
      }
      // The studio's own WHEP (WebRTC playback) feed becomes the site's live source
      // (overriding any stale embed link) so /live shows the broadcast directly.
      const whepUrl = await broadcast.startBroadcast();
      if (whepUrl) await saveLiveSettings(true, whepUrl);
    } finally {
      setLiveBusy(false);
    }
  };
  const stopLive = async () => {
    setLiveBusy(true);
    try {
      // A verse still on air must go down with the live — otherwise the bible
      // kept "broadcasting" (studio antenne + /live overlay) after the stop.
      // `masquer()` is itself sandbox-aware (no real API call while testing).
      if (live) await masquer();
      // Safe in sandbox too: neither Facebook nor a stream were ever started,
      // so this just tears the local-only compositor back down (unless a
      // recording is keeping it alive — `stopBroadcast` already guards that).
      await broadcast.stopBroadcast();
      if (!sandbox) await saveLiveSettings(false);
    } finally {
      setLiveBusy(false);
    }
  };

  // Persist the session view state so a refresh keeps the current scene + the
  // on-air snapshot (scene DEFINITIONS live in the backend; this is the view).
  // Values are captured ONCE at init so the persist effects below can't clobber
  // them before the restore runs.
  const savedSessionRef = useRef<{
    cs: string | null;
    ps: string | null;
    pl: StudioLayer[] | null;
    pv: ScriptureVerse | null;
  } | null>(null);
  if (savedSessionRef.current === null) {
    savedSessionRef.current = {
      cs: lsGet(SS_CURRENT_SCENE),
      ps: lsGet(SS_PROGRAM_SCENE),
      pl: lsGetJSON<StudioLayer[]>(SS_PROGRAM_LAYERS),
      pv: lsGetJSON<ScriptureVerse>(SS_PREVIEW_VERSE),
    };
  }
  useEffect(() => void lsSet(SS_CURRENT_SCENE, currentSceneId), [currentSceneId]);
  useEffect(() => void lsSet(SS_PROGRAM_SCENE, programSceneId), [programSceneId]);
  useEffect(() => void lsSetJSON(SS_PROGRAM_LAYERS, programLayers), [programLayers]);
  useEffect(() => void lsSetJSON(SS_PREVIEW_VERSE, preview), [preview]);
  useEffect(() => {
    const saved = savedSessionRef.current;
    const t = setTimeout(() => {
      if (saved?.cs) setCurrentSceneId(saved.cs);
      if (saved?.ps) setProgramSceneId(saved.ps);
      if (saved?.pl && saved.pl.length > 0) setProgramLayers(saved.pl);
      // The preview verse is pure view state — restore it so a browser refresh
      // doesn't wipe what the operator had cued up.
      if (saved?.pv && saved.pv.reference) setPreview(saved.pv);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) ?? null;
  // Any BIBLE layer (not only the anchor id "bible") is the broadcast anchor: its
  // style/position live in the orchestrator's global `settings`, so drag/resize/
  // filters must edit `settings`, not `layer.style` (which the render ignores).
  const selectedIsBible = selectedLayer?.type === "bible";
  const effectiveStyle = selectedIsBible ? settings : selectedLayer?.style ?? settings;
  const pendingDeleteLayer = layers.find((l) => l.id === pendingDeleteId) ?? null;

  const patchStyleField = useCallback(
    <K extends keyof StudioSettings>(key: K, value: StudioSettings[K]) => {
      if (selectedIsBible) {
        setStudioField(key, value);
      } else {
        setLayers((ls) =>
          ls.map((l) => (l.id === selectedLayerId ? { ...l, style: { ...l.style, [key]: value } } : l)),
        );
      }
    },
    [selectedLayerId, selectedIsBible, setStudioField, setLayers],
  );
  const setSelectedStyle = useCallback(
    (next: StudioSettings) => {
      if (selectedIsBible) {
        setSettings(next);
      } else {
        setLayers((ls) =>
          ls.map((l) => {
            if (l.id === selectedLayerId) {
              const preservedPosition = {
                positionMode: l.style.positionMode,
                predefinedPosition: l.style.predefinedPosition,
                customX: l.style.customX,
                customY: l.style.customY,
                customWidth: l.style.customWidth,
                customHeight: l.style.customHeight,
              };
              return {
                ...l,
                style: {
                  ...next,
                  ...preservedPosition,
                },
              };
            }
            return l;
          }),
        );
      }
      bumpPreviewAnim();
    },
    [selectedLayerId, selectedIsBible, setSettings, setLayers, bumpPreviewAnim],
  );
  const patchSelectedData = useCallback(
    (patch: Partial<StudioLayer>) => {
      setLayers((ls) => ls.map((l) => (l.id === selectedLayerId ? { ...l, ...patch } : l)));
      
      const targetLayer = layers.find((l) => l.id === selectedLayerId);
      if (targetLayer && targetLayer.type === "song") {
        const isCurrentlyLive = targetLayer.songLiveActive;
        const willBeLive = patch.songLiveActive !== undefined ? patch.songLiveActive : isCurrentlyLive;
        
        if (willBeLive) {
          setProgramBlack(false);
          setProgramLayers((pls) => {
            const hasSong = pls.some((l) => l.id === selectedLayerId);
            const targetStanzaIndex = patch.activeStanzaIndex !== undefined ? patch.activeStanzaIndex : targetLayer.activeStanzaIndex;
            
            if (hasSong) {
              return pls.map((l) =>
                l.id === selectedLayerId
                  ? { ...l, ...patch, activeStanzaIndex: targetStanzaIndex }
                  : l
              );
            } else {
              return [...pls, { ...targetLayer, ...patch, activeStanzaIndex: targetStanzaIndex }];
            }
          });
          
          const targetStanzaIndex = patch.activeStanzaIndex !== undefined ? patch.activeStanzaIndex : targetLayer.activeStanzaIndex;
          const stanzaChanged = patch.activeStanzaIndex !== undefined && targetLayer.activeStanzaIndex !== patch.activeStanzaIndex;
          const liveActivated = patch.songLiveActive === true && !isCurrentlyLive;
          if (stanzaChanged || liveActivated) {
            setProgramAnimNonce((n) => n + 1);
          }
          return;
        }
      }

      if (targetLayer && targetLayer.type === "group") {
        const isCurrentlyLive = targetLayer.groupLiveActive;
        const willBeLive = patch.groupLiveActive !== undefined ? patch.groupLiveActive : isCurrentlyLive;

        if (willBeLive) {
          setProgramBlack(false);
          // Flat model: the group + its `parentId` children are all real scene
          // layers. Sending the group to air upserts the group and every child
          // into the program so the container AND its content diffuse.
          const groupChildren = layers.filter((l) => l.parentId === selectedLayerId);
          const mergedGroup = { ...targetLayer, ...patch };
          setProgramLayers((pls) => {
            const next = [...pls];
            const upsert = (nl: StudioLayer) => {
              const i = next.findIndex((l) => l.id === nl.id);
              if (i >= 0) next[i] = { ...next[i], ...nl };
              else next.push(nl);
            };
            upsert(mergedGroup);
            groupChildren.forEach(upsert);
            return next;
          });

          const liveActivated = patch.groupLiveActive === true && !isCurrentlyLive;
          if (liveActivated) {
            setProgramAnimNonce((n) => n + 1);
          }
          return;
        }
      }

      if (programSceneId === currentSceneIdRef.current && !programBlack) {
        setProgramLayers((pls) =>
          pls.map((l) => {
            if (l.id === selectedLayerId) {
              if (l.type === "song" && !l.songLiveActive) {
                const { activeStanzaIndex, ...rest } = patch;
                return { ...l, ...rest };
              }
              if (patch.activeStanzaIndex !== undefined && l.activeStanzaIndex !== patch.activeStanzaIndex) {
                setProgramAnimNonce((n) => n + 1);
              }
              return { ...l, ...patch };
            }
            return l;
          })
        );
      }
    },
    [layers, selectedLayerId, programSceneId, programBlack, setLayers],
  );
  const restoreLayerDefaults = useCallback(() => {
    if (!selectedLayerId || !selectedLayer) return;
    if (selectedLayer.type === "bible") {
      // The bible's style is the orchestrator's global `settings` (broadcast
      // anchor), not layer.style — reset THAT. The debounced autosave persists it.
      setSettings({ ...DEFAULT_STUDIO_SETTINGS });
      bumpPreviewAnim();
      setStatus({ type: "success", message: "Paramètres de la bible réinitialisés !" });
      return;
    }
    if (selectedLayer.type === "image") {
      setLayers((ls) =>
        ls.map((l) =>
          l.id === selectedLayerId
            ? {
                ...l,
                style: {
                  ...DEFAULT_STUDIO_SETTINGS,
                  animation: "none",
                  containerShape: "transparent",
                  positionMode: "custom",
                  customX: 28,
                  customY: 18,
                  customWidth: 44,
                  customHeight: 55,
                },
                imageUrl: l.imageUrl ?? "",
                fill: "frame",
                imageHue: 265,
              }
            : l,
        ),
      );
      bumpPreviewAnim();
      setStatus({ type: "success", message: "Paramètres de l'image réinitialisés !" });
    } else if (selectedLayer.type === "text") {
      setLayers((ls) =>
        ls.map((l) =>
          l.id === selectedLayerId
            ? {
                ...l,
                style: {
                  ...DEFAULT_STUDIO_SETTINGS,
                  animation: "none",
                  fontBodyFamily: "Plus Jakarta Sans",
                  fontBodyWeight: "700",
                },
                content: l.content ?? "",
                sub: l.sub ?? "",
              }
            : l,
        ),
      );
      bumpPreviewAnim();
      setStatus({ type: "success", message: "Paramètres du texte réinitialisés !" });
    } else if (selectedLayer.type === "song") {
      setLayers((ls) =>
        ls.map((l) =>
          l.id === selectedLayerId
            ? {
                ...l,
                style: {
                  ...DEFAULT_STUDIO_SETTINGS,
                  animation: "none",
                  fontBodyFamily: "Plus Jakarta Sans",
                  fontBodyWeight: "700",
                },
                content: l.content ?? "",
                stanzas: l.stanzas ?? [],
                activeStanzaIndex: l.activeStanzaIndex ?? 0,
                songLiveActive: l.songLiveActive ?? false,
              }
            : l,
        ),
      );
      bumpPreviewAnim();
      setStatus({ type: "success", message: "Paramètres du chant réinitialisés !" });
    } else if (selectedLayer.type === "group") {
      setLayers((ls) =>
        ls.map((l) =>
          l.id === selectedLayerId
            ? {
                ...l,
                style: {
                  ...DEFAULT_STUDIO_SETTINGS,
                  animation: "none",
                },
                layers: l.layers ?? [],
                groupLiveActive: l.groupLiveActive ?? false,
              }
            : l,
        ),
      );
      bumpPreviewAnim();
      setStatus({ type: "success", message: "Paramètres du groupe réinitialisés !" });
    } else if (selectedLayer.type === "audio") {
      setLayers((ls) =>
        ls.map((l) =>
          l.id === selectedLayerId
            ? {
                ...l,
                audioLevel: 80,
                audioMuted: false,
                audioGain: 0,
                audioBalance: 0,
                audioLoop: false,
                audioSpeed: 1.0,
                audioPlaying: false,
              }
            : l,
        ),
      );
      setStatus({ type: "success", message: "Paramètres audio réinitialisés !" });
    }
  }, [selectedLayerId, selectedLayer, setLayers, setSettings, bumpPreviewAnim]);
  const onImageUrl = useCallback(
    async (rawUrl: string) => {
      if (!selectedLayerId) return;
      const url = rawUrl.trim();
      if (!url) {
        patchSelectedData({ imageUrl: "" });
        return;
      }
      // Already hosted by us → use directly; external → download server-side so
      // it's CORS-drawable on the canvas (never display straight from the URL).
      if (url.includes("/studio/media/") || url.startsWith("/storage")) {
        patchSelectedData({ imageUrl: url });
        return;
      }
      setBusy(true);
      setStatus(null);
      try {
        const { url: hosted } = await importStudioMediaFromUrl(url);
        patchSelectedData({ imageUrl: hosted });
        setStatus({ type: "success", message: "Image importée depuis l'URL." });
      } catch (err) {
        console.error("Failed to import image from url", err);
        setStatus({ type: "error", message: "Impossible d'importer l'image depuis cette URL." });
      } finally {
        setBusy(false);
      }
    },
    [selectedLayerId, patchSelectedData]
  );

  // ── Audio mixer ─────────────────────────────────────────────────────────
  // Channels are the current scene's audio-bearing sources; the mixer writes
  // volume/mute/gain/pan straight back onto the layer so it persists.
  const mixerLayers = layers.filter(hasAudio);
  const setLayerAudio = useCallback(
    (id: string, patch: Partial<StudioLayer>) => {
      setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
      // Reflect the mixer live on the program snapshot so fader/mute/mode changes
      // reach the Facebook feed in real time (not only at the next CUT).
      if (programSceneId === currentSceneIdRef.current && !programBlack) {
        setProgramLayers((pls) => pls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
      }
    },
    [setLayers, programSceneId, programBlack],
  );
  /* eslint-enable react-hooks/preserve-manual-memoization */

  const addLayer = (type: StudioLayerType, parentId?: string) => {
    // The bible is the broadcast anchor — one per scene.
    if (type === "bible" && layers.some((l) => l.type === "bible")) return;
    const count = layers.filter((l) => l.type === type).length;
    const nl = createLayer(type, count);
    if (parentId) {
      nl.parentId = parentId;
      const parent = layers.find((l) => l.id === parentId);
      if (parent) {
        nl.style = { ...parent.style };
      }
    }
    setLayers((ls) => [nl, ...ls]);
    setSelectedLayerId(nl.id);
  };
  const moveLayer = (id: string, dir: -1 | 1) =>
    setLayers((ls) => {
      const i = ls.findIndex((l) => l.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ls.length) return ls;
      const next = [...ls];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const toggleLayerVisible = (id: string) =>
    setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  const patchLayerById = (id: string, patch: Partial<StudioLayer>) =>
    setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const reorderLayer = (dragId: string, targetId: string) =>
    setLayers((ls) => {
      if (dragId === targetId) return ls;
      const from = ls.findIndex((l) => l.id === dragId);
      const to = ls.findIndex((l) => l.id === targetId);
      if (from < 0 || to < 0) return ls;
      const next = [...ls];
      const [moved] = next.splice(from, 1);

      const target = next.find((l) => l.id === targetId);
      if (target) {
        if (target.type === "group") {
          moved.parentId = target.id;
          const parent = next.find((l) => l.id === target.id);
          if (parent) {
            moved.style = { ...parent.style };
          }
        } else if (target.parentId) {
          moved.parentId = target.parentId;
          const parent = next.find((l) => l.id === target.parentId);
          if (parent) {
            moved.style = { ...parent.style };
          }
        } else {
          moved.parentId = undefined;
        }
      }

      next.splice(to, 0, moved);
      return next;
    });
  const confirmDeleteLayer = () => {
    if (!pendingDeleteId) return;
    const removed = layers.find((l) => l.id === pendingDeleteId);
    // Drop the layer AND any reaction link pointing at it (CHR-57) so a dangling
    // reactTo can't reference a gone trigger.
    const dropReactLink = (l: StudioLayer): StudioLayer =>
      l.reactTo === pendingDeleteId ? { ...l, reactTo: undefined } : l;
    setLayers((ls) => ls.filter((l) => l.id !== pendingDeleteId).map(dropReactLink));
    // Also pull it OFF AIR: a source that was cut to the antenne must leave the
    // program snapshot too, otherwise it keeps being diffused after deletion.
    setProgramLayers((pls) => pls.filter((l) => l.id !== pendingDeleteId).map(dropReactLink));
    if (testReactionId === pendingDeleteId) setTestReactionId(null);
    setProgramReplay((set) => {
      if (!set.has(pendingDeleteId)) return set;
      const next = new Set(set);
      next.delete(pendingDeleteId);
      return next;
    });
    // Deleting the on-air bible must also take down its live scripture overlay.
    if (removed?.type === "bible" && live) void masquer();
    if (selectedLayerId === pendingDeleteId) {
      setSelectedLayerId(layers.find((l) => l.id !== pendingDeleteId)?.id ?? "");
    }
    setPendingDeleteId(null);
  };

  // ── Scenes ──────────────────────────────────────────────────────────────
  const pendingDeleteScene = scenes.find((s) => s.id === pendingDeleteSceneId) ?? null;

  const selectScene = (id: string) => {
    setCurrentSceneId(id);
    setSelectedLayerId(scenes.find((s) => s.id === id)?.layers[0]?.id ?? "");
  };
  const addScene = () => {
    const id = `scene-${Date.now()}`;
    setScenes((scs) => [...scs, { id, name: `Scène ${scs.length + 1}`, layers: [] }]);
    setCurrentSceneId(id);
    setSelectedLayerId("");
  };
  const renameScene = (id: string, name: string) =>
    setScenes((scs) => scs.map((s) => (s.id === id ? { ...s, name } : s)));
  const reorderScene = (dragId: string, targetId: string) =>
    setScenes((scs) => {
      if (dragId === targetId) return scs;
      const from = scs.findIndex((s) => s.id === dragId);
      const to = scs.findIndex((s) => s.id === targetId);
      if (from < 0 || to < 0) return scs;
      const next = [...scs];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  const confirmDeleteScene = () => {
    if (!pendingDeleteSceneId || scenes.length <= 1) {
      setPendingDeleteSceneId(null);
      return;
    }
    if (currentSceneId === pendingDeleteSceneId) {
      const fallback = scenes.find((s) => s.id !== pendingDeleteSceneId);
      if (fallback) {
        setCurrentSceneId(fallback.id);
        setSelectedLayerId(fallback.layers[0]?.id ?? "");
      }
    }
    setScenes((scs) => scs.filter((s) => s.id !== pendingDeleteSceneId));
    setPendingDeleteSceneId(null);
  };

  // Debounced persistence of the scene list to the backend (skips the initial
  // hydrated value so we don't re-write it on mount).
  const lastScenesRef = useRef<string>("");
  useEffect(() => {
    const serialized = JSON.stringify(scenes);
    if (lastScenesRef.current === "") {
      lastScenesRef.current = serialized;
      return;
    }
    if (serialized === lastScenesRef.current) return;
    lastScenesRef.current = serialized;
    const timer = setTimeout(() => {
      void updateAdminSettings([
        { key: "live_scenes", value: sanitizeScenes(scenes), group: "live_broadcast_styles" },
      ]);
    }, 700);
    return () => clearTimeout(timer);
  }, [scenes]);

  // Persist the "écran vide" state (skip the initial hydrated value).
  const lastBlackRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (lastBlackRef.current === null) {
      lastBlackRef.current = programBlack;
      return;
    }
    if (lastBlackRef.current === programBlack) return;
    lastBlackRef.current = programBlack;
    void updateAdminSettings([{ key: "live_program_black", value: programBlack, group: "live" }]);
  }, [programBlack]);

  // Move-only drag of a layer directly in the Preview (resize stays in the
  // inspector / fullscreen editor).
  const handleLayerDrag = (e: React.PointerEvent, layerId: string) => {
    e.preventDefault();
    const stage = previewStageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const lr = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x0 = ((lr.left - rect.left) / rect.width) * 100;
    const y0 = ((lr.top - rect.top) / rect.height) * 100;

    // Use current layer settings if they exist to prevent layout shift during move
    const targetLayer = scenes.find((s) => s.id === currentSceneIdRef.current)?.layers.find((l) => l.id === layerId);
    const isBible = targetLayer?.type === "bible";
    const layerStyle = isBible ? settings : targetLayer?.style;
    const originalWidth = layerStyle?.customWidth ?? Math.round((lr.width / rect.width) * 100);
    const originalHeight = layerStyle?.customHeight ?? Math.round((lr.height / rect.height) * 100);
    const w0 = Math.max(10, originalWidth);
    const h0 = Math.max(5, originalHeight);

    const childOriginalPositions: Record<string, { x: number; y: number }> = {};
    const childLayers = (scenes.find((s) => s.id === currentSceneIdRef.current)?.layers ?? []).filter((l) => l.parentId === layerId);
    childLayers.forEach((c) => {
      childOriginalPositions[c.id] = {
        x: c.style.customX ?? 0,
        y: c.style.customY ?? 0,
      };
    });

    const sx = e.clientX;
    const sy = e.clientY;
    setSelectedLayerId(layerId);
    const move = (ev: PointerEvent) => {
      const dx = ((ev.clientX - sx) / rect.width) * 100;
      const dy = ((ev.clientY - sy) / rect.height) * 100;
      // OBS-like: layers may overflow the frame (clipped by the stage/canvas).
      // Keep ≥2% inside so an off-screen layer can always be grabbed back.
      let nx = Math.max(-(w0 - 2), Math.min(98, Math.round(x0 + dx)));
      let ny = Math.max(-(h0 - 2), Math.min(98, Math.round(y0 + dy)));
      // Edge magnetism: within 2% of a frame edge, snap flush (a 98%-wide layer
      // dropped "almost" at the edge left a visible gap on the broadcast).
      if (Math.abs(nx) <= 2) nx = 0;
      if (Math.abs(nx + w0 - 100) <= 2) nx = 100 - w0;
      if (Math.abs(ny) <= 2) ny = 0;
      if (Math.abs(ny + h0 - 100) <= 2) ny = 100 - h0;
      if (isBible) {
        setStudioField("positionMode", "custom");
        setStudioField("customX", nx);
        setStudioField("customY", ny);
        setStudioField("customWidth", w0);
        setStudioField("customHeight", h0);
      } else {
        const originalX = layerStyle?.customX ?? 0;
        const originalY = layerStyle?.customY ?? 0;
        const deltaX = nx - originalX;
        const deltaY = ny - originalY;

        setLayers((ls) =>
          ls.map((l) => {
            if (l.id === layerId) {
              return { ...l, style: { ...l.style, positionMode: "custom", customX: nx, customY: ny, customWidth: w0, customHeight: h0 } };
            }
            if (l.parentId === layerId) {
              const orig = childOriginalPositions[l.id];
              if (orig) {
                // Children follow the parent's raw delta unclamped so their
                // offset inside the group never drifts at the frame edges.
                const cx = Math.round(orig.x + deltaX);
                const cy = Math.round(orig.y + deltaY);
                return { ...l, style: { ...l.style, customX: cx, customY: cy } };
              }
            }
            return l;
          }),
        );
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Corner-handle resize of a layer directly in the Preview.
  const handleLayerResize = (
    e: React.PointerEvent,
    layerId: string,
    corner: "nw" | "ne" | "sw" | "se",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const stage = previewStageRef.current;
    const box = (e.currentTarget as HTMLElement).closest("[data-layer]")?.getBoundingClientRect();
    if (!stage || !box) return;
    const rect = stage.getBoundingClientRect();
    const startLeft = ((box.left - rect.left) / rect.width) * 100;
    const startTop = ((box.top - rect.top) / rect.height) * 100;
    const startW = (box.width / rect.width) * 100;
    const startH = (box.height / rect.height) * 100;
    const sx = e.clientX;
    const sy = e.clientY;
    const isBible =
      scenes.find((s) => s.id === currentSceneIdRef.current)?.layers.find((l) => l.id === layerId)?.type === "bible";
    setSelectedLayerId(layerId);
    const apply = (x: number, y: number, w: number, h: number) => {
      // Edge magnetism (matches the drag): a border released within 2% of the
      // frame edge snaps flush so "full width/height" is one gesture.
      const right = x + w;
      const bottom = y + h;
      if (Math.abs(x) <= 2) {
        w = right;
        x = 0;
      }
      if (Math.abs(100 - right) <= 2) w = 100 - x;
      if (Math.abs(y) <= 2) {
        h = bottom;
        y = 0;
      }
      if (Math.abs(100 - bottom) <= 2) h = 100 - y;
      const p = { customX: Math.round(x), customY: Math.round(y), customWidth: Math.round(w), customHeight: Math.round(h) };
      if (isBible) {
        setStudioField("positionMode", "custom");
        setStudioField("customX", p.customX);
        setStudioField("customY", p.customY);
        setStudioField("customWidth", p.customWidth);
        setStudioField("customHeight", p.customHeight);
      } else {
        setLayers((ls) =>
          ls.map((l) => (l.id === layerId ? { ...l, style: { ...l.style, positionMode: "custom", ...p } } : l)),
        );
      }
    };
    const move = (ev: PointerEvent) => {
      const dx = ((ev.clientX - sx) / rect.width) * 100;
      const dy = ((ev.clientY - sy) / rect.height) * 100;
      let x = startLeft;
      let y = startTop;
      let w = startW;
      let h = startH;
      // OBS-like: resizing may push the box past the frame edges (clipped by the
      // stage/canvas); only a minimum size is enforced.
      if (corner === "se") {
        w = Math.max(10, startW + dx);
        h = Math.max(6, startH + dy);
      } else if (corner === "sw") {
        w = Math.max(10, startW - dx);
        x = startLeft + Math.min(dx, startW - 10);
        h = Math.max(6, startH + dy);
      } else if (corner === "ne") {
        w = Math.max(10, startW + dx);
        h = Math.max(6, startH - dy);
        y = startTop + Math.min(dy, startH - 6);
      } else {
        w = Math.max(10, startW - dx);
        x = startLeft + Math.min(dx, startW - 10);
        h = Math.max(6, startH - dy);
        y = startTop + Math.min(dy, startH - 6);
      }
      apply(x, y, w, h);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // CUT: freeze the current preview composite onto the Program monitor and push
  // the bible verse on air.
  // CUT — send the WHOLE current scene to the Program monitor, whatever its
  // sources are. If the on-air scene shows a bible verse, broadcast it for real;
  // otherwise clear any scripture that was still live so the antenne matches.
  const sendToProgram = () => {
    if (layers.every((l) => !l.visible)) return;
    setProgramBlack(false);
    // A bible gated off-air (bibleOnAir=false) stays in the PREVIEW but goes to
    // the program hidden — the operator keeps preparing without broadcasting it.
    setProgramLayers(
      layers.map((l) => ({
        ...l,
        style: { ...l.style },
        visible: l.type === "bible" && l.bibleOnAir === false ? false : l.visible,
      })),
    );
    setProgramSceneId(currentSceneId);
    // Freeze which sources replay on THIS cut (per-source override, else the
    // global default) so a later settings toggle can't retroactively re-trigger.
    // The Set feeds the broadcast canvas; the per-source tokens feed the DOM.
    const replaying = layers.filter((l) => replaysOnCut(l, replayOnCut)).map((l) => l.id);
    setProgramReplay(new Set(replaying));
    setProgramTokens((prev) => {
      const next = { ...prev };
      for (const id of replaying) next[id] = (next[id] ?? 0) + 1;
      return next;
    });
    setProgramAnimNonce((n) => n + 1);
    const bibleOnAir =
      layers.some((l) => l.type === "bible" && l.visible && l.bibleOnAir !== false) && !!preview;
    if (bibleOnAir) {
      diffuse();
    } else {
      if (live) {
        // CHR-59 sandbox: never hit the real endpoint (see `pushLive`/`masquer`).
        if (!sandbox) void broadcastScripture({ action: "hide" });
        setLive(null);
      }
      setStatus({ type: "success", message: `Scène « ${currentScene?.name ?? ""} » envoyée à l'antenne.` });
    }
  };

  // Écran vide — black out the WHOLE Program monitor (any source), and hide the
  // real scripture overlay if one was live.
  const blackScreen = () => {
    const goingBlack = !programBlack;
    setProgramBlack(goingBlack);
    if (goingBlack && live) void masquer();
    if (!goingBlack) {
      setProgramAnimNonce((n) => n + 1);
    }
  };

  const bibleInspectorProps = {
    query,
    onQueryChange: setQuery,
    suggestions,
    searching,
    prepared,
    onLoadVerse: loadVerse,
    onPrepare: addToPrepared,
    onRemovePrepared: (v: ScriptureVerse) =>
      void persistPrepared(
        prepared.filter(
          (p) => !(p.reference === v.reference && (p.translation || "") === (v.translation || "")),
        ),
      ),
    visibleVersions,
    defaultVersion,
    onToggleVersion: toggleVersionVisibility,
    onSetDefaultVersion: setDefaultVersion,
    translationSearch,
    onTranslationSearchChange: setTranslationSearch,
    visibleTranslations: sortedTranslations,
    hasMoreTranslations: false,
    onShowMoreTranslations: () => {},
    // ANTENNE-only gate: the preview keeps showing the bible so the operator can
    // keep preparing; only the diffusion side is pulled.
    onAir: selectedIsBible ? selectedLayer?.bibleOnAir !== false : true,
    onToggleOnAir: () => {
      if (!selectedIsBible || !selectedLayer) return;
      const disabling = selectedLayer.bibleOnAir !== false;
      setLayers((ls) =>
        ls.map((l) => (l.id === selectedLayer.id ? { ...l, bibleOnAir: !disabling } : l)),
      );
      if (disabling) {
        // Pull a verse currently on air + hide the program-monitor copy.
        if (live) void masquer();
        if (programSceneId === currentSceneIdRef.current && !programBlack) {
          setProgramLayers((pls) =>
            pls.map((l) => (l.type === "bible" ? { ...l, visible: false } : l)),
          );
        }
      } else {
        // Re-enabling puts the bible STRAIGHT BACK on air (no CUT needed): show
        // the program-monitor copy again and re-broadcast the cued verse.
        setProgramLayers((pls) =>
          pls.map((l) => (l.type === "bible" ? { ...l, visible: true } : l)),
        );
        if (preview) void pushLive(preview, settings);
      }
    },
  };

  // CHR-59 — single-screen console (no page scroll). The shared admin layout's
  // topbar (`#admin-topbar`) sits ABOVE this component in normal flow, so the
  // console must fill exactly the REMAINING viewport height, not its own
  // `100vh` (which would always overflow by the topbar's height). Measured via
  // ResizeObserver (same guarded-threshold idiom as stage-monitor.tsx /
  // live-video-overlay.tsx) rather than hardcoded, since the topbar's real
  // height can vary with content/breakpoint. `useLayoutEffect` (not
  // `useEffect`) so the very first paint already uses the right height.
  const [topbarHeight, setTopbarHeight] = useState(0);
  useLayoutEffect(() => {
    const el = document.getElementById("admin-topbar");
    if (!el) return;
    const measure = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      setTopbarHeight((prev) => (Math.abs(prev - h) < 1 ? prev : h));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className="-mx-6 -my-8 flex flex-col gap-3 overflow-hidden bg-studio-bg p-3 text-white md:-mx-10 md:-my-10 md:p-4"
      style={{ height: `calc(100dvh - ${topbarHeight}px)` }}
    >
      {layers
        .filter((l) => l.type === "audio" && l.audioFileUrl)
        .map((l) => (
          <AudioElementPlayer
            key={l.id}
            layer={l}
            onEnded={() => {
              setLayers((ls) => ls.map((item) => (item.id === l.id ? { ...item, audioPlaying: false } : item)));
            }}
          />
        ))}
      <StudioHeader
        onAir={liveStreamActive}
        onRequestStop={requestStopLive}
        busy={broadcast.busy || liveBusy}
        sandbox={sandbox}
        recording={broadcast.recording}
        recLabel={recLabel}
        onOpenSettings={() => setShowGeneralConfig(true)}
      />
      {/* Off-screen owner of on-air + preview camera streams — survives scene
          switches so a camera stays on the antenne when the Preview changes. */}
      <CameraKeepAlive layers={keepAliveCameras} />
      {/* Same, for screen-capture streams — plus flips captureActive off when the
          operator ends the share via the browser's native "Stop sharing" bar. */}
      <ScreenKeepAlive
        layers={keepAliveScreens}
        onEnded={(id) => patchLayerById(id, { captureActive: false })}
      />
      {mounted &&
        status &&
        createPortal(
          <div className="pointer-events-none fixed top-6 right-6 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
            <div
              className={cn(
                "pointer-events-auto flex items-center gap-3 rounded-xl border px-5 py-3 text-sm font-bold shadow-2xl backdrop-blur-md",
                status.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.15)]"
                  : "border-red-500/30 bg-red-500/20 text-[#ff9a9a] shadow-[0_0_30px_rgba(239,68,68,0.15)]",
              )}
            >
              {status.type === "success" ? <CheckCircle className="size-5" /> : <AlertCircle className="size-5" />}
              {status.message}
            </div>
          </div>,
          document.body,
        )}
      <section
        className={cn(
          "grid h-[clamp(280px,36vh,400px)] flex-none gap-3",
          dualLayout ? "grid-cols-[1fr_124px_1fr]" : "grid-cols-1",
        )}
      >
        {dualLayout && (
          <>
            <div
              ref={modalContainerRef}
              className={cn(
                showFullscreenPreview
                  ? "fixed inset-0 z-[160] flex flex-col gap-3 bg-[#05020c] p-4"
                  : "contents",
              )}
            >
              {showFullscreenPreview && (
                <div className="flex flex-none items-center justify-between">
                  <div>
                    <h3 className="font-sans text-lg font-bold text-white">Aperçu · Plein écran</h3>
                    <p className="text-xs text-white/50">
                      Glissez / redimensionnez les sources comme dans le moniteur — même échelle,
                      même rendu qu&apos;à l&apos;antenne. Échap pour fermer.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={toggleNativeFullscreen}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/15"
                    >
                      <Maximize className="size-3.5" />
                      {isNativeFullscreen ? "Quitter le plein écran réel" : "Plein écran réel"}
                    </button>
                    <button
                      type="button"
                      onClick={closeFullscreenPreview}
                      className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              )}
              <StageMonitor
              className={showFullscreenPreview ? "min-h-0 flex-1" : undefined}
              tone="preview"
              layers={layers}
              bibleVerse={preview}
              bibleStyle={settings}
              sceneName={currentScene?.name ?? "Aperçu"}
              selectedLayerId={selectedLayerId}
              stageRef={previewStageRef}
              draggable
              onLayerPointerDown={handleLayerDrag}
              onLayerResize={handleLayerResize}
              onLayerSelect={setSelectedLayerId}
              onFullscreen={() => setShowFullscreenPreview(true)}
              animNonce={animNonce}
              tokens={previewTokens}
              activeTriggers={previewTestTriggers}
              compositionWidth={composition.width}
              compositionHeight={composition.height}
            />
            </div>
            <TransitionBar
              onCut={sendToProgram}
              onBlack={blackScreen}
              onPrevVerse={() => void advance("prev_verse")}
              onNextVerse={() => void advance("next_verse")}
              onPrevChapter={() => void advance("prev_chapter")}
              onNextChapter={() => void advance("next_chapter")}
              busy={busy}
              canCut={layers.some((l) => l.visible)}
              black={programBlack}
              showVerseNav={layers.some((l) => l.type === "bible" && l.visible)}
              canNavigate={!!(preview || live)}
              canPrevVerse={navAvail.prevVerse}
              canNextVerse={navAvail.nextVerse}
              canPrevChapter={navAvail.prevChapter}
              canNextChapter={navAvail.nextChapter}
            />
          </>
        )}
        <StageMonitor
          tone="program"
          layers={programLayers}
          bibleVerse={live}
          bibleStyle={onAirSettings}
          sceneName={scenes.find((s) => s.id === programSceneId)?.name ?? "Antenne"}
          black={programBlack}
          animNonce={programAnimNonce}
          tokens={programTokens}
          activeTriggers={onAirTriggerIds}
          compositionWidth={composition.width}
          compositionHeight={composition.height}
        />
      </section>

      {/* Docks row — each panel is width-resizable via the grab handles between
          neighbours (weights persisted); stacked below lg. `flex-1 min-h-0` so
          it fills exactly whatever height remains (CHR-59 single-screen) —
          ResizableRow itself grows to `lg:h-full` inside this. */}
      <section className="min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
        <ResizableRow
          className="flex min-h-0 flex-1 flex-col lg:h-full"
          storageKey="studio_docks_v2"
          resetNonce={dockResetNonce}
          items={[
            { id: "scenes", label: "Scènes", node: <ScenesDock
          scenes={scenes}
          currentSceneId={currentSceneId}
          programSceneId={programSceneId}
          onSelect={selectScene}
          onAdd={addScene}
          onReorder={reorderScene}
          onRequestDelete={setPendingDeleteSceneId}
          onRename={renameScene}
        /> },
            { id: "sources", label: "Sources", node: <SourcesDock
          layers={layers}
          selectedLayerId={selectedLayerId}
          onSelect={setSelectedLayerId}
          onAdd={addLayer}
          onToggle={toggleLayerVisible}
          onMove={moveLayer}
          onReorder={reorderLayer}
          onRequestDelete={setPendingDeleteId}
        /> },
            { id: "mixer", label: "Mixage", node: <MixerDock channels={mixerLayers} onChange={setLayerAudio} /> },
            { id: "inspector", label: "Style Pro", node: <InspectorDock
          selectedLayer={selectedLayer}
          effectiveStyle={effectiveStyle}
          patchStyleField={patchStyleField}
          setSelectedStyle={setSelectedStyle}
          onRename={(name) => patchSelectedData({ name })}
          patchLayerData={patchSelectedData}
          onImageUrl={onImageUrl}
          onRestoreDefaults={restoreLayerDefaults}
          onPlayAnim={playAnim}
          replayOnCutGlobal={replayOnCut}
          reactionTestActive={!!selectedLayerId && testReactionId === selectedLayerId}
          onToggleReactionTest={() =>
            setTestReactionId((id) => (id === selectedLayerId ? null : selectedLayerId))
          }
          bible={bibleInspectorProps}
          presets={presets}
          newPresetName={newPresetName}
          onNewPresetNameChange={setNewPresetName}
          onSavePreset={handleSavePreset}
          onDeletePreset={handleDeletePreset}
          allLayers={layers}
          onAddChild={addLayer}
          onSelectLayer={setSelectedLayerId}
          onToggleLayer={toggleLayerVisible}
          onRemoveLayer={setPendingDeleteId}
          onPatchLayer={patchLayerById}
        /> },
            { id: "controls", label: "Commandes", node: <ControlsDock
          // Sandbox never sets `broadcast.broadcasting` (WHIP is never
          // started) — its "active" signal is the LOCAL compositor instead,
          // so the button still reflects/toggles the rehearsal correctly.
          liveActive={sandbox ? broadcast.on : broadcast.broadcasting}
          liveBusy={broadcast.busy || liveBusy}
          liveState={broadcast.whipState}
          liveError={broadcast.error}
          onStartLive={() => void startLive()}
          onStopLive={() => void stopLive()}
          sandboxRehearsal={sandbox}
          recording={broadcast.recording}
          recBusy={recBusy}
          onToggleRecord={() => void toggleRecording()}
          recLabel={recLabel}
          sandbox={sandbox}
          // A real broadcast owns the compositor now — toggling sandbox would
          // create an ambiguous "sandbox + real direct" state, so it's locked
          // while actually live (stop the direct first).
          sandboxLocked={broadcast.broadcasting}
          onToggleSandbox={() => setSandbox((s) => !s)}
          dualLayout={dualLayout}
          onToggleLayout={() => setDualLayout((d) => !d)}
          onResetDockWidths={() => setDockResetNonce((n) => n + 1)}
          replayOnCut={replayOnCut}
          onToggleReplayOnCut={toggleReplayOnCut}
        /> },
          ]}
        />
      </section>

      <StatusBar statusRight={status?.message ?? "Prêt"} stats={encoderStats} />

      <SettingsModal
        open={showGeneralConfig}
        onClose={() => setShowGeneralConfig(false)}
        activeTab={activeSettingsTab}
        onTabChange={setActiveSettingsTab}
        saving={savingSettings}
        onSave={() => void saveLiveSettings()}
        title={liveTitle}
        onTitle={setLiveTitle}
        description={liveDescription}
        onDescription={setLiveDescription}
        sermonTitle={sermonTitle}
        onSermonTitle={setSermonTitle}
        sermonPreacher={sermonPreacher}
        onSermonPreacher={setSermonPreacher}
        sermonReference={sermonReference}
        onSermonReference={setSermonReference}
        chatEnabled={liveChatEnabled}
        onChatEnabled={setLiveChatEnabled}
        sermonPoints={sermonPoints}
        onAddPoint={addSermonPoint}
        onRemovePoint={removeSermonPoint}
        onUpdatePoint={(i, field, value) => updateSermonPointField(i, field, value)}
        embedUrl={liveEmbedUrl}
        onEmbedUrl={setLiveEmbedUrl}
        streamKey={streamKey}
        onStreamKey={setStreamKey}
        facebookRtmpsUrl={facebookRtmpsUrl}
        onFacebookRtmpsUrl={setFacebookRtmpsUrl}
        facebookStreamKey={facebookStreamKey}
        onFacebookStreamKey={setFacebookStreamKey}
        fallbackImage={liveFallbackImage}
        getPreviewUrl={getPreviewUrl}
        onImageSelect={handleImageSelect}
        baseResolution={baseResolution}
        onBaseResolution={setBaseResolution}
        outputResolution={outputResolution}
        onOutputResolution={setOutputResolution}
        outputFps={outputFps}
        onOutputFps={setOutputFps}
        broadcasting={broadcast.broadcasting}
      />
      {pendingDeleteLayer && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setPendingDeleteId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-studio-panel p-5 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-studio-onair/30 bg-studio-onair/10 text-studio-onair">
                <AlertTriangle className="size-5" />
              </span>
              <div>
                <h3 className="text-[15px] font-bold text-[#ff9a9a]">Retirer cette source ?</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-white/70">
                  « {pendingDeleteLayer.name} » sera retirée de la scène. Vous pourrez la recréer à
                  tout moment.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeleteLayer}
                className="rounded-xl bg-studio-onair px-4 py-2 text-xs font-bold text-white transition hover:brightness-110"
              >
                Retirer
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteScene && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setPendingDeleteSceneId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-studio-panel p-5 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-studio-onair/30 bg-studio-onair/10 text-studio-onair">
                <AlertTriangle className="size-5" />
              </span>
              <div>
                <h3 className="text-[15px] font-bold text-[#ff9a9a]">Supprimer cette scène ?</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-white/70">
                  « {pendingDeleteScene.name} » et ses {pendingDeleteScene.layers.length} source(s)
                  seront supprimées. Cette action est irréversible.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPendingDeleteSceneId(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeleteScene}
                className="rounded-xl bg-studio-onair px-4 py-2 text-xs font-bold text-white transition hover:brightness-110"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {showStopConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-up"
          onClick={() => setShowStopConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0820] p-6 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-live/10 text-live border border-live/30">
                <AlertTriangle className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-[#ff9a9a]">Arrêter le direct ?</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-white/70">
                  La diffusion sera coupée immédiatement pour tous les fidèles. Le direct sera archivé automatiquement sur le site public. Cette action est irréversible.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowStopConfirm(false)}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowStopConfirm(false);
                  // CHR-59 fix: this used to call `saveLiveSettings(false)`
                  // directly — it only flipped the site's `live_status` off
                  // while the compositor/WHIP/Facebook publish kept running
                  // (zombie stream, wasted bandwidth/CPU) and the on-air verse
                  // stayed broadcast. Route through the real `stopLive()`
                  // (same one the dock's "Arrêter le live" uses) instead.
                  void stopLive();
                }}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-live px-5 py-2.5 text-xs font-bold text-white transition hover:brightness-110"
              >
                <Square className="size-3.5 fill-white" />
                Arrêter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Drag & Resize Fullscreen Preview Modal */}
    </div>
  );
}
