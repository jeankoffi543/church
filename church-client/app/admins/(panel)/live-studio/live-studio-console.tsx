"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Plus,
  X,
  Radio,
  EyeOff,
  ChevronRight,
  ChevronsRight,
  BookOpen,
  Sparkles,
  Type,
  Image as ImageIcon,
  Clock,
  Loader2,
  CheckCircle,
  AlertCircle,
  Save,
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  Trash,
  Tv,
  MessageSquare,
  AlertTriangle,
  Square,
  Maximize,
  Globe,
  HardDrive,
  Volume2,
  Monitor,
  Keyboard,
  Accessibility,
  Settings2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  searchBible,
  navigateBible,
  getBibleTranslations,
  getCurrentScripture,
  DEFAULT_STUDIO_SETTINGS,
  type ScriptureVerse,
  type StudioSettings,
  type StudioLayout,
  type StudioAnimation,
  type NavigateDirection,
} from "@/lib/studio";
import { broadcastScripture, setPreparedVerses, updateAdminSettings } from "@/lib/admin-api";

/* ── Option catalogues ──────────────────────────────────────────── */

const LAYOUTS: { value: StudioLayout; label: string }[] = [
  { value: "lower_third", label: "Bandeau bas" },
  { value: "full_screen", label: "Plein écran" },
  { value: "sidebar", label: "Latéral" },
];
const ANIMATIONS: { value: StudioAnimation; label: string }[] = [
  { value: "fade_slide", label: "Fondu & Glissement" },
  { value: "typewriter", label: "Machine à écrire" },
  { value: "scale", label: "Zoom" },
  { value: "neon_slide", label: "Néon Slide" },
];
const FONTS = ["Cormorant Garamond", "Plus Jakarta Sans"];
const BACKGROUNDS: { value: string; label: string }[] = [
  { value: "gradient_purple", label: "Dégradé spirituel" },
  { value: "blur", label: "Verre dépoli" },
  { value: "solid_dark", label: "Sombre uni" },
  { value: "none", label: "Transparent" },
];

type Status = { type: "success" | "error"; message: string } | null;

const HLS_BASE = (process.env.NEXT_PUBLIC_HLS_BASE_URL || "http://localhost:8088/hls").replace(/\/+$/, "");

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

  const shadowStr = `${s.shadowOffsetX}px ${s.shadowOffsetY}px ${s.shadowBlur}px ${s.shadowSpread}px ${s.shadowColor}`;
  if (baseStyle.boxShadow) {
    baseStyle.boxShadow = `${baseStyle.boxShadow}, ${shadowStr}`;
  } else {
    baseStyle.boxShadow = shadowStr;
  }

  return baseStyle;
};

const getPredefinedAbsolutePosition = (pos: string): React.CSSProperties => {
  switch (pos) {
    case "lower_third_left":
      return { left: "6%", top: "72%", width: "40%", height: "20%" };
    case "lower_third_right":
      return { right: "6%", top: "72%", width: "40%", height: "20%" };
    case "ticker":
      return { left: "0%", top: "86%", width: "100%", height: "14%" };
    case "full_screen_cinema":
      return { left: "10%", top: "10%", width: "80%", height: "80%" };
    case "centered_bottom":
    default:
      return { left: "10%", top: "72%", width: "80%", height: "20%" };
  }
};

