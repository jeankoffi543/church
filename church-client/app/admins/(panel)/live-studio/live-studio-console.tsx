"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  searchBible,
  navigateBible,
  getBibleTranslations,
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

export function LiveStudioConsole({
  initialPrepared,
  initialSettings,
}: {
  initialPrepared: ScriptureVerse[];
  initialSettings: Record<string, Record<string, unknown>>;
}) {
  // Navigation & UI States
  const [activeLeftTab, setActiveLeftTab] = useState<"bible" | "flux" | "chants">("bible");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ScriptureVerse[]>([]);
  const [searching, setSearching] = useState(false);

  // Dynamic versions/translations selection
  const [allTranslations, setAllTranslations] = useState<string[]>([]);
  const [visibleTranslationsCount, setVisibleTranslationsCount] = useState(10);
  const [translationSearch, setTranslationSearch] = useState("");

  const [preview, setPreview] = useState<ScriptureVerse | null>(null);
  const [live, setLive] = useState<ScriptureVerse | null>(null);
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_STUDIO_SETTINGS);

  const [prepared, setPrepared] = useState<ScriptureVerse[]>(initialPrepared);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

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
  const [sermonReference, setSermonReference] = useState((liveSettings.live_sermon_reference as string) ?? "");
  const [sermonPoints, setSermonPoints] = useState<Array<{ id: string; text: string; verse: string }>>(
    (liveSettings.live_sermon_points as Array<{ id: string; text: string; verse: string }>) ?? []
  );

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
      if (liveRef.current) void broadcastScripture({ action: "show", verse: liveRef.current, settings });
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
        { key: "live_sermon_reference", value: sermonReference, group: "live" },
        { key: "live_sermon_points", value: sermonPoints, group: "live" },
        { key: "bible_visible_versions", value: visibleVersions, group: "live" },
        { key: "bible_default_version", value: defaultVersion, group: "live" },
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
          <div>
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#e2b85f] uppercase">Régie Live</span>
            <h1 className="font-display text-2xl leading-tight font-bold text-white italic">MFM Studio Control</h1>
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

      {status && (
        <div
          className={cn(
            "mb-4 flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-semibold",
            status.type === "success"
              ? "border-online/30 bg-online/10 text-online"
              : "border-live/30 bg-live/10 text-[#ff9a9a]",
          )}
        >
          {status.type === "success" ? <CheckCircle className="size-4" /> : <AlertCircle className="size-4" />}
          {status.message}
        </div>
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
          <Deck label="À l’antenne" tone="live" verse={live} settings={settings} mini />
          <Deck label="En attente (preview)" tone="preview" verse={preview} settings={settings} />

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
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/10 border border-white/12 px-4 py-2.5 text-xs font-extrabold tracking-wide text-white/80 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <EyeOff className="size-3.5" /> ÉCRAN VIDE
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
        <aside className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <span className="text-[11px] font-bold tracking-wider text-white/50 uppercase">Studio · Style</span>

          <Selector icon={ImageIcon} label="Disposition" value={settings.layout} options={LAYOUTS} onChange={(v) => setStudio("layout", v as StudioLayout)} />
          <Selector icon={Sparkles} label="Animation Overlay" value={settings.animation} options={ANIMATIONS} onChange={(v) => setStudio("animation", v as StudioAnimation)} />
          <Selector icon={Type} label="Police de caractère" value={settings.font} options={FONTS.map((f) => ({ value: f, label: f }))} onChange={(v) => setStudio("font", v)} />
          <Selector icon={ImageIcon} label="Style visuel" value={settings.background} options={BACKGROUNDS} onChange={(v) => setStudio("background", v)} />

          <div>
            <label className="mb-2 flex items-center justify-between text-[11px] font-bold tracking-wider text-white/50 uppercase">
              <span className="flex items-center gap-2">
                <Clock className="size-3.5" /> Durée auto
              </span>
              <span className="text-[#e2b85f]">{settings.duration === 0 ? "Manuel" : `${settings.duration}s`}</span>
            </label>
            <input
              type="range"
              min={0}
              max={60}
              step={5}
              value={settings.duration}
              onChange={(e) => setStudio("duration", Number(e.target.value))}
              className="w-full accent-[#e2b85f]"
            />
            <p className="mt-1 text-[10px] text-white/30">0 = reste affiché jusqu’au masquage manuel.</p>
          </div>
        </aside>
      </div>

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
}: {
  label: string;
  tone: "live" | "preview";
  verse: ScriptureVerse | null;
  settings: StudioSettings;
  mini?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-1",
        tone === "live" ? "border-live/40 bg-live/[0.06]" : "border-white/12 bg-white/[0.03]",
      )}
    >
      <div className="flex items-center justify-between px-3 py-1">
        <span className={cn("text-[10px] font-bold tracking-[0.18em] uppercase", tone === "live" ? "text-live" : "text-white/40")}>
          {label}
        </span>
        {verse && <span className="text-[11px] font-bold text-[#e2b85f]">{verse.reference}</span>}
      </div>
      {/* Expanded preview of what the faithful see, taking all available space with container padding */}
      <div className={cn("relative grid h-[90px] sm:h-[110px] md:h-[130px] w-full place-items-center overflow-hidden rounded-xl px-4 py-2", DECK_BG[settings.background] ?? DECK_BG.gradient_purple)}>
        {verse ? (
          <div
            className={cn(
              "text-center w-full",
              settings.layout === "lower_third" && "absolute inset-x-0 bottom-2 px-4",
              settings.layout === "sidebar" && "absolute inset-y-2 right-4 flex w-1/2 flex-col justify-center text-left px-0",
            )}
          >
            {verse.texts && Object.keys(verse.texts).length > 1 ? (
              <div className={cn("space-y-1.5 text-left w-full overflow-y-auto px-1.5", mini ? "max-h-[60px] sm:max-h-[75px]" : "max-h-[65px] sm:max-h-[85px]")}>
                {Object.entries(verse.texts).map(([ver, txt]) => (
                  <div key={ver} className="border-l border-[#e2b85f]/40 pl-1.5 py-0.5">
                    <p className={cn("text-white leading-tight", mini ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-[11px]")}>{txt}</p>
                    <span className="block text-[8px] font-semibold text-[#e2b85f] italic mt-0.5">{ver}</span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <span className="text-[8px] sm:text-[9px] font-bold tracking-[0.2em] text-[#e2b85f] uppercase">{verse.reference}</span>
                <p
                  className={cn(
                    "mt-0.5 leading-snug text-white",
                    settings.font === "Plus Jakarta Sans" ? "font-sans" : "font-display italic",
                    mini ? "line-clamp-2 text-[10px] sm:text-[11px]" : "line-clamp-3 text-[11px] sm:text-[12px]",
                  )}
                >
                  {verse.text}
                </p>
                <span className="block mt-0.5 text-[8px] sm:text-[9px] font-semibold text-[#e2b85f] italic">
                  {verse.texts ? Object.keys(verse.texts)[0] : (verse.translation || "LSG")}
                </span>
              </>
            )}
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
