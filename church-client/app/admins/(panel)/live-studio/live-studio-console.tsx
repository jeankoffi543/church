"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
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
import {
  getContainerStyle,
  getElementStyle,
  getPredefinedAbsolutePosition,
} from "./_components/studio-style";
import { StudioHeader } from "./_components/studio-header";
import { StageMonitor } from "./_components/stage-monitor";
import { TransitionBar } from "./_components/transition-bar";
import { ScenesDock } from "./_components/scenes-dock";
import { SourcesDock } from "./_components/sources-dock";
import { MixerDock } from "./_components/mixer-dock";
import { InspectorDock } from "./_components/inspector-dock";
import { ControlsDock } from "./_components/controls-dock";
import { ProgramOutMonitor } from "./_components/program-out-monitor";
import {
  lsGet,
  lsGetJSON,
  lsSet,
  lsSetJSON,
  SS_CURRENT_SCENE,
  SS_PROGRAM_LAYERS,
  SS_PROGRAM_SCENE,
} from "./_components/studio-persist";
import { StatusBar } from "./_components/status-bar";
import { SettingsModal } from "./_components/settings-modal";
import {
  createLayer,
  hasAudio,
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
      fontRefSpacing: 2.5,
      fontRefSize: 13,
      fontRefLineHeight: 1.2,
      fontRefColor: "#e2b85f",
      fontBodyFamily: "Cormorant Garamond",
      fontBodyWeight: "500",
      fontBodyStyle: "normal",
      fontBodyTransform: "none",
      fontBodyDecoration: "none",
      fontBodySpacing: 0,
      fontBodySize: 28,
      fontBodyLineHeight: 1.3,
      fontBodyColor: "#ffffff",
      fontVerFamily: "Plus Jakarta Sans",
      fontVerWeight: "600",
      fontVerStyle: "italic",
      fontVerTransform: "uppercase",
      fontVerDecoration: "none",
      fontVerSpacing: 1,
      fontVerSize: 11,
      fontVerLineHeight: 1.2,
      fontVerColor: "#e2b85f",
      containerShape: "rounded_rectangle",
      containerBg: "rgba(22, 15, 51, 0.95)",
      containerBorderRadius: 16,
      containerBorderWidth: 1.5,
      containerBorderStyle: "solid",
      containerBorderColor: "rgba(226, 184, 95, 0.25)",
      containerPaddingX: 28,
      containerPaddingY: 24,
      shadowBlur: 35,
      shadowSpread: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 12,
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
      fontRefSpacing: 2,
      fontRefSize: 12,
      fontRefLineHeight: 1.2,
      fontRefColor: "#ff007f",
      fontBodyFamily: "Plus Jakarta Sans",
      fontBodyWeight: "700",
      fontBodyStyle: "normal",
      fontBodyTransform: "none",
      fontBodyDecoration: "none",
      fontBodySpacing: 0.5,
      fontBodySize: 25,
      fontBodyLineHeight: 1.2,
      fontBodyColor: "linear-gradient(90deg, #ff007f 0%, #00e5ff 100%)",
      fontVerFamily: "Plus Jakarta Sans",
      fontVerWeight: "600",
      fontVerStyle: "italic",
      fontVerTransform: "uppercase",
      fontVerDecoration: "none",
      fontVerSpacing: 1,
      fontVerSize: 11,
      fontVerLineHeight: 1.2,
      fontVerColor: "#00e5ff",
      containerShape: "asymmetric",
      containerBg: "rgba(10, 5, 25, 0.96)",
      containerBorderRadius: 16,
      containerBorderWidth: 2,
      containerBorderStyle: "glow",
      containerBorderColor: "#ff007f",
      containerPaddingX: 24,
      containerPaddingY: 20,
      shadowBlur: 20,
      shadowSpread: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 8,
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
      fontRefSpacing: 3,
      fontRefSize: 11,
      fontRefLineHeight: 1.2,
      fontRefColor: "#00e5ff",
      fontBodyFamily: "Inter",
      fontBodyWeight: "500",
      fontBodyStyle: "normal",
      fontBodyTransform: "none",
      fontBodyDecoration: "none",
      fontBodySpacing: 0,
      fontBodySize: 18,
      fontBodyLineHeight: 1.2,
      fontBodyColor: "#ffffff",
      fontVerFamily: "Inter",
      fontVerWeight: "600",
      fontVerStyle: "italic",
      fontVerTransform: "uppercase",
      fontVerDecoration: "none",
      fontVerSpacing: 1,
      fontVerSize: 10,
      fontVerLineHeight: 1.2,
      fontVerColor: "#00e5ff",
      containerShape: "transparent",
      containerBg: "transparent",
      containerBorderRadius: 0,
      containerBorderWidth: 0,
      containerBorderStyle: "none",
      containerBorderColor: "transparent",
      containerPaddingX: 20,
      containerPaddingY: 10,
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
  const [newPresetName, setNewPresetName] = useState("");
  const previewScreenRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [animNonce, setAnimNonce] = useState(0);
  const playAnim = () => setAnimNonce((n) => n + 1);

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

  const handlePointerDown = (e: React.PointerEvent, action: "move" | "nw" | "ne" | "se" | "sw") => {
    e.preventDefault();
    const rect = previewScreenRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = settings.customX;
    const startTop = settings.customY;
    const startWidth = settings.customWidth;
    const startHeight = settings.customHeight;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = ((moveEvent.clientX - startX) / rect.width) * 100;
      const deltaY = ((moveEvent.clientY - startY) / rect.height) * 100;

      if (action === "move") {
        const nextX = Math.max(0, Math.min(100 - startWidth, startLeft + deltaX));
        const nextY = Math.max(0, Math.min(100 - startHeight, startTop + deltaY));
        setStudioField("customX", Math.round(nextX));
        setStudioField("customY", Math.round(nextY));
      } else if (action === "se") {
        const nextWidth = Math.max(10, Math.min(100 - startLeft, startWidth + deltaX));
        const nextHeight = Math.max(10, Math.min(100 - startTop, startHeight + deltaY));
        setStudioField("customWidth", Math.round(nextWidth));
        setStudioField("customHeight", Math.round(nextHeight));
      } else if (action === "sw") {
        const nextWidth = Math.max(10, startWidth - deltaX);
        const nextX = Math.max(0, Math.min(100 - nextWidth, startLeft + deltaX));
        const nextHeight = Math.max(10, Math.min(100 - startTop, startHeight + deltaY));
        setStudioField("customWidth", Math.round(nextWidth));
        setStudioField("customX", Math.round(nextX));
        setStudioField("customHeight", Math.round(nextHeight));
      } else if (action === "ne") {
        const nextWidth = Math.max(10, Math.min(100 - startLeft, startWidth + deltaX));
        const nextHeight = Math.max(10, startHeight - deltaY);
        const nextY = Math.max(0, Math.min(100 - nextHeight, startTop + deltaY));
        setStudioField("customWidth", Math.round(nextWidth));
        setStudioField("customHeight", Math.round(nextHeight));
        setStudioField("customY", Math.round(nextY));
      } else if (action === "nw") {
        const nextWidth = Math.max(10, startWidth - deltaX);
        const nextX = Math.max(0, Math.min(100 - nextWidth, startLeft + deltaX));
        const nextHeight = Math.max(10, startHeight - deltaY);
        const nextY = Math.max(0, Math.min(100 - nextHeight, startTop + deltaY));
        setStudioField("customWidth", Math.round(nextWidth));
        setStudioField("customX", Math.round(nextX));
        setStudioField("customHeight", Math.round(nextHeight));
        setStudioField("customY", Math.round(nextY));
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Dynamic versions/translations selection
  const [allTranslations, setAllTranslations] = useState<string[]>([]);
  const [translationSearch, setTranslationSearch] = useState("");

  const [prepared, setPrepared] = useState<ScriptureVerse[]>(initialPrepared);
  const [busy, setBusy] = useState(false);
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
    live_base_resolution: (liveSettings.live_base_resolution as string) ?? "1920x1080",
    live_output_resolution: (liveSettings.live_output_resolution as string) ?? "1920x1080",
    live_fps: (liveSettings.live_fps as string) ?? "60",
    live_ui_contrast: (liveSettings.live_ui_contrast as string) ?? "normal",
    live_ui_text_size: (liveSettings.live_ui_text_size as string) ?? "medium",
    live_audio_cues: Boolean(liveSettings.live_audio_cues),
    live_process_priority: (liveSettings.live_process_priority as string) ?? "high",
    live_stream_delay: (liveSettings.live_stream_delay as number) ?? 0,
    live_auto_reconnect: liveSettings.live_auto_reconnect !== false,
    live_db_cache: (liveSettings.live_db_cache as string) ?? "aggressive",
  });


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
        .filter((v) => {
          const seenKey = `${v.reference}-${v.translation || ""}`;
          return seen.has(seenKey) ? false : (seen.add(seenKey), true);
        });
      setSuggestions(merged);
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
        await broadcastScripture({ action: "show", verse, settings: nextSettings });
        setLive(verse);
        setOnAirSettings(nextSettings);
        setStatus({ type: "success", message: `Diffusé : ${verse.reference}` });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Diffusion impossible." });
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const diffuse = useCallback(() => {
    if (!preview) return;
    void pushLive(preview, settings);
  }, [preview, settings, pushLive]);

  const masquer = useCallback(async () => {
    setBusy(true);
    try {
      await broadcastScripture({ action: "hide" });
      setLive(null);
      setStatus({ type: "success", message: "Overlay masqué." });
    } catch (err) {
      setStatus({ type: "error", message: (err as Error).message || "Action impossible." });
    } finally {
      setBusy(false);
    }
  }, []);

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

  const liveRef = useRef(live);
  useEffect(() => {
    liveRef.current = live;
  });
  useEffect(() => {
    if (!liveRef.current) return;
    const t = setTimeout(() => {
      if (liveRef.current) {
        void broadcastScripture({ action: "show", verse: liveRef.current, settings });
        setOnAirSettings(settings);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [settings]);

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
      if (prepared.some((v) => v.reference === verse.reference)) return;
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

  const saveLiveSettings = async (overrideStatus?: boolean) => {
    setSavingSettings(true);
    setStatus(null);
    try {
      const targetStatus = overrideStatus !== undefined ? overrideStatus : liveStreamActive;
      // Going live broadcasts a visible "Direct externe" source's link if present,
      // otherwise the link configured in the settings.
      const embedFromSource =
        overrideStatus === true
          ? scenes.flatMap((s) => s.layers).find((l) => l.type === "embed" && l.visible && l.feedUrl)
              ?.feedUrl
          : undefined;
      const effectiveEmbedUrl = embedFromSource ?? liveEmbedUrl;
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


  // TODO(studio): habillage OBS — états de présentation (mode/sandbox/REC/disposition)
  // non encore reliés à un vrai moteur de scènes/diffusion réel.
  const [sandbox, setSandbox] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const [dualLayout, setDualLayout] = useState(true);
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setRecTime((t) => t + 1), 1000);
    return () => {
      clearInterval(id);
      setRecTime(0);
    };
  }, [recording]);
  const recLabel = `${String(Math.floor(recTime / 60)).padStart(2, "0")}:${String(recTime % 60).padStart(2, "0")}`;
  // The program-mode switch is wired to the REAL broadcast: switching to LIVE
  // starts the stream, leaving LIVE asks to stop it (confirm dialog).
  const mode: "preview" | "live" = liveStreamActive ? "live" : "preview";
  const handleModeChange = (m: "preview" | "live") => {
    if (m === "live" && !liveStreamActive) void saveLiveSettings(true);
    else if (m === "preview" && liveStreamActive) setShowStopConfirm(true);
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

  // Persist the session view state so a refresh keeps the current scene + the
  // on-air snapshot (scene DEFINITIONS live in the backend; this is the view).
  // Values are captured ONCE at init so the persist effects below can't clobber
  // them before the restore runs.
  const savedSessionRef = useRef<{
    cs: string | null;
    ps: string | null;
    pl: StudioLayer[] | null;
  } | null>(null);
  if (savedSessionRef.current === null) {
    savedSessionRef.current = {
      cs: lsGet(SS_CURRENT_SCENE),
      ps: lsGet(SS_PROGRAM_SCENE),
      pl: lsGetJSON<StudioLayer[]>(SS_PROGRAM_LAYERS),
    };
  }
  useEffect(() => void lsSet(SS_CURRENT_SCENE, currentSceneId), [currentSceneId]);
  useEffect(() => void lsSet(SS_PROGRAM_SCENE, programSceneId), [programSceneId]);
  useEffect(() => void lsSetJSON(SS_PROGRAM_LAYERS, programLayers), [programLayers]);
  useEffect(() => {
    const saved = savedSessionRef.current;
    const t = setTimeout(() => {
      if (saved?.cs) setCurrentSceneId(saved.cs);
      if (saved?.ps) setProgramSceneId(saved.ps);
      if (saved?.pl && saved.pl.length > 0) setProgramLayers(saved.pl);
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
      setAnimNonce((n) => n + 1);
    },
    [selectedLayerId, selectedIsBible, setSettings, setLayers],
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
      setAnimNonce((n) => n + 1);
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
      setAnimNonce((n) => n + 1);
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
      setAnimNonce((n) => n + 1);
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
      setAnimNonce((n) => n + 1);
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
  }, [selectedLayerId, selectedLayer, setLayers]);
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
    setLayers((ls) => ls.filter((l) => l.id !== pendingDeleteId));
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
      const nx = Math.max(0, Math.min(100 - w0, Math.round(x0 + dx)));
      const ny = Math.max(0, Math.min(100 - h0, Math.round(y0 + dy)));
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
                const cx = Math.max(0, Math.min(100, Math.round(orig.x + deltaX)));
                const cy = Math.max(0, Math.min(100, Math.round(orig.y + deltaY)));
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
      if (corner === "se") {
        w = Math.max(10, Math.min(100 - startLeft, startW + dx));
        h = Math.max(6, startH + dy);
      } else if (corner === "sw") {
        w = Math.max(10, startW - dx);
        x = Math.max(0, startLeft + dx);
        h = Math.max(6, startH + dy);
      } else if (corner === "ne") {
        w = Math.max(10, Math.min(100 - startLeft, startW + dx));
        h = Math.max(6, startH - dy);
        y = Math.max(0, startTop + dy);
      } else {
        w = Math.max(10, startW - dx);
        x = Math.max(0, startLeft + dx);
        h = Math.max(6, startH - dy);
        y = Math.max(0, startTop + dy);
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
    setProgramLayers(layers.map((l) => ({ ...l, style: { ...l.style } })));
    setProgramSceneId(currentSceneId);
    setProgramAnimNonce((n) => n + 1);
    const bibleOnAir = layers.some((l) => l.type === "bible" && l.visible) && !!preview;
    if (bibleOnAir) {
      diffuse();
    } else {
      if (live) {
        void broadcastScripture({ action: "hide" });
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
    onLoadVerse: setPreview,
    onPrepare: addToPrepared,
    onRemovePrepared: (v: ScriptureVerse) =>
      void persistPrepared(prepared.filter((p) => p.reference !== v.reference)),
    visibleVersions,
    defaultVersion,
    onToggleVersion: toggleVersionVisibility,
    onSetDefaultVersion: setDefaultVersion,
    translationSearch,
    onTranslationSearchChange: setTranslationSearch,
    visibleTranslations: sortedTranslations,
    hasMoreTranslations: false,
    onShowMoreTranslations: () => {},
  };

  return (
    <div className="-mx-6 -my-8 flex min-h-screen flex-col gap-3 bg-studio-bg p-3 text-white md:-mx-10 md:-my-10 md:p-4">
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
        mode={mode}
        onModeChange={handleModeChange}
        sandbox={sandbox}
        recording={recording}
        recLabel={recLabel}
        onOpenSettings={() => setShowGeneralConfig(true)}
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
            <StageMonitor
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
            />
            <TransitionBar
              onCut={sendToProgram}
              onBlack={blackScreen}
              onNextVerse={() => void advance("next_verse")}
              onNextChapter={() => void advance("next_chapter")}
              busy={busy}
              canCut={layers.some((l) => l.visible)}
              black={programBlack}
              showVerseNav={selectedLayer?.type === "bible"}
              canNavigate={!!(preview || live)}
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
        />
      </section>

      <section className="grid auto-rows-[clamp(360px,52vh,520px)] grid-cols-[repeat(auto-fit,minmax(218px,1fr))] gap-3">
        <ScenesDock
          scenes={scenes}
          currentSceneId={currentSceneId}
          programSceneId={programSceneId}
          onSelect={selectScene}
          onAdd={addScene}
          onReorder={reorderScene}
          onRequestDelete={setPendingDeleteSceneId}
          onRename={renameScene}
        />
        <SourcesDock
          layers={layers}
          selectedLayerId={selectedLayerId}
          onSelect={setSelectedLayerId}
          onAdd={addLayer}
          onToggle={toggleLayerVisible}
          onMove={moveLayer}
          onReorder={reorderLayer}
          onRequestDelete={setPendingDeleteId}
        />
        <MixerDock channels={mixerLayers} onChange={setLayerAudio} />
        <InspectorDock
          selectedLayer={selectedLayer}
          effectiveStyle={effectiveStyle}
          patchStyleField={patchStyleField}
          setSelectedStyle={setSelectedStyle}
          onRename={(name) => patchSelectedData({ name })}
          patchLayerData={patchSelectedData}
          onImageUrl={onImageUrl}
          onRestoreDefaults={restoreLayerDefaults}
          onPlayAnim={playAnim}
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
        />
        <ControlsDock
          recording={recording}
          onToggleRecord={() => setRecording((r) => !r)}
          recLabel={recLabel}
          sandbox={sandbox}
          onToggleSandbox={() => setSandbox((s) => !s)}
          dualLayout={dualLayout}
          onToggleLayout={() => setDualLayout((d) => !d)}
        />
        <ProgramOutMonitor
          layers={programBlack ? [] : programLayers}
          bibleVerse={programBlack ? null : live}
          bibleStyle={onAirSettings}
          animNonce={programAnimNonce}
          previewStageRef={previewStageRef}
        />
      </section>

      <StatusBar statusRight={status?.message ?? "Prêt"} />

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
                  saveLiveSettings(false);
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
      {showFullscreenPreview && (
        <div 
          ref={modalContainerRef}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-6 backdrop-blur-md"
        >
          <div className="mb-4 flex w-full max-w-5xl items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white font-sans">Éditeur de Position Intéractif</h3>
              <p className="text-xs text-white/50">Faites glisser le conteneur pour le déplacer. Ajustez ses dimensions à l&apos;aide des poignées d&apos;ancrage aux coins.</p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={toggleNativeFullscreen}
                className="rounded-lg bg-white/10 hover:bg-white/15 px-4 py-2 text-xs font-bold text-white transition cursor-pointer flex items-center gap-1.5"
              >
                <Maximize className="size-3.5" />
                {isNativeFullscreen ? "Quitter le Plein Écran" : "Plein Écran Réel"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (document.fullscreenElement) {
                    void document.exitFullscreen();
                  }
                  setShowFullscreenPreview(false);
                }}
                className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white transition cursor-pointer"
              >
                Fermer l&apos;éditeur
              </button>
            </div>
          </div>

          {/* Simulated 16:9 Screen */}
          <div 
            ref={previewScreenRef}
            className="relative aspect-video w-full max-w-5xl bg-[#160f33]/40 border-2 border-white/20 overflow-hidden shadow-2xl rounded-xl"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "20px 20px"
            }}
          >
            {/* Broadcast visual indicators */}
            <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded bg-red-600 px-2.5 py-1 text-[9px] font-black text-white tracking-widest animate-pulse">
              <span className="size-1.5 rounded-full bg-white" /> REC
            </div>
            <div className="absolute top-4 right-4 text-[9px] font-mono text-white/30">
              1920 x 1080 | SIMULATEUR D&apos;OVERLAY
            </div>

            {/* Draggable container box */}
            <div
              style={{
                ...getContainerStyle(settings),
                position: "absolute",
                left: settings.positionMode === "custom" ? `${settings.customX}%` : undefined,
                top: settings.positionMode === "custom" ? `${settings.customY}%` : undefined,
                width: settings.positionMode === "custom" ? `${settings.customWidth}%` : undefined,
                height: settings.positionMode === "custom" ? `${settings.customHeight}%` : undefined,
                ...(settings.positionMode === "predefined" && getPredefinedAbsolutePosition(settings.predefinedPosition || "centered_bottom")),
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
              onPointerDown={(e) => {
                if (settings.positionMode === "custom") {
                  handlePointerDown(e, "move");
                }
              }}
              className={cn(
                "select-none ring-1 ring-white/10 group",
                settings.positionMode === "custom" ? "cursor-move hover:ring-[#e2b85f]/40" : ""
              )}
            >
              {/* Resize Handles (rendered at corners, visible on hover) */}
              {settings.positionMode === "custom" && (
                <>
                  <div 
                    onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, "nw"); }}
                    className="absolute -top-1.5 -left-1.5 size-3 cursor-nw-resize rounded-full border border-[#e2b85f] bg-[#090514] shadow z-10"
                  />
                  <div 
                    onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, "ne"); }}
                    className="absolute -top-1.5 -right-1.5 size-3 cursor-ne-resize rounded-full border border-[#e2b85f] bg-[#090514] shadow z-10"
                  />
                  <div 
                    onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, "sw"); }}
                    className="absolute -bottom-1.5 -left-1.5 size-3 cursor-sw-resize rounded-full border border-[#e2b85f] bg-[#090514] shadow z-10"
                  />
                  <div 
                    onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, "se"); }}
                    className="absolute -bottom-1.5 -right-1.5 size-3 cursor-se-resize rounded-full border border-[#e2b85f] bg-[#090514] shadow z-10"
                  />
                </>
              )}

              {/* Simulated visual layout matching LiveVideoOverlay */}
              <span style={getElementStyle("fontRef", settings)} className="block mb-2 text-center pointer-events-none">
                {preview?.reference || "Jean 3:16"}
              </span>

              <div className="grid grid-cols-1 gap-2 pointer-events-none">
                <p style={getElementStyle("fontBody", settings)} className="text-center">
                  {preview?.text || "Car Dieu a tant aimé le monde qu&apos;il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu&apos;il ait la vie éternelle."}
                </p>
                <span style={getElementStyle("fontVer", settings)} className="text-center mt-1 block">
                  {preview?.translation || "LSG"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