export function LiveStudioConsole({
  initialPrepared,
  initialSettings,
}: {
  initialPrepared: ScriptureVerse[];
  initialSettings: Record<string, Record<string, unknown>>;
}) {
  // Navigation & UI States
  const [activeLeftTab, setActiveLeftTab] = useState<"bible" | "flux" | "chants">("bible");
  const [showGeneralConfig, setShowGeneralConfig] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState("general");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ScriptureVerse[]>([]);
  const [searching, setSearching] = useState(false);

  // Extended UI/UX Design States
  const [styleTab, setStyleTab] = useState<"layout" | "typo" | "container" | "anim" | "presets">("layout");
  const [typoElement, setTypoElement] = useState<"fontRef" | "fontBody" | "fontVer">("fontBody");
  const [showFullscreenPreview, setShowFullscreenPreview] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const previewScreenRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);

  // Re-hydrated presets state
  const [presets, setPresets] = useState<Array<{ name: string; settings: StudioSettings }>>(() => {
    const liveStyles = initialSettings.live_broadcast_styles || {};
    const dbPresets = liveStyles.live_presets as Array<{ name: string; settings: StudioSettings }> || [];
    return dbPresets.length > 0 ? dbPresets : PRELOADED_PRESETS;
  });

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
    const updated = [
      ...presets.filter((p) => p.name !== name),
      { name, settings: { ...settings } }
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

  const handleLoadPreset = (presetSettings: StudioSettings) => {
    setSettings(presetSettings);
    setStatus({ type: "success", message: "Preset appliqué !" });
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
        setStudio("customX", Math.round(nextX));
        setStudio("customY", Math.round(nextY));
      } else if (action === "se") {
        const nextWidth = Math.max(10, Math.min(100 - startLeft, startWidth + deltaX));
        const nextHeight = Math.max(10, Math.min(100 - startTop, startHeight + deltaY));
        setStudio("customWidth", Math.round(nextWidth));
        setStudio("customHeight", Math.round(nextHeight));
      } else if (action === "sw") {
        const nextWidth = Math.max(10, startWidth - deltaX);
        const nextX = Math.max(0, Math.min(100 - nextWidth, startLeft + deltaX));
        const nextHeight = Math.max(10, Math.min(100 - startTop, startHeight + deltaY));
        setStudio("customWidth", Math.round(nextWidth));
        setStudio("customX", Math.round(nextX));
        setStudio("customHeight", Math.round(nextHeight));
      } else if (action === "ne") {
        const nextWidth = Math.max(10, Math.min(100 - startLeft, startWidth + deltaX));
        const nextHeight = Math.max(10, startHeight - deltaY);
        const nextY = Math.max(0, Math.min(100 - nextHeight, startTop + deltaY));
        setStudio("customWidth", Math.round(nextWidth));
        setStudio("customHeight", Math.round(nextHeight));
        setStudio("customY", Math.round(nextY));
      } else if (action === "nw") {
        const nextWidth = Math.max(10, startWidth - deltaX);
        const nextX = Math.max(0, Math.min(100 - nextWidth, startLeft + deltaX));
        const nextHeight = Math.max(10, startHeight - deltaY);
        const nextY = Math.max(0, Math.min(100 - nextHeight, startTop + deltaY));
        setStudio("customWidth", Math.round(nextWidth));
        setStudio("customX", Math.round(nextX));
        setStudio("customHeight", Math.round(nextHeight));
        setStudio("customY", Math.round(nextY));
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
  const [visibleTranslationsCount, setVisibleTranslationsCount] = useState(10);
  const [translationSearch, setTranslationSearch] = useState("");

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

  const [prepared, setPrepared] = useState<ScriptureVerse[]>(initialPrepared);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  // Gate the toast portal until after mount (createPortal needs `document`).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
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
  const [keyCopied, setKeyCopied] = useState(false);
  const [liveFallbackImage, setLiveFallbackImage] = useState((liveSettings.live_fallback_image as string) ?? "");
  const [pendingLiveFallbackFile, setPendingLiveFallbackFile] = useState<File | null>(null);

  const [sermonTitle, setSermonTitle] = useState((liveSettings.live_sermon_title as string) ?? "");
  const [sermonPreacher, setSermonPreacher] = useState((liveSettings.live_sermon_preacher as string) ?? "");
  const [sermonReference, setSermonReference] = useState((liveSettings.live_sermon_reference as string) ?? "");
  const [sermonPoints, setSermonPoints] = useState<Array<{ id: string; text: string; verse: string }>>(
    (liveSettings.live_sermon_points as Array<{ id: string; text: string; verse: string }>) ?? []
  );

  const [advancedConfig, setAdvancedConfig] = useState({
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

  const updateAdvancedConfig = (key: keyof typeof advancedConfig, value: unknown) => {
    setAdvancedConfig((prev) => ({ ...prev, [key]: value }));
  };

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
    (liveSettings.bible_default_version as string) || "LS1910"
  );
  const [linkLiveTrigger, setLinkLiveTrigger] = useState(false);

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
      const loaded = versions.length > 0 ? versions : ["LS1910"];
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
    } catch (err) {
      if (signal?.aborted) return;
      setSearching(false);
    }
  }, []);

  /* ── Express search (debounced, abortable) ──────────────────────── */
  useEffect(() => {
    const q = query.trim();
    if (q.length === 0) {
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

  const setStudio = <K extends keyof StudioSettings>(key: K, value: StudioSettings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  /** Setter for dynamically-computed keys (template-literal element styling). */
  const setStudioField = (key: keyof StudioSettings, value: StudioSettings[keyof StudioSettings]) =>
    setSettings((s) => ({ ...s, [key]: value }) as StudioSettings);

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
      const payload = [
        { key: "live_embed_url", value: liveEmbedUrl, group: "live" },
        { key: "live_status", value: targetStatus, group: "live" },
        { key: "live_chat_enabled", value: liveChatEnabled, group: "live" },
        { key: "live_title", value: liveTitle, group: "live" },
        { key: "live_description", value: liveDescription, group: "live" },
        { key: "live_stream_key", value: streamKey, group: "live" },
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
  const visibleTranslations = sortedTranslations.slice(0, visibleTranslationsCount);
  const hasMoreTranslations = sortedTranslations.length > visibleTranslationsCount;

  return (
    <div className="-mx-6 -my-8 md:-mx-10 md:-my-10 min-h-screen bg-[#090514] p-5 text-white md:p-6">
      {/* Top bar with dynamic Live indicator */}
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#e2b85f] to-[#c8902e] text-[#160f33]">
            <Radio className="size-5" />
          </span>
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[10px] font-bold tracking-[0.25em] text-[#e2b85f] uppercase">Régie Live</span>
              <h1 className="font-display text-2xl leading-tight font-bold text-white italic">MFM Studio Control</h1>
            </div>
            <button
              type="button"
              onClick={() => setShowGeneralConfig(true)}
              className="ml-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-[#e2b85f] transition cursor-pointer"
              title="Paramètres de la Régie"
            >
              <Settings2 className="size-5" />
            </button>
          </div>
        </div>

        {/* Live indicator / control button */}
        <div className="flex items-center gap-3">
          {liveStreamActive ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-2 rounded-xl bg-live/20 border border-live/30 px-3.5 py-2 text-xs font-extrabold tracking-wider text-[#ff9a9a]">
                <span className="size-2.5 rounded-full bg-live animate-ping" />
                EN DIRECT
              </span>
              <button
                type="button"
                onClick={() => setShowStopConfirm(true)}
                className="cursor-pointer rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 px-3 py-2 text-xs font-bold text-white/80 transition"
              >
                Arrêter le Live
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => saveLiveSettings(true)}
              disabled={savingSettings}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-2 text-xs font-extrabold tracking-wider text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)] transition"
            >
              {savingSettings ? <Loader2 className="size-3.5 animate-spin" /> : <span className="size-2.5 rounded-full bg-emerald-400" />}
              LANCER LE LIVE
            </button>
          )}
        </div>
      </header>

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr_300px]">
        {/* ── Left: Source Panel (Onglets) ─────────────────────────── */}
        <aside className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 min-h-[600px]">
          {/* Tabs header */}
          <div className="flex border-b border-white/10 p-1 bg-white/[0.02] rounded-xl">
            <button
              onClick={() => setActiveLeftTab("bible")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 cursor-pointer rounded-lg py-2 text-[11px] font-bold transition-all",
                activeLeftTab === "bible"
                  ? "bg-[#e2b85f] text-[#160f33] shadow-[0_4px_12px_rgba(226,184,95,0.15)]"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <BookOpen className="size-3.5" />
              Écritures
            </button>
            <button
              onClick={() => setActiveLeftTab("flux")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 cursor-pointer rounded-lg py-2 text-[11px] font-bold transition-all",
                activeLeftTab === "flux"
                  ? "bg-[#e2b85f] text-[#160f33] shadow-[0_4px_12px_rgba(226,184,95,0.15)]"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <Radio className="size-3.5" />
              Flux & Infos
            </button>
            <button
              onClick={() => setActiveLeftTab("chants")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 cursor-pointer rounded-lg py-2 text-[11px] font-bold transition-all",
                activeLeftTab === "chants"
                  ? "bg-[#e2b85f] text-[#160f33] shadow-[0_4px_12px_rgba(226,184,95,0.15)]"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <Tv className="size-3.5" />
              Chants & Annonces
            </button>
          </div>

          {/* TAB 1: BIBLE */}
          {activeLeftTab === "bible" && (
            <div className="flex flex-col gap-4 flex-1">
              <div>
                <label className="mb-2 flex items-center gap-2 text-[11px] font-bold tracking-wider text-white/50 uppercase">
                  <BookOpen className="size-3.5" /> Moteur biblique
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-white/12 bg-[#0d0820] px-3 py-2.5 focus-within:border-[#e2b85f]">
                  <Search className="size-4 shrink-0 text-white/40" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ex: Jea 3:16, Psaume 23…"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                  />
                  {searching && <Loader2 className="size-4 shrink-0 animate-spin text-white/40" />}
                </div>

                {/* Dynamic versions custom visibilities & default selector */}
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white/40 uppercase">
                      Versions : {visibleVersions.length} / {allTranslations.length}
                    </span>
                    {allTranslations.length > 5 && (
                      <input
                        type="text"
                        value={translationSearch}
                        onChange={(e) => {
                          setTranslationSearch(e.target.value);
                          setVisibleTranslationsCount(10); // Reset pagination on search
                        }}
                        placeholder="Rechercher..."
                        className="w-28 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white placeholder:text-white/30 outline-none focus:border-[#e2b85f]/50"
                      />
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto bg-black/15 p-2 rounded-xl border border-white/5 pr-1">
                    {visibleTranslations.map((v) => {
                      const isDefault = defaultVersion === v;
                      const isVisible = visibleVersions.includes(v);
                      return (
                        <div
                          key={v}
                          className="flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] p-1.5 rounded-lg border border-white/5"
                        >
                          <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isVisible}
                              onChange={() => toggleVersionVisibility(v)}
                              className="size-3.5 cursor-pointer accent-[#e2b85f]"
                            />
                            <span className={cn("text-xs font-semibold truncate", isDefault ? "text-[#e2b85f] font-bold" : "text-white/80")}>
                              {v} {isDefault && <span className="text-[9px] font-bold text-[#e2b85f] bg-[#e2b85f]/10 px-1 py-0.5 rounded ml-1">DEFAULT</span>}
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setDefaultVersion(v)}
                            title="Définir par défaut"
                            className={cn(
                              "p-1 rounded transition cursor-pointer",
                              isDefault
                                ? "text-[#e2b85f]"
                                : "text-white/30 hover:text-[#e2b85f] hover:bg-white/5"
                            )}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                              <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.6 3.102-1.196 4.622c-.21.81.67 1.45 1.366.98L10 15.547l4.187 2.48c.696.47 1.576-.17 1.366-.98l-1.197-4.622 3.6-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}

                    {hasMoreTranslations && (
                      <button
                        type="button"
                        onClick={() => setVisibleTranslationsCount((prev) => prev + 10)}
                        className="w-full text-center py-1 text-[10px] font-bold text-[#e2b85f] bg-[#e2b85f]/5 border border-dashed border-[#e2b85f]/20 rounded hover:bg-[#e2b85f]/15 transition cursor-pointer uppercase tracking-wider"
                      >
                        Charger plus
                      </button>
                    )}
                  </div>
                </div>

                {query.trim().length >= 2 && suggestions.length > 0 && (
                  <div className="mt-3 max-h-64 space-y-1 overflow-y-auto border border-white/5 bg-black/20 p-1.5 rounded-xl">
                    {suggestions.map((v) => (
                      <div
                        key={`${v.reference}-${v.translation || ""}`}
                        className="group flex items-start gap-2 rounded-lg border border-transparent bg-white/[0.04] p-2.5 transition hover:border-[#e2b85f]/40 hover:bg-white/[0.07]"
                      >
                        <button
                          type="button"
                          onClick={() => setPreview(v)}
                          className="min-w-0 flex-1 cursor-pointer text-left flex flex-col"
                        >
                          <span className="text-[11px] font-bold text-[#e2b85f]">{v.reference}</span>
                          <p className="mt-0.5 line-clamp-2 text-[12px] text-white/70">{v.text}</p>
                          <span className="self-end text-[9px] text-[#e2b85f]/50 font-medium italic mt-1">
                            {v.translation || defaultVersion}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => addToPrepared(v)}
                          title="Préparer"
                          className="mt-0.5 shrink-0 cursor-pointer rounded-md p-1 text-white/40 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-[#e2b85f]"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="min-h-0 flex-1 border-t border-white/5 pt-3">
                <span className="mb-2 flex items-center justify-between text-[11px] font-bold tracking-wider text-white/50 uppercase">
                  <span className="flex items-center gap-2">
                    <Sparkles className="size-3.5" /> Versets préparés
                  </span>
                  <span className="text-[#e2b85f] font-mono">{prepared.length}</span>
                </span>
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {prepared.length === 0 && (
                    <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-[11px] text-white/30">
                      Préparez vos versets avant le culte (bouton +).
                    </p>
                  )}
                  {prepared.map((v, idx) => (
                    <div
                      key={`${v.reference}-${idx}`}
                      className="group flex items-center gap-2 rounded-lg bg-white/[0.04] p-2 pl-3 transition hover:bg-white/[0.08]"
                    >
                      <button
                        type="button"
                        onClick={() => setPreview(v)}
                        className="min-w-0 flex-1 cursor-pointer text-left text-[12px] font-semibold text-white/80"
                      >
                        {v.reference}
                      </button>
                      <button
                        type="button"
                        onClick={() => persistPrepared(prepared.filter((_, i) => i !== idx))}
                        className="shrink-0 cursor-pointer rounded-md p-1 text-white/30 transition hover:bg-white/10 hover:text-live"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FLUX & INFOS */}
          {activeLeftTab === "flux" && (
            <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#e2b85f]">Flux & Sermon</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70 select-none">
                    <input
                      type="checkbox"
                      checked={linkLiveTrigger}
                      onChange={(e) => setLinkLiveTrigger(e.target.checked)}
                      className="size-3.5 cursor-pointer accent-[#e2b85f]"
                    />
                    Afficher dans le live
                  </label>
                  <button
                    type="button"
                    onClick={() => saveLiveSettings(linkLiveTrigger ? true : undefined)}
                    disabled={savingSettings}
                    className="flex items-center gap-1.5 rounded-lg bg-[#e2b85f] px-3 py-1.5 text-xs font-bold text-[#160f33] transition hover:brightness-105 disabled:opacity-50"
                  >
                    {savingSettings ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                    Enregistrer
                  </button>
                </div>
              </div>

              {/* Chat option */}
              <label className="flex items-center justify-between gap-4 p-2 rounded-xl border border-white/5 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04]">
                <div>
                  <span className="block text-xs font-bold text-white">Module de Chat</span>
                  <span className="block text-[10px] text-white/40">Activer le Tchat public interactif</span>
                </div>
                <input
                  type="checkbox"
                  checked={liveChatEnabled}
                  onChange={(e) => setLiveChatEnabled(e.target.checked)}
                  className="size-4 cursor-pointer accent-[#e2b85f]"
                />
              </label>

              {/* Broadcast details */}
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-white/50 tracking-wider uppercase">Titre de la diffusion</span>
                  <input
                    value={liveTitle}
                    onChange={(e) => setLiveTitle(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0d0820] px-3 py-2 text-xs text-white outline-none focus:border-[#e2b85f]"
                    placeholder="Culte dominical - La puissance de la foi"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-white/50 tracking-wider uppercase">Description</span>
                  <textarea
                    value={liveDescription}
                    onChange={(e) => setLiveDescription(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-white/10 bg-[#0d0820] px-3 py-2 text-xs text-white outline-none focus:border-[#e2b85f] resize-none"
                    placeholder="Suivez notre culte de ce matin..."
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-white/50 tracking-wider uppercase">URL du flux vidéo (YouTube / HLS .m3u8)</span>
                  <input
                    value={liveEmbedUrl}
                    onChange={(e) => setLiveEmbedUrl(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0d0820] px-3 py-2 text-xs text-white outline-none focus:border-[#e2b85f]"
                    placeholder="https://stream.mfm.ci/hls/<clé>.m3u8"
                  />
                </label>
              </div>

              {/* Streaming secret key */}
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <KeyRound className="size-3.5 text-[#e2b85f]" />
                  <span className="text-[11px] font-bold text-[#e2b85f] uppercase">Clé de streaming (OBS)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    value={streamKey}
                    onChange={(e) => setStreamKey(e.target.value)}
                    placeholder="UUID stream key..."
                    className="flex-1 rounded-lg border border-white/10 bg-[#0d0820] px-2.5 py-1.5 font-mono text-[11px] text-white outline-none focus:border-[#e2b85f]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const key = crypto.randomUUID().replace(/-/g, "");
                      setStreamKey(key);
                      setLiveEmbedUrl(`${HLS_BASE}/${key}.m3u8`);
                      setKeyCopied(false);
                    }}
                    className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] font-bold text-white transition hover:bg-white/10"
                  >
                    <RefreshCw className="size-3" />
                  </button>
                  <button
                    type="button"
                    disabled={!streamKey}
                    onClick={() => {
                      navigator.clipboard.writeText(streamKey).then(() => {
                        setKeyCopied(true);
                        setTimeout(() => setKeyCopied(false), 2000);
                      });
                    }}
                    className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] font-bold text-white transition hover:bg-white/10"
                  >
                    {keyCopied ? <Check className="size-3 text-online" /> : <Copy className="size-3" />}
                  </button>
                </div>
              </div>

              {/* Sermon Notes Section */}
              <div className="border-t border-white/5 pt-3 flex flex-col gap-3">
                <span className="text-[11px] font-bold text-[#e2b85f] uppercase">Notes de Sermon</span>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-white/50 font-medium">Titre Sermon</span>
                    <input
                      value={sermonTitle}
                      onChange={(e) => setSermonTitle(e.target.value)}
                      className="rounded-lg border border-white/10 bg-[#0d0820] px-2 py-1.5 text-xs text-white outline-none focus:border-[#e2b85f]"
                      placeholder="La grâce transformatrice"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-white/50 font-medium">Référence Bible</span>
                    <input
                      value={sermonReference}
                      onChange={(e) => setSermonReference(e.target.value)}
                      className="rounded-lg border border-white/10 bg-[#0d0820] px-2 py-1.5 text-xs text-white outline-none focus:border-[#e2b85f]"
                      placeholder="Romains 5.1-11"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[10px] text-white/50 font-medium">Points clés :</span>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {sermonPoints.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 bg-black/20 p-2 rounded-lg border border-white/5">
                        <input
                          type="text"
                          value={item.id}
                          onChange={(e) => updateSermonPointField(idx, "id", e.target.value)}
                          className="w-8 text-center rounded border border-white/10 bg-[#0d0820] py-0.5 text-[10px] text-[#e2b85f] font-bold"
                          placeholder="01"
                        />
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => updateSermonPointField(idx, "text", e.target.value)}
                          className="flex-1 rounded border border-white/10 bg-[#0d0820] px-1.5 py-0.5 text-[10px] text-white"
                          placeholder="Point clé"
                        />
                        <input
                          type="text"
                          value={item.verse}
                          onChange={(e) => updateSermonPointField(idx, "verse", e.target.value)}
                          className="w-16 rounded border border-white/10 bg-[#0d0820] px-1.5 py-0.5 text-[10px] text-white"
                          placeholder="Réf"
                        />
                        <button
                          type="button"
                          onClick={() => removeSermonPoint(idx)}
                          className="text-live hover:bg-white/5 p-1 rounded"
                        >
                          <Trash className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addSermonPoint}
                    className="flex items-center gap-1 self-start rounded-lg border border-dashed border-[#e2b85f]/50 bg-[#e2b85f]/5 px-2.5 py-1 text-[10px] font-bold text-[#e2b85f] hover:bg-[#e2b85f]/10 cursor-pointer"
                  >
                    <Plus className="size-3" /> Ajouter un point
                  </button>
                </div>
              </div>

              {/* Cover Image fallback */}
              <div className="border-t border-white/5 pt-3 flex flex-col gap-2">
                <span className="text-[11px] font-bold text-white/50 tracking-wider uppercase">Image de Couverture (Hors Direct)</span>

                <div className="group relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#e2b85f]/30 bg-black/20 text-center transition-all duration-300 hover:border-[#e2b85f]">
                  {liveFallbackImage ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={getPreviewUrl(liveFallbackImage)} 
                        alt="Couverture" 
                        className="absolute inset-0 size-full object-cover"
                      />
                      <div className="absolute inset-0 bg-[#160f33]/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2">
                        <label className="cursor-pointer rounded-lg bg-[#e2b85f] text-indigo px-3 py-1.5 text-[10px] font-bold transition">
                          Remplacer
                          <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setLiveFallbackImage("");
                            setPendingLiveFallbackFile(null);
                          }}
                          className="text-[10px] font-bold text-red-400 hover:text-red-300"
                        >
                          Retirer
                        </button>
                      </div>
                    </>
                  ) : (
                    <label className="flex size-full cursor-pointer flex-col items-center justify-center p-4">
                      <ImageIcon className="size-6 text-[#e2b85f] mb-1" />
                      <span className="block text-[11px] font-bold text-white">Importer image</span>
                      <span className="block text-[9px] text-white/40">PNG, JPG. Max 2 Mo.</span>
                      <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RESERVED SPACE */}
          {activeLeftTab === "chants" && (
            <div className="flex flex-col items-center justify-center text-center py-20 text-white/30 flex-1">
              <Tv className="size-8 mb-2 text-[#e2b85f] opacity-50" />
              <p className="text-xs font-bold uppercase tracking-wider text-white/40">Espace Réservé</p>
              <p className="text-[11px] mt-1 max-w-[200px] leading-relaxed">Ce module accueillera bientôt la gestion des chants et annonces défilantes.</p>
            </div>
          )}
        </aside>

        {/* ── Center: Control Deck ─────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <Deck
            label="À l’antenne"
            tone="live"
            verse={live}
            settings={onAirSettings}
            mini
            onFullscreen={() => setShowFullscreenPreview(true)}
          />
          <Deck
            label="En attente (preview)"
            tone="preview"
            verse={preview}
            settings={settings}
            onFullscreen={() => setShowFullscreenPreview(true)}
          />

          {/* Dynamic action row */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#0d0820] border border-white/10 rounded-xl p-3">
            {/* Pulsating status badge switch */}
            <div className="flex items-center">
              {liveStreamActive ? (
                <button
                  type="button"
                  onClick={() => setShowStopConfirm(true)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-live/20 hover:bg-live/35 border border-live/30 px-3.5 py-2.5 text-xs font-extrabold tracking-wider text-[#ff9a9a]"
                >
                  <span className="size-2 rounded-full bg-live animate-ping" />
                  <span>EN DIRECT</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => saveLiveSettings(true)}
                  disabled={savingSettings}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-2.5 text-xs font-extrabold tracking-wider text-white/50"
                >
                  <span className="size-2 rounded-full bg-white/20" />
                  <span>HORS DIRECT</span>
                </button>
              )}
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={masquer}
                disabled={!live || busy}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-lg border px-4 py-2.5 text-xs font-extrabold tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40",
                  !live
                    ? "bg-red-500/20 border-red-500/30 text-red-400 opacity-90 cursor-not-allowed font-semibold"
                    : "bg-white/10 border-white/12 text-white/80 hover:bg-white/15"
                )}
              >
                <EyeOff className="size-3.5" /> ÉCRAN VIDE {!live && " (ACTIF)"}
              </button>
              <button
                type="button"
                onClick={diffuse}
                disabled={!preview || busy}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-live px-5 py-2.5 text-xs font-extrabold tracking-wide text-white shadow-[0_0_15px_rgba(229,57,53,0.3)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Radio className="size-3.5" />} DIFFUSER
              </button>
            </div>
          </div>

          {/* Scripture sibling navigation */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => advance("next_verse")}
              disabled={(!live && !preview) || busy}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-[#0d0820] hover:bg-white/5 px-3 py-2.5 text-xs font-bold text-white transition hover:border-[#e2b85f]/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Verset suivant <ChevronRight className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => advance("next_chapter")}
              disabled={(!live && !preview) || busy}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-[#0d0820] hover:bg-white/5 px-3 py-2.5 text-xs font-bold text-white transition hover:border-[#e2b85f]/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Chapitre suivant <ChevronsRight className="size-3.5" />
            </button>
          </div>
        </section>

        {/* ── Right: Studio style Configurator ───────────────────────────── */}
        {/* ── Right: Studio style Configurator ───────────────────────────── */}
        <aside className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 h-[75vh] overflow-y-auto w-full lg:w-[320px] shrink-0">
          <span className="text-[11px] font-bold tracking-wider text-white/50 uppercase">Studio · Style Pro</span>
          
          <div className="flex border-b border-white/10 p-0.5 bg-black/20 rounded-xl mb-1 text-[10px] font-bold">
            {(["layout", "typo", "container", "anim", "presets"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStyleTab(tab)}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-center cursor-pointer transition capitalize",
                  styleTab === tab ? "bg-[#e2b85f] text-[#160f33]" : "text-white/60 hover:text-white"
                )}
              >
                {tab === "container" ? "Cadre" : tab === "anim" ? "Anim" : tab}
              </button>
            ))}
          </div>

          {/* TAB 1: LAYOUT & POSITIONING */}
          {styleTab === "layout" && (
            <div className="flex flex-col gap-3.5">
              <div>
                <label className="mb-2 block text-[10px] font-bold tracking-wider text-white/50 uppercase">Mode Position</label>
                <div className="flex bg-black/20 p-0.5 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setStudio("positionMode", "predefined")}
                    className={cn("flex-1 py-1 rounded-md transition cursor-pointer", settings.positionMode === "predefined" ? "bg-white/10 text-white" : "text-white/40")}
                  >
                    Prédéfini
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudio("positionMode", "custom")}
                    className={cn("flex-1 py-1 rounded-md transition cursor-pointer", settings.positionMode === "custom" ? "bg-white/10 text-white" : "text-white/40")}
                  >
                    Libre (D&D)
                  </button>
                </div>
              </div>

              {settings.positionMode === "predefined" ? (
                <Selector
                  icon={ImageIcon}
                  label="Disposition standard"
                  value={settings.predefinedPosition || "centered_bottom"}
                  options={[
                    { value: "centered_bottom", label: "Centré bas" },
                    { value: "lower_third_left", label: "Tiers bas gauche" },
                    { value: "lower_third_right", label: "Tiers bas droite" },
                    { value: "ticker", label: "Bandeau ticker défilant" },
                    { value: "full_screen_cinema", label: "Plein écran cinéma" },
                  ]}
                  onChange={(v) => setStudioField("predefinedPosition", v)}
                />
              ) : (
                <div className="space-y-3 bg-black/15 p-3 rounded-xl border border-white/5">
                  <span className="block text-[10px] font-bold text-white/40 uppercase">Coordonnées (%)</span>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Position X (Gauche)</span>
                      <span className="font-mono text-[#e2b85f]">{settings.customX}%</span>
                    </div>
                    <input
                      type="range" min={0} max={100} value={settings.customX}
                      onChange={(e) => setStudio("customX", Number(e.target.value))}
                      className="w-full accent-[#e2b85f]"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Position Y (Haut)</span>
                      <span className="font-mono text-[#e2b85f]">{settings.customY}%</span>
                    </div>
                    <input
                      type="range" min={0} max={100} value={settings.customY}
                      onChange={(e) => setStudio("customY", Number(e.target.value))}
                      className="w-full accent-[#e2b85f]"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Largeur</span>
                      <span className="font-mono text-[#e2b85f]">{settings.customWidth}%</span>
                    </div>
                    <input
                      type="range" min={10} max={100} value={settings.customWidth}
                      onChange={(e) => setStudio("customWidth", Number(e.target.value))}
                      className="w-full accent-[#e2b85f]"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Hauteur</span>
                      <span className="font-mono text-[#e2b85f]">{settings.customHeight}%</span>
                    </div>
                    <input
                      type="range" min={10} max={100} value={settings.customHeight}
                      onChange={(e) => setStudio("customHeight", Number(e.target.value))}
                      className="w-full accent-[#e2b85f]"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowFullscreenPreview(true)}
                className="w-full mt-2 cursor-pointer flex items-center justify-center gap-1.5 rounded-xl border border-[#e2b85f]/30 bg-[#e2b85f]/10 hover:bg-[#e2b85f]/20 py-2.5 text-xs font-bold text-[#e2b85f] transition-all"
              >
                <Tv className="size-4" /> Prévisualiser en plein écran
              </button>
            </div>
          )}

          {/* TAB 2: TYPOGRAPHY ELEMENT STYLING */}
          {styleTab === "typo" && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold tracking-wider text-white/50 uppercase">Élément de texte</label>
                <select
                  value={typoElement}
                  onChange={(e) => setTypoElement(e.target.value as "fontRef" | "fontBody" | "fontVer")}
                  className="w-full rounded-lg border border-white/10 bg-[#0d0820] px-2 py-1.5 text-xs font-semibold text-white outline-none focus:border-[#e2b85f]"
                >
                  <option value="fontRef">Titre / Référence</option>
                  <option value="fontBody">Corps / Verset</option>
                  <option value="fontVer">Code de version</option>
                </select>
              </div>

              <div className="space-y-3 bg-black/15 p-3 rounded-xl border border-white/5">
                <Selector
                  icon={Type}
                  label="Police"
                  value={settings[`${typoElement}Family` as keyof StudioSettings] as string}
                  options={[
                    { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
                    { value: "Cormorant Garamond", label: "Cormorant Garamond" },
                    { value: "Inter", label: "Inter" },
                    { value: "Roboto", label: "Roboto" },
                    { value: "Playfair Display", label: "Playfair Display" },
                    { value: "Montserrat", label: "Montserrat" },
                    { value: "Outfit", label: "Outfit" },
                  ]}
                  onChange={(v) => setStudioField(`${typoElement}Family` as keyof StudioSettings, v)}
                />

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold tracking-wider text-white/50 uppercase">Graisse</label>
                  <select
                    value={settings[`${typoElement}Weight` as keyof StudioSettings] as string}
                    onChange={(e) => setStudioField(`${typoElement}Weight` as keyof StudioSettings, e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0820] px-2 py-1.5 text-xs text-white outline-none focus:border-[#e2b85f]"
                  >
                    {["100", "200", "300", "400", "500", "600", "700", "800", "900"].map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                {/* Style variation toggles */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStudioField(`${typoElement}Style` as keyof StudioSettings, settings[`${typoElement}Style` as keyof StudioSettings] === "italic" ? "normal" : "italic")}
                    className={cn("flex-1 py-1 rounded text-[10px] font-bold border transition cursor-pointer", settings[`${typoElement}Style` as keyof StudioSettings] === "italic" ? "bg-[#e2b85f]/15 border-[#e2b85f] text-[#e2b85f]" : "border-white/10 bg-white/5 text-white/60")}
                  >
                    Italique
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudioField(`${typoElement}Transform` as keyof StudioSettings, settings[`${typoElement}Transform` as keyof StudioSettings] === "uppercase" ? "none" : "uppercase")}
                    className={cn("flex-1 py-1 rounded text-[10px] font-bold border transition cursor-pointer", settings[`${typoElement}Transform` as keyof StudioSettings] === "uppercase" ? "bg-[#e2b85f]/15 border-[#e2b85f] text-[#e2b85f]" : "border-white/10 bg-white/5 text-white/60")}
                  >
                    MAJUSCULE
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudioField(`${typoElement}Decoration` as keyof StudioSettings, settings[`${typoElement}Decoration` as keyof StudioSettings] === "underline" ? "none" : "underline")}
                    className={cn("flex-1 py-1 rounded text-[10px] font-bold border transition cursor-pointer", settings[`${typoElement}Decoration` as keyof StudioSettings] === "underline" ? "bg-[#e2b85f]/15 border-[#e2b85f] text-[#e2b85f]" : "border-white/10 bg-white/5 text-white/60")}
                  >
                    Souligné
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-white/60">
                    <span>Taille texte</span>
                    <span className="font-mono text-[#e2b85f]">{settings[`${typoElement}Size` as keyof StudioSettings]}px</span>
                  </div>
                  <input
                    type="range" min={10} max={80} value={settings[`${typoElement}Size` as keyof StudioSettings] as number}
                    onChange={(e) => setStudioField(`${typoElement}Size` as keyof StudioSettings, Number(e.target.value))}
                    className="w-full accent-[#e2b85f]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-white/60">
                    <span>Hauteur de ligne</span>
                    <span className="font-mono text-[#e2b85f]">{settings[`${typoElement}LineHeight` as keyof StudioSettings]}x</span>
                  </div>
                  <input
                    type="range" min={1} max={2.5} step={0.1} value={settings[`${typoElement}LineHeight` as keyof StudioSettings] as number}
                    onChange={(e) => setStudioField(`${typoElement}LineHeight` as keyof StudioSettings, Number(e.target.value))}
                    className="w-full accent-[#e2b85f]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-white/60">
                    <span>Espacement lettres</span>
                    <span className="font-mono text-[#e2b85f]">{settings[`${typoElement}Spacing` as keyof StudioSettings]}px</span>
                  </div>
                  <input
                    type="range" min={-2} max={15} step={0.5} value={settings[`${typoElement}Spacing` as keyof StudioSettings] as number}
                    onChange={(e) => setStudioField(`${typoElement}Spacing` as keyof StudioSettings, Number(e.target.value))}
                    className="w-full accent-[#e2b85f]"
                  />
                </div>

                {/* Color picker selection */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold tracking-wider text-white/50 uppercase">Couleur ou Dégradé</label>
                  <div className="grid grid-cols-5 gap-1 mb-2">
                    {["#ffffff", "#e2b85f", "#ffb300", "#00e5ff", "#ff4081", "linear-gradient(90deg, #ff007f 0%, #00e5ff 100%)", "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)"].map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setStudioField(`${typoElement}Color` as keyof StudioSettings, col)}
                        style={{ background: col.includes("gradient") ? col : undefined, backgroundColor: col.includes("gradient") ? undefined : col }}
                        className={cn("aspect-square rounded border cursor-pointer border-white/10 hover:scale-105 transition", settings[`${typoElement}Color` as keyof StudioSettings] === col && "ring-2 ring-white")}
                        title={col}
                      />
                    ))}
                  </div>
                  <input
                    type="text"
                    value={settings[`${typoElement}Color` as keyof StudioSettings] as string}
                    onChange={(e) => setStudioField(`${typoElement}Color` as keyof StudioSettings, e.target.value)}
                    placeholder="Couleur (ex: #fff ou RGBA ou dégradé)"
                    className="w-full rounded-lg border border-white/10 bg-[#0d0820] px-2 py-1 text-[11px] font-mono text-white outline-none focus:border-[#e2b85f]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONTAINER & GEOMETRY STYLE */}
          {styleTab === "container" && (
            <div className="flex flex-col gap-3">
              <Selector
                icon={ImageIcon}
                label="Forme conteneur"
                value={settings.containerShape}
                options={[
                  { value: "rounded_rectangle", label: "Rectangle arrondi" },
                  { value: "rectangle", label: "Rectangle droit" },
                  { value: "capsule", label: "Capsule" },
                  { value: "asymmetric", label: "Asymétrique" },
                  { value: "transparent", label: "Transparent" },
                ]}
                onChange={(v) => setStudioField("containerShape", v)}
              />

              {settings.containerShape !== "transparent" && (
                <div className="space-y-3 bg-black/15 p-3 rounded-xl border border-white/5">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-white/40 uppercase">Arrière-plan conteneur</label>
                    <input
                      type="text"
                      value={settings.containerBg}
                      onChange={(e) => setStudio("containerBg", e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#0d0820] px-2.5 py-1.5 font-mono text-xs text-white outline-none focus:border-[#e2b85f]"
                      placeholder="rgba(22, 15, 51, 0.95)"
                    />
                  </div>

                  {settings.containerShape === "rounded_rectangle" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span>Arrondi des angles</span>
                        <span className="font-mono text-[#e2b85f]">{settings.containerBorderRadius}px</span>
                      </div>
                      <input
                        type="range" min={0} max={60} value={settings.containerBorderRadius}
                        onChange={(e) => setStudio("containerBorderRadius", Number(e.target.value))}
                        className="w-full accent-[#e2b85f]"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="block text-[10px] text-white/50 font-medium">Bordure (px)</span>
                      <input
                        type="number" min={0} max={10} value={settings.containerBorderWidth}
                        onChange={(e) => setStudio("containerBorderWidth", Number(e.target.value))}
                        className="w-full rounded border border-white/10 bg-[#0d0820] px-2 py-1 text-xs text-white outline-none focus:border-[#e2b85f]"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[10px] text-white/50 font-medium">Style Bordure</span>
                      <select
                        value={settings.containerBorderStyle}
                        onChange={(e) => setStudioField("containerBorderStyle", e.target.value)}
                        className="w-full rounded border border-white/10 bg-[#0d0820] px-2 py-1 text-xs text-white outline-none focus:border-[#e2b85f]"
                      >
                        <option value="solid">Plein (Solid)</option>
                        <option value="dashed">Pointillé (Dashed)</option>
                        <option value="glow">Néon (Glow)</option>
                        <option value="none">Aucun</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-white/40 uppercase">Couleur bordure</label>
                    <input
                      type="text"
                      value={settings.containerBorderColor}
                      onChange={(e) => setStudio("containerBorderColor", e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#0d0820] px-2.5 py-1.5 font-mono text-xs text-white outline-none focus:border-[#e2b85f]"
                      placeholder="rgba(255,255,255,0.15)"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="block text-[10px] text-white/50 font-medium">Marge Interne X</span>
                      <input
                        type="number" min={5} max={100} value={settings.containerPaddingX}
                        onChange={(e) => setStudio("containerPaddingX", Number(e.target.value))}
                        className="w-full rounded border border-white/10 bg-[#0d0820] px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[10px] text-white/50 font-medium">Marge Interne Y</span>
                      <input
                        type="number" min={5} max={100} value={settings.containerPaddingY}
                        onChange={(e) => setStudio("containerPaddingY", Number(e.target.value))}
                        className="w-full rounded border border-white/10 bg-[#0d0820] px-2 py-1 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Shadow Portee Settings */}
              <div className="space-y-3 bg-black/15 p-3 rounded-xl border border-white/5">
                <span className="block text-[10px] font-bold text-white/40 uppercase">Ombre portée (Broadcast)</span>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>Flou (Blur)</span>
                    <span className="font-mono text-[#e2b85f]">{settings.shadowBlur}px</span>
                  </div>
                  <input
                    type="range" min={0} max={100} value={settings.shadowBlur}
                    onChange={(e) => setStudio("shadowBlur", Number(e.target.value))}
                    className="w-full accent-[#e2b85f]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="block text-[10px] text-white/50 font-medium">Décalage X</span>
                    <input
                      type="number" min={-50} max={50} value={settings.shadowOffsetX}
                      onChange={(e) => setStudio("shadowOffsetX", Number(e.target.value))}
                      className="w-full rounded border border-white/10 bg-[#0d0820] px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[10px] text-white/50 font-medium">Décalage Y</span>
                    <input
                      type="number" min={-50} max={50} value={settings.shadowOffsetY}
                      onChange={(e) => setStudio("shadowOffsetY", Number(e.target.value))}
                      className="w-full rounded border border-white/10 bg-[#0d0820] px-2 py-1 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold text-white/40 uppercase">Couleur Ombre</label>
                  <input
                    type="text"
                    value={settings.shadowColor}
                    onChange={(e) => setStudio("shadowColor", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0820] px-2.5 py-1.5 font-mono text-xs text-white outline-none focus:border-[#e2b85f]"
                    placeholder="rgba(0, 0, 0, 0.5)"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ANIMATIONS TIMING */}
          {styleTab === "anim" && (
            <div className="flex flex-col gap-3.5">
              <Selector
                icon={Sparkles}
                label="Effet d'apparition"
                value={settings.animation}
                options={[
                  { value: "fade_slide", label: "Fondu & Glissement" },
                  { value: "scale", label: "Zoom" },
                  { value: "slide_left", label: "Glissement Gauche" },
                  { value: "slide_right", label: "Glissement Droite" },
                  { value: "clip_reveal", label: "Déploiement (Clip-path)" },
                  { value: "typewriter", label: "Machine à écrire" },
                ]}
                onChange={(v) => setStudioField("animation", v)}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Durée de transition</span>
                  <span className="font-mono text-[#e2b85f]">{settings.animDuration} ms</span>
                </div>
                <input
                  type="range" min={100} max={3000} step={100} value={settings.animDuration}
                  onChange={(e) => setStudio("animDuration", Number(e.target.value))}
                  className="w-full accent-[#e2b85f]"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold tracking-wider text-white/50 uppercase">Courbe (Easing)</label>
                <select
                  value={settings.animEasing}
                  onChange={(e) => setStudioField("animEasing", e.target.value)}
                  className="w-full cursor-pointer rounded-xl border border-white/12 bg-[#0d0820] px-3.5 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#e2b85f]"
                >
                  <option value="ease-out">Facilité fin (Ease-out)</option>
                  <option value="ease-in">Facilité début (Ease-in)</option>
                  <option value="ease-in-out">Facilité totale (Ease-in-out)</option>
                  <option value="linear">Linéaire</option>
                  <option value="bounce">Élastique (Bounce)</option>
                </select>
              </div>

              <div className="border-t border-white/5 pt-3">
                <label className="mb-2 flex items-center justify-between text-[11px] font-bold tracking-wider text-white/50 uppercase">
                  <span className="flex items-center gap-2">
                    <Clock className="size-3.5" /> Durée d'affichage
                  </span>
                  <span className="text-[#e2b85f]">{settings.duration === 0 ? "Manuel" : `${settings.duration}s`}</span>
                </label>
                <input
                  type="range" min={0} max={60} step={5} value={settings.duration}
                  onChange={(e) => setStudio("duration", Number(e.target.value))}
                  className="w-full accent-[#e2b85f]"
                />
                <p className="mt-1 text-[10px] text-white/30">0 = reste affiché jusqu’au masquage manuel.</p>
              </div>
            </div>
          )}

          {/* TAB 5: PRESETS MANAGER */}
          {styleTab === "presets" && (
            <div className="flex flex-col gap-3.5">
              <div className="bg-black/15 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
                <span className="block text-[10px] font-bold text-white/40 uppercase">Enregistrer style actuel</span>
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Nom du preset..."
                  className="w-full rounded-lg border border-white/10 bg-[#0d0820] px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#e2b85f]"
                />
                <button
                  type="button"
                  onClick={handleSavePreset}
                  disabled={!newPresetName.trim()}
                  className="w-full py-1.5 text-xs font-bold text-[#160f33] bg-[#e2b85f] hover:brightness-105 rounded-lg disabled:opacity-50 transition cursor-pointer"
                >
                  Sauvegarder Preset
                </button>
              </div>

              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-white/40 uppercase">Presets Sauvegardés</span>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {presets.map((preset) => (
                    <div
                      key={preset.name}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition"
                    >
                      <button
                        type="button"
                        onClick={() => handleLoadPreset(preset.settings)}
                        className="text-left text-xs font-semibold text-white/90 truncate flex-1 cursor-pointer"
                      >
                        {preset.name}
                      </button>
                      
                      {/* Delete icon unless preloaded defaults */}
                      {!PRELOADED_PRESETS.some((p) => p.name === preset.name) && (
                        <button
                          type="button"
                          onClick={() => handleDeletePreset(preset.name)}
                          className="text-white/30 hover:text-live p-1 rounded cursor-pointer"
                        >
                          <Trash className="size-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* OBS-Style Settings Modal */}
      {showGeneralConfig && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-fade-in"
          onClick={() => setShowGeneralConfig(false)}
        >
          <div 
            className="flex w-full max-w-5xl h-[80vh] overflow-hidden rounded-xl border border-[#b270ff]/30 bg-[#130d22] shadow-[0_0_50px_-12px_rgba(178,112,255,0.2)] text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Sidebar - Tabs */}
            <div className="w-64 bg-[#0d0918] border-r border-white/5 flex flex-col">
              <div className="p-5 border-b border-white/5">
                <h2 className="text-lg font-black tracking-widest text-white/90">PARAMÈTRES</h2>
              </div>
              <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-3 custom-scrollbar">
                {[
                  { id: "general", label: "Général", icon: Settings2 },
                  { id: "stream", label: "Stream", icon: Globe },
                  { id: "output", label: "Sortie", icon: HardDrive },
                  { id: "audio", label: "Audio", icon: Volume2 },
                  { id: "video", label: "Vidéo", icon: Monitor },
                  { id: "hotkeys", label: "Raccourcis clavier", icon: Keyboard },
                  { id: "accessibility", label: "Accessibilité", icon: Accessibility },
                  { id: "advanced", label: "Avancé", icon: Settings2 },
                ].map((t) => {
                  const active = activeSettingsTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveSettingsTab(t.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer",
                        active 
                          ? "bg-[#b270ff]/15 text-[#b270ff] shadow-[inset_2px_0_0_#b270ff]" 
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <t.icon className="size-4" />
                      {t.label}
                    </button>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-white/5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setShowGeneralConfig(false)}
                  className="w-full rounded-lg bg-white/5 hover:bg-white/10 py-2 text-sm font-bold transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => { saveLiveSettings(); setShowGeneralConfig(false); }}
                  className="w-full rounded-lg bg-[#b270ff] hover:bg-[#b270ff]/90 text-white py-2 text-sm font-bold shadow-lg shadow-[#b270ff]/20 transition flex justify-center items-center gap-2 cursor-pointer"
                >
                  {savingSettings ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Appliquer
                </button>
              </div>
            </div>

            {/* Right Panel - Content */}
            <div className="flex-1 flex flex-col bg-[#130d22] relative overflow-hidden">
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                
                {/* TAB: GENERAL */}
                {activeSettingsTab === "general" && (
                  <div className="space-y-8 animate-fade-in">
                    <h3 className="text-xl font-bold border-b border-white/10 pb-4">Général</h3>
                    
                    <div className="space-y-6 max-w-2xl">
                      {/* Section Infos */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-[#b270ff] uppercase tracking-wider">Informations de Diffusion</h4>
                        
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-bold text-white/50">Titre du Live</span>
                          <input type="text" value={liveTitle} onChange={(e) => setLiveTitle(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#090514] px-4 py-2 text-sm text-white focus:border-[#b270ff] outline-none transition" />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-bold text-white/50">Description</span>
                          <textarea value={liveDescription} onChange={(e) => setLiveDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-white/10 bg-[#090514] px-4 py-2 text-sm text-white focus:border-[#b270ff] outline-none transition" />
                        </label>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-[#b270ff] uppercase tracking-wider">Détails du Sermon</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-bold text-white/50">Titre du Message</span>
                            <input type="text" value={sermonTitle} onChange={(e) => setSermonTitle(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#090514] px-4 py-2 text-sm text-white focus:border-[#b270ff] outline-none transition" />
                          </label>
                          <label className="block">
                            <span className="mb-1.5 block text-xs font-bold text-white/50">Prédicateur</span>
                            <input type="text" value={sermonPreacher} onChange={(e) => setSermonPreacher(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#090514] px-4 py-2 text-sm text-white focus:border-[#b270ff] outline-none transition" />
                          </label>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-[#b270ff] uppercase tracking-wider">Interface Utilisateur</h4>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={advancedConfig.live_show_in_feed} onChange={(e) => updateAdvancedConfig("live_show_in_feed", e.target.checked)} className="size-4 rounded border-white/20 bg-black/40 text-[#b270ff] focus:ring-[#b270ff] cursor-pointer" />
                          <span className="text-sm font-medium">Afficher ce direct dans le fil public</span>
                        </label>
                        <label className="block mt-4">
                          <span className="mb-1.5 block text-xs font-bold text-white/50">Langue de la Régie</span>
                          <select value={advancedConfig.live_lang} onChange={(e) => updateAdvancedConfig("live_lang", e.target.value)} className="w-full max-w-xs rounded-lg border border-white/10 bg-[#090514] px-4 py-2 text-sm text-white focus:border-[#b270ff] outline-none transition cursor-pointer">
                            <option value="fr">Français</option>
                            <option value="en">Anglais</option>
                          </select>
                        </label>
                        <button type="button" className="mt-4 rounded-lg bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-bold text-white transition cursor-pointer">
                          Réinitialiser tous les paramètres de la console
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: STREAM */}
                {activeSettingsTab === "stream" && (
                  <div className="space-y-8 animate-fade-in">
                    <h3 className="text-xl font-bold border-b border-white/10 pb-4">Stream (Flux)</h3>
                    
                    <div className="space-y-6 max-w-xl">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-white/50">Service de Streaming</span>
                        <select value={advancedConfig.live_stream_platform} onChange={(e) => updateAdvancedConfig("live_stream_platform", e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#090514] px-4 py-2.5 text-sm text-white focus:border-[#b270ff] outline-none transition cursor-pointer">
                          <option value="youtube">YouTube - RTMPS</option>
                          <option value="facebook">Facebook Live</option>
                          <option value="custom">Serveur RTMP Personnalisé</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-white/50">Serveur (URL)</span>
                        <input type="text" value={advancedConfig.live_stream_server} onChange={(e) => updateAdvancedConfig("live_stream_server", e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#090514] px-4 py-2.5 text-sm text-white focus:border-[#b270ff] outline-none transition" />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-white/50">Clé de flux (Stream Key)</span>
                        <div className="relative">
                          <input type="password" value={streamKey} onChange={(e) => setStreamKey(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#090514] px-4 py-2.5 text-sm text-white focus:border-[#b270ff] outline-none transition pr-10" />
                          <EyeOff className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                        </div>
                        <p className="mt-2 text-[10px] text-yellow-500/80">⚠️ Ne partagez jamais votre clé de flux avec quiconque.</p>
                      </label>

                      <label className="block pt-4">
                        <span className="mb-1.5 block text-xs font-bold text-white/50">Lien Externe Public (Fallback)</span>
                        <input type="text" value={liveEmbedUrl} onChange={(e) => setLiveEmbedUrl(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#090514] px-4 py-2 text-sm text-white focus:border-[#b270ff] outline-none transition" placeholder="Ex: https://youtu.be/..." />
                      </label>
                    </div>
                  </div>
                )}

                {/* TAB: SORTIE */}
                {activeSettingsTab === "output" && (
                  <div className="space-y-8 animate-fade-in">
                    <h3 className="text-xl font-bold border-b border-white/10 pb-4">Sortie & Encodage</h3>
                    
                    <div className="space-y-6 max-w-xl">
                      <div className="grid grid-cols-2 gap-6">
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-bold text-white/50">Débit Vidéo (Bitrate)</span>
                          <div className="flex items-center gap-2">
                            <input type="number" step="100" value={advancedConfig.live_video_bitrate} onChange={(e) => updateAdvancedConfig("live_video_bitrate", e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#090514] px-4 py-2 text-sm text-white focus:border-[#b270ff] outline-none transition" />
                            <span className="text-sm text-white/50">Kbps</span>
                          </div>
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-bold text-white/50">Débit Audio</span>
                          <select value={advancedConfig.live_audio_bitrate} onChange={(e) => updateAdvancedConfig("live_audio_bitrate", e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#090514] px-4 py-2 text-sm text-white focus:border-[#b270ff] outline-none transition cursor-pointer">
                            <option value="128">128 Kbps</option>
                            <option value="160">160 Kbps</option>
                            <option value="192">192 Kbps</option>
                            <option value="320">320 Kbps</option>
                          </select>
                        </label>
                      </div>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-white/50">Profil d'encodage (CPU Usage)</span>
                        <select value={advancedConfig.live_encoder_profile} onChange={(e) => updateAdvancedConfig("live_encoder_profile", e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#090514] px-4 py-2 text-sm text-white focus:border-[#b270ff] outline-none transition cursor-pointer">
                          <option value="veryfast">veryfast (Faible utilisation CPU)</option>
                          <option value="fast">fast</option>
                          <option value="medium">medium</option>
                          <option value="slow">slow (Qualité max, CPU très élevé)</option>
                        </select>
                      </label>

                      <div className="border-t border-white/10 pt-6 space-y-4">
                        <h4 className="text-sm font-bold text-[#b270ff] uppercase tracking-wider">Enregistrement Local</h4>
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-bold text-white/50">Chemin d'enregistrement</span>
                          <div className="flex gap-2">
                            <input type="text" value={advancedConfig.live_record_path} onChange={(e) => updateAdvancedConfig("live_record_path", e.target.value)} className="flex-1 rounded-lg border border-white/10 bg-[#090514] px-4 py-2 text-sm text-white focus:border-[#b270ff] outline-none transition" />
                            <button type="button" className="bg-white/10 hover:bg-white/20 rounded-lg px-4 text-sm font-semibold transition cursor-pointer">Parcourir</button>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: AUDIO */}
                {activeSettingsTab === "audio" && (
                  <div className="space-y-8 animate-fade-in">
                    <h3 className="text-xl font-bold border-b border-white/10 pb-4">Périphériques Audio</h3>
                    
                    <div className="space-y-6 max-w-xl">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-white/50">Microphone / Entrée Auxiliaire principale</span>
                        <select value={advancedConfig.live_audio_mic} onChange={(e) => updateAdvancedConfig("live_audio_mic", e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#090514] px-4 py-2 text-sm text-white focus:border-[#b270ff] outline-none transition cursor-pointer">
                          <option value="default">Périphérique par défaut</option>
                          <option value="line1">Ligne In 1 (Interface Focusrite)</option>
                          <option value="mic1">Microphone USB</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-white/50">Périphérique de Monitoring (Régie)</span>
                        <select value={advancedConfig.live_audio_monitor} onChange={(e) => updateAdvancedConfig("live_audio_monitor", e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#090514] px-4 py-2 text-sm text-white focus:border-[#b270ff] outline-none transition cursor-pointer">
                          <option value="default">Haut-parleurs par défaut</option>
                          <option value="headphones">Casque Régie</option>
                        </select>
                      </label>

                      <div className="space-y-4 pt-4 border-t border-white/10">
                        <label className="block">
                          <span className="mb-2 flex justify-between text-xs font-bold text-white/50">
                            Gain Global
                            <span className="text-white">{advancedConfig.live_audio_gain} dB</span>
                          </span>
                          <input type="range" min="-30" max="30" value={advancedConfig.live_audio_gain} onChange={(e) => updateAdvancedConfig("live_audio_gain", Number(e.target.value))} className="w-full accent-[#b270ff] cursor-pointer" />
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer pt-4">
                          <input type="checkbox" checked={advancedConfig.live_noise_suppression} onChange={(e) => updateAdvancedConfig("live_noise_suppression", e.target.checked)} className="size-4 rounded border-white/20 bg-black/40 text-[#b270ff] focus:ring-[#b270ff] cursor-pointer" />
                          <span className="text-sm font-medium">Activer l'atténuation du bruit (RNNoise)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: VIDEO */}
                {activeSettingsTab === "video" && (
                  <div className="space-y-8 animate-fade-in">
                    <h3 className="text-xl font-bold border-b border-white/10 pb-4">Vidéo</h3>
                    
                    <div className="space-y-6 max-w-xl">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-white/50">Résolution de Base (Canevas Régie)</span>
                        <select value={advancedConfig.live_base_resolution} onChange={(e) => updateAdvancedConfig("live_base_resolution", e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#090514] px-4 py-2 text-sm text-white focus:border-[#b270ff] outline-none transition cursor-pointer">
                          <option value="1920x1080">1920x1080</option>
                          <option value="1280x720">1280x720</option>
                          <option value="3840x2160">3840x2160 (4K)</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-white/50">Résolution de Sortie (Mise à l'échelle)</span>
                        <select value={advancedConfig.live_output_resolution} onChange={(e) => updateAdvancedConfig("live_output_resolution", e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#090514] px-4 py-2 text-sm text-white focus:border-[#b270ff] outline-none transition cursor-pointer">
                          <option value="1920x1080">1920x1080</option>
                          <option value="1280x720">1280x720</option>
                          <option value="854x480">854x480</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-white/50">Valeur FPS (Images par seconde)</span>
                        <select value={advancedConfig.live_fps} onChange={(e) => updateAdvancedConfig("live_fps", e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#090514] px-4 py-2 text-sm text-white focus:border-[#b270ff] outline-none transition cursor-pointer">
                          <option value="30">30 FPS</option>
                          <option value="60">60 FPS</option>
                        </select>
                      </label>
                    </div>
                  </div>
                )}

                {/* TAB: HOTKEYS */}
                {activeSettingsTab === "hotkeys" && (
                  <div className="space-y-8 animate-fade-in">
                    <h3 className="text-xl font-bold border-b border-white/10 pb-4">Raccourcis clavier</h3>
                    
                    <div className="space-y-4 max-w-2xl">
                      {[
                        { action: "Passer à l'antenne / Direct", key: "Espace" },
                        { action: "Écran Vide (Couper Overlay)", key: "Échap" },
                        { action: "Verset Suivant", key: "Flèche Bas" },
                        { action: "Verset Précédent", key: "Flèche Haut" },
                        { action: "Focus sur la Recherche", key: "Ctrl + F" },
                      ].map((hk, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition">
                          <span className="text-sm font-semibold">{hk.action}</span>
                          <button type="button" className="bg-[#090514] border border-white/10 px-4 py-1.5 rounded text-xs font-mono text-[#b270ff] hover:bg-white/5 transition cursor-pointer">
                            {hk.key}
                          </button>
                        </div>
                      ))}
                      <p className="text-xs text-white/40 italic mt-4 text-center">Cliquez sur un raccourci pour le réassigner.</p>
                    </div>
                  </div>
                )}

                {/* TAB: ACCESSIBILITY */}
                {activeSettingsTab === "accessibility" && (
                  <div className="space-y-8 animate-fade-in">
                    <h3 className="text-xl font-bold border-b border-white/10 pb-4">Accessibilité & Ergonomie</h3>
                    
                    <div className="space-y-6 max-w-xl">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-white/50">Contraste de la Régie</span>
                        <select value={advancedConfig.live_ui_contrast} onChange={(e) => updateAdvancedConfig("live_ui_contrast", e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#090514] px-4 py-2 text-sm text-white focus:border-[#b270ff] outline-none transition cursor-pointer">
                          <option value="normal">Normal (Défaut)</option>
                          <option value="high">Contraste Élevé</option>
                          <option value="dimmed">Sombre (Fatigue oculaire réduite)</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-white/50">Taille du Texte de l'Interface</span>
                        <select value={advancedConfig.live_ui_text_size} onChange={(e) => updateAdvancedConfig("live_ui_text_size", e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#090514] px-4 py-2 text-sm text-white focus:border-[#b270ff] outline-none transition cursor-pointer">
                          <option value="small">Petit</option>
                          <option value="medium">Moyen (Défaut)</option>
                          <option value="large">Grand</option>
                        </select>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer pt-4 border-t border-white/10">
                        <input type="checkbox" checked={advancedConfig.live_audio_cues} onChange={(e) => updateAdvancedConfig("live_audio_cues", e.target.checked)} className="size-4 rounded border-white/20 bg-black/40 text-[#b270ff] focus:ring-[#b270ff] cursor-pointer" />
                        <span className="text-sm font-medium">Activer les retours sonores (Bips de transition, Erreurs)</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* TAB: ADVANCED */}
                {activeSettingsTab === "advanced" && (
                  <div className="space-y-8 animate-fade-in">
                    <h3 className="text-xl font-bold border-b border-white/10 pb-4">Avancé</h3>
                    
                    <div className="space-y-6 max-w-xl">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-white/50">Priorité du Processus</span>
                        <select value={advancedConfig.live_process_priority} onChange={(e) => updateAdvancedConfig("live_process_priority", e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#090514] px-4 py-2 text-sm text-white focus:border-[#b270ff] outline-none transition cursor-pointer">
                          <option value="high">Haute (Recommandé)</option>
                          <option value="normal">Normale</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-white/50">Délai du flux (Stream Delay) - Secondes</span>
                        <input type="number" min="0" max="60" value={advancedConfig.live_stream_delay} onChange={(e) => updateAdvancedConfig("live_stream_delay", Number(e.target.value))} className="w-full rounded-lg border border-white/10 bg-[#090514] px-4 py-2 text-sm text-white focus:border-[#b270ff] outline-none transition" />
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={advancedConfig.live_auto_reconnect} onChange={(e) => updateAdvancedConfig("live_auto_reconnect", e.target.checked)} className="size-4 rounded border-white/20 bg-black/40 text-[#b270ff] focus:ring-[#b270ff] cursor-pointer" />
                        <span className="text-sm font-medium">Reconnexion automatique en cas de coupure</span>
                      </label>

                      <label className="block pt-4 border-t border-white/10">
                        <span className="mb-1.5 block text-xs font-bold text-white/50">Gestion du Cache Base de Données</span>
                        <select value={advancedConfig.live_db_cache} onChange={(e) => updateAdvancedConfig("live_db_cache", e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#090514] px-4 py-2 text-sm text-white focus:border-[#b270ff] outline-none transition cursor-pointer">
                          <option value="aggressive">Agressif (Temps réel ultra rapide)</option>
                          <option value="balanced">Équilibré</option>
                          <option value="minimal">Minimal (Plus de requêtes serveur)</option>
                        </select>
                      </label>
                    </div>
                  </div>
                )}
                
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modal to turn off live stream */}
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
              <p className="text-xs text-white/50">Faites glisser le conteneur pour le déplacer. Ajustez ses dimensions à l'aide des poignées d'ancrage aux coins.</p>
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
                Fermer l'éditeur
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
              1920 x 1080 | SIMULATEUR D'OVERLAY
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
                  {preview?.text || "Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle."}
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

/* ── Sub-components ─────────────────────────────────────────────── */

const DECK_BG: Record<string, string> = {
  gradient_purple: "bg-gradient-to-br from-[#1b0f3a] via-[#160f33] to-[#0b0720]",
  blur: "bg-white/5 backdrop-blur",
  solid_dark: "bg-[#0b0720]",
  none: "bg-black/40",
};

function Deck({
  label,
  tone,
  verse,
  settings,
  mini = false,
  onFullscreen,
}: {
  label: string;
  tone: "live" | "preview";
  verse: ScriptureVerse | null;
  settings: StudioSettings;
  mini?: boolean;
  onFullscreen?: () => void;
}) {
  // We scale down fonts and paddings for miniature rendering inside the Deck
  const scaleFactor = mini ? 0.35 : 0.45;
  const scaledContainerStyle: React.CSSProperties = {
    ...getContainerStyle(settings),
    padding: `${Math.round(settings.containerPaddingY * scaleFactor)}px ${Math.round(settings.containerPaddingX * scaleFactor)}px`,
    borderRadius: settings.containerShape === "capsule" ? "9999px" : (settings.containerShape === "rectangle" ? "0px" : `${Math.round(settings.containerBorderRadius * scaleFactor)}px`),
    borderWidth: `${Math.max(1, Math.round(settings.containerBorderWidth * scaleFactor))}px`,
    position: "absolute",
    left: "5%",
    right: "5%",
    width: "90%",
    bottom: "6%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    maxHeight: "85%",
  };

  const scaleFont = (size: number) => `${Math.max(8, Math.round(size * scaleFactor))}px`;
  const scaleSpacing = (spacing: number) => `${spacing * scaleFactor}px`;

  const refStyle: React.CSSProperties = {
    ...getElementStyle("fontRef", settings),
    fontSize: scaleFont(settings.fontRefSize),
    letterSpacing: scaleSpacing(settings.fontRefSpacing),
    lineHeight: 1.1,
    marginBottom: "4px",
  };

  const bodyStyle: React.CSSProperties = {
    ...getElementStyle("fontBody", settings),
    fontSize: scaleFont(settings.fontBodySize),
    letterSpacing: scaleSpacing(settings.fontBodySpacing),
    lineHeight: 1.2,
  };

  const verStyle: React.CSSProperties = {
    ...getElementStyle("fontVer", settings),
    fontSize: scaleFont(settings.fontVerSize),
    letterSpacing: scaleSpacing(settings.fontVerSpacing),
    lineHeight: 1.1,
    marginTop: "2px",
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-1 relative",
        tone === "live" ? "border-live/40 bg-live/[0.06]" : "border-white/12 bg-white/[0.03]",
      )}
    >
      <div className="flex items-center justify-between px-3 py-1">
        <div className="flex items-center gap-2">
          <span className={cn("text-[10px] font-bold tracking-[0.18em] uppercase", tone === "live" ? "text-live" : "text-white/40")}>
            {label}
          </span>
          {onFullscreen && (
            <button
              type="button"
              onClick={onFullscreen}
              className="text-white/40 hover:text-white transition cursor-pointer"
              title="Agrandir en plein écran"
            >
              <Maximize className="size-3" />
            </button>
          )}
        </div>
        {verse && <span className="text-[11px] font-bold text-[#e2b85f]">{verse.reference}</span>}
      </div>
      
      <div className={cn(
        "relative grid h-[110px] sm:h-[130px] md:h-[150px] w-full place-items-center overflow-hidden rounded-xl bg-black/50 border border-white/5",
        DECK_BG[settings.background] ?? DECK_BG.gradient_purple
      )}>
        {verse ? (
          <div style={scaledContainerStyle} className="shadow-lg text-center">
            <span style={refStyle} className="block font-bold">
              {verse.reference}
            </span>
            <div className="w-full">
              <p style={bodyStyle} className="line-clamp-2 leading-tight">
                {verse.text}
              </p>
              <span style={verStyle} className="block italic mt-0.5">
                {verse.texts ? Object.keys(verse.texts)[0] : (verse.translation || "LSG")}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-[10px] font-semibold text-white/25">{tone === "live" ? "Rien à l’antenne" : "Sélectionnez un verset"}</span>
        )}
      </div>
    </div>
  );
}

function Selector({
  icon: Icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-[11px] font-bold tracking-wider text-white/50 uppercase">
        <Icon className="size-3.5" /> {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer appearance-none rounded-xl border border-white/12 bg-[#0d0820] px-3.5 py-2.5 text-sm font-semibold text-white outline-none transition focus:border-[#e2b85f]"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#0d0820]">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronRight className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 rotate-90 text-white/40" />
      </div>
    </label>
  );
}
