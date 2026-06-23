"use client";

import React, { useState, useTransition, useMemo, useRef, useEffect } from "react";
import * as Lucide from "lucide-react";
import {
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Search,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  HelpCircle,
  Users,
  Camera,
  X,
  Compass
} from "lucide-react";
import { updateAdminChurchVision, type AdminChurchVision, type AdminUserOption } from "@/lib/admin-api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrandButton } from "@/components/ui/brand-button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type ChurchVisionFormProps = {
  churchPillarsVision: AdminChurchVision["church_pillars_vision"];
  churchPastoralTeam: AdminChurchVision["church_pastoral_team"];
  users: AdminUserOption[];
};

// Curated list of popular spiritual, ministry, and helper icons for quick visual select
const CURATED_ICONS = [
  "Flame", "ShieldCheck", "HeartHandshake", "BookOpen", "Crown", "Globe", "Award", "Anchor", "Key", "Lightbulb",
  "Compass", "Gift", "MapPin", "Activity", "Sparkles", "Star", "Sword", "Users", "Bell", "Calendar", "Music", "Home",
  "Heart", "Shield", "Smile", "Book", "Bookmark", "Clock", "Cloud", "HelpCircle", "Mail", "MessageCircle", "Play",
  "Settings", "Share2", "ThumbsUp", "Tv", "Target", "Radio", "Link", "Coffee", "Sun", "Moon", "Wind", "ShieldAlert",
  "CheckCircle2", "UserCheck", "Sunrise", "Map", "Lock", "Fingerprint", "HeartPulse", "Crosshair", "Sparkle", "Zap",
  "SunDim", "Trees", "Eye", "BookOpenCheck"
];

function IconPreview({ name, className }: { name: string; className?: string }) {
  const IconComp = (Lucide as any)[name];
  if (!IconComp) return <Lucide.HelpCircle className={className} />;
  return <IconComp className={className} />;
}

export function ChurchVisionForm({
  churchPillarsVision,
  churchPastoralTeam,
  users,
}: ChurchVisionFormProps) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Tab 1: Piliers de Foi State ---
  const [pillarsTitle, setPillarsTitle] = useState(churchPillarsVision?.title ?? "Notre Vision Spirituelle");
  const [pillarsIntro, setPillarsIntro] = useState(
    churchPillarsVision?.intro ?? "Nous sommes appelés à bâtir des vies de feu, ancrées dans la sainteté..."
  );
  const [pillars, setPillars] = useState<
    Array<{
      title: string;
      desc: string;
      icon_name: string;
    }>
  >(
    churchPillarsVision?.pillars ?? [
      { title: "La Parole Révélée", desc: "Un enseignement biblique pur...", icon_name: "ShieldCheck" },
      { title: "La Prière de Feu", desc: "L'intercession prophétique...", icon_name: "Flame" },
    ]
  );

  // Pillar icon visual selector states
  const [activeIconPickerIndex, setActiveIconPickerIndex] = useState<number | null>(null);
  const [iconSearchQuery, setIconSearchQuery] = useState("");
  const iconPickerRef = useRef<HTMLDivElement>(null);

  // --- Tab 2: Équipe Pastorale State ---
  const [teamTitle, setTeamTitle] = useState(churchPastoralTeam?.title ?? "L'Équipe Pastorale");
  const [teamIntro, setTeamIntro] = useState(
    churchPastoralTeam?.intro ?? "Des bergers consacrés pour vous accompagner..."
  );
  const [selectedIds, setSelectedIds] = useState<number[]>(churchPastoralTeam?.member_ids ?? []);
  
  // Avatars map from DB
  const [pastorAvatars, setPastorAvatars] = useState<Record<number, string | null>>(
    churchPastoralTeam?.avatars ?? {}
  );
  
  // Custom file upload states per pastor
  const [avatarFiles, setAvatarFiles] = useState<Record<number, File>>({});
  const [localPreviews, setLocalPreviews] = useState<Record<number, string>>({});
  const [deletedAvatarIds, setDeletedAvatarIds] = useState<number[]>([]);

  // Search combobox state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const ASSET_BASE = API_URL.replace(/\/api\/v1\/?$/, "");

  const getFullPhotoUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith("data:") || path.startsWith("blob:")) return path; // local preview
    if (/^https?:\/\//i.test(path)) return path;
    return `${ASSET_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  // Close selectors when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (iconPickerRef.current && !iconPickerRef.current.contains(event.target as Node)) {
        setActiveIconPickerIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const clearAlerts = () => {
    setSuccess(null);
    setError(null);
  };

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  // Filter Lucide icons list based on query
  const filteredIcons = useMemo(() => {
    const q = iconSearchQuery.toLowerCase().trim();
    if (!q) return CURATED_ICONS;
    return CURATED_ICONS.filter((icon) => icon.toLowerCase().includes(q));
  }, [iconSearchQuery]);

  // Map of users for fast lookup
  const userMap = useMemo(() => {
    return new Map(users.map((u) => [u.id, u]));
  }, [users]);

  // List of selected pastors ordered according to selectedIds
  const orderedPastors = useMemo(() => {
    return selectedIds
      .map((id) => userMap.get(id))
      .filter((u): u is AdminUserOption => !!u);
  }, [selectedIds, userMap]);

  // Pillar list handlers
  const handleAddPillar = () => {
    clearAlerts();
    setPillars((prev) => [...prev, { title: "", desc: "", icon_name: "Flame" }]);
  };

  const handleRemovePillar = (index: number) => {
    clearAlerts();
    setPillars((prev) => prev.filter((_, i) => i !== index));
    if (activeIconPickerIndex === index) {
      setActiveIconPickerIndex(null);
    }
  };

  const handlePillarChange = (
    index: number,
    field: "title" | "desc" | "icon_name",
    value: string
  ) => {
    clearAlerts();
    setPillars((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value,
      };
      return copy;
    });
  };

  // Pastor selection handlers
  const togglePastor = (id: number) => {
    clearAlerts();
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    clearAlerts();
    setSelectedIds((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const moveDown = (index: number) => {
    if (index === selectedIds.length - 1) return;
    clearAlerts();
    setSelectedIds((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  // Pastor Avatar file selection
  const handleAvatarChange = (userId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    clearAlerts();
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setAvatarFiles((prev) => ({ ...prev, [userId]: file }));

      // local preview object url
      const previewUrl = URL.createObjectURL(file);
      setLocalPreviews((prev) => ({ ...prev, [userId]: previewUrl }));

      // Undelete if queued
      setDeletedAvatarIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  const handleAvatarRemove = (userId: number) => {
    clearAlerts();

    // Revoke local preview if exists
    if (localPreviews[userId]) {
      URL.revokeObjectURL(localPreviews[userId]);
      setLocalPreviews((prev) => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
    }

    // Remove file from files mapping
    if (avatarFiles[userId]) {
      setAvatarFiles((prev) => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
    }

    // Queue for server delete if it had a previous server image
    if (pastorAvatars[userId]) {
      setDeletedAvatarIds((prev) => [...prev, userId]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();

    // Validations
    if (!pillarsTitle.trim()) {
      setError("Le titre de la vision est requis.");
      return;
    }
    if (!pillarsIntro.trim()) {
      setError("L'introduction générale des piliers est requise.");
      return;
    }
    if (pillars.some((p) => !p.title.trim() || !p.desc.trim())) {
      setError("Tous les piliers de foi doivent avoir un titre et une description.");
      return;
    }
    if (!teamTitle.trim()) {
      setError("Le titre de l'équipe pastorale est requis.");
      return;
    }
    if (!teamIntro.trim()) {
      setError("L'introduction de l'équipe pastorale est requise.");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();

        const pillarsPayload = {
          title: pillarsTitle.trim(),
          intro: pillarsIntro.trim(),
          pillars: pillars.map((p) => ({
            title: p.title.trim(),
            desc: p.desc.trim(),
            icon_name: p.icon_name,
          })),
        };

        const teamPayload = {
          title: teamTitle.trim(),
          intro: teamIntro.trim(),
          member_ids: selectedIds,
        };

        formData.append("church_pillars_vision", JSON.stringify(pillarsPayload));
        formData.append("church_pastoral_team", JSON.stringify(teamPayload));
        formData.append("deleted_avatars", JSON.stringify(deletedAvatarIds));

        // Append custom files
        Object.entries(avatarFiles).forEach(([userId, file]) => {
          formData.append(`avatar_${userId}`, file);
        });

        const res = await updateAdminChurchVision(formData);

        // Update state
        if (res.church_pastoral_team?.avatars) {
          setPastorAvatars(res.church_pastoral_team.avatars);
        }
        
        // Clean up temporary uploads & deletes
        setAvatarFiles({});
        setLocalPreviews({});
        setDeletedAvatarIds([]);

        setSuccess(res.message || "Vision et équipe pastorale sauvegardées avec succès !");
      } catch (err) {
        setError((err as Error).message || "Une erreur est survenue lors de la sauvegarde.");
      }
    });
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-8 border-b border-[rgba(40,25,80,0.06)] pb-5">
        <h1 className="font-display text-3xl font-extrabold text-indigo italic">
          Vision &amp; Équipe Pastorale
        </h1>
        <p className="text-sm text-body mt-1">
          Gérez dynamiquement la vision de foi (piliers) et les comptes ou photos de l&apos;équipe pastorale.
        </p>
      </div>

      {/* Alerts */}
      <div className="space-y-3 mb-6">
        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-800 animate-in fade-in slide-in-from-top-3">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
            <p className="text-sm font-semibold">{success}</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-800 animate-in fade-in slide-in-from-top-3">
            <AlertCircle className="size-5 shrink-0 text-red-600" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Tabs defaultValue="pillars" className="w-full">
          <TabsList className="grid grid-cols-2 max-w-2xl mb-8 bg-indigo-mid/5 p-1 border border-indigo-mid/10 rounded-xl h-11">
            <TabsTrigger value="pillars" className="rounded-lg font-bold text-xs uppercase tracking-wider py-2">
              Piliers de Foi
            </TabsTrigger>
            <TabsTrigger value="pastors" className="rounded-lg font-bold text-xs uppercase tracking-wider py-2">
              Équipe Pastorale ({selectedIds.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PILIERS DE FOI */}
          <TabsContent value="pillars" className="space-y-6 animate-in fade-in duration-200">
            <div className="rounded-2xl border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-sm space-y-6">
              <h3 className="font-display text-lg font-bold text-indigo italic border-b pb-3">
                Configuration Générale de la Vision
              </h3>

              <div className="grid grid-cols-1 gap-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="pillars_title" className="text-xs font-bold text-indigo uppercase tracking-wider">
                    Titre Principal de la Vision
                  </label>
                  <Input
                    id="pillars_title"
                    value={pillarsTitle}
                    onChange={(e) => { clearAlerts(); setPillarsTitle(e.target.value); }}
                    placeholder="Notre Vision Spirituelle"
                    className="h-11 rounded-xl border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 text-sm text-indigo focus-visible:border-gold"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="pillars_intro" className="text-xs font-bold text-indigo uppercase tracking-wider">
                    Introduction générale
                  </label>
                  <Textarea
                    id="pillars_intro"
                    value={pillarsIntro}
                    onChange={(e) => { clearAlerts(); setPillarsIntro(e.target.value); }}
                    placeholder="Décrivez brièvement la vision spirituelle de l'église..."
                    rows={3}
                    className="rounded-xl border-[rgba(40,25,80,0.12)] bg-[#faf8f4] p-3.5 text-sm text-indigo focus-visible:border-gold"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-display text-lg font-bold text-indigo italic">
                  Les Piliers Individuels
                </h3>
                <button
                  type="button"
                  onClick={handleAddPillar}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo/5 px-3 py-1.5 text-xs font-bold text-indigo transition hover:bg-indigo/10 cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  Ajouter un pilier
                </button>
              </div>

              {pillars.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
                  <HelpCircle className="size-8 text-faint mb-2" />
                  <p className="text-sm font-semibold text-indigo">Aucun pilier de foi</p>
                  <p className="text-xs text-faint mt-1">
                    Cliquez sur &quot;Ajouter un pilier&quot; ci-dessus pour commencer.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {pillars.map((pillar, index) => (
                    <div
                      key={index}
                      className="group relative rounded-xl border border-[rgba(40,25,80,0.06)] bg-[#faf8f4]/30 p-5 space-y-4 transition hover:border-[rgba(40,25,80,0.12)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <span className="flex size-7 items-center justify-center rounded-full bg-indigo/5 text-xs font-bold text-indigo">
                          #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemovePillar(index)}
                          className="flex size-7 items-center justify-center rounded-lg text-faint hover:bg-red-50 hover:text-live transition cursor-pointer"
                          title="Supprimer ce pilier"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-4">
                        {/* Title */}
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-indigo/60 uppercase tracking-wider">
                            Titre du Pilier
                          </label>
                          <Input
                            value={pillar.title}
                            onChange={(e) => handlePillarChange(index, "title", e.target.value)}
                            placeholder="Ex: La Parole Révélée"
                            className="h-10 rounded-lg border-[rgba(40,25,80,0.12)] bg-white px-3.5 text-sm text-indigo focus-visible:border-gold"
                          />
                        </div>

                        {/* Interactive Visual Icon Selector */}
                        <div className="flex flex-col gap-2 relative">
                          <label className="text-[10px] font-bold text-indigo/60 uppercase tracking-wider">
                            Icône Lucide (Choix Visuel)
                          </label>
                          <button
                            type="button"
                            onClick={() => setActiveIconPickerIndex(activeIconPickerIndex === index ? null : index)}
                            className="flex h-10 w-full cursor-pointer items-center gap-3.5 rounded-lg border border-[rgba(40,25,80,0.12)] bg-white px-3.5 text-left text-sm text-indigo hover:border-gold outline-none transition"
                          >
                            <span className="flex size-6 items-center justify-center rounded bg-gold/10 text-gold-dark">
                              <IconPreview name={pillar.icon_name} className="size-4" />
                            </span>
                            <span className="font-semibold truncate">{pillar.icon_name}</span>
                            <ChevronDown className="size-4 ml-auto text-faint" />
                          </button>

                          {/* Float visual dropdown */}
                          {activeIconPickerIndex === index && (
                            <div
                              ref={iconPickerRef}
                              className="absolute z-50 top-full mt-2 w-full min-w-[280px] overflow-hidden rounded-xl border border-[rgba(40,25,80,0.1)] bg-white p-3.5 shadow-[0_12px_40px_rgba(22,15,51,0.14)] animate-in fade-in slide-in-from-top-2 duration-150"
                            >
                              <div className="flex items-center gap-2 border-b border-[rgba(40,25,80,0.08)] pb-2 mb-3">
                                <Search className="size-3.5 text-faint" />
                                <input
                                  autoFocus
                                  value={iconSearchQuery}
                                  onChange={(e) => setIconSearchQuery(e.target.value)}
                                  placeholder="Rechercher une icône..."
                                  className="w-full bg-transparent text-xs text-indigo outline-none placeholder:text-faint"
                                />
                                {iconSearchQuery && (
                                  <button type="button" onClick={() => setIconSearchQuery("")}>
                                    <X className="size-3.5 text-faint hover:text-indigo" />
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto p-0.5">
                                {filteredIcons.map((iconName) => {
                                  const isSelected = pillar.icon_name === iconName;
                                  return (
                                    <button
                                      key={iconName}
                                      type="button"
                                      onClick={() => {
                                        handlePillarChange(index, "icon_name", iconName);
                                        setActiveIconPickerIndex(null);
                                        setIconSearchQuery("");
                                      }}
                                      className={cn(
                                        "flex size-9 cursor-pointer items-center justify-center rounded-lg border border-[rgba(40,25,80,0.06)] bg-white hover:bg-cream hover:border-gold/50 transition",
                                        isSelected && "border-gold bg-gold/15 text-gold-dark font-bold"
                                      )}
                                      title={iconName}
                                    >
                                      <IconPreview name={iconName} className="size-4.5" />
                                    </button>
                                  );
                                })}
                                {filteredIcons.length === 0 && (
                                  <p className="col-span-5 py-3 text-center text-[10px] text-faint">
                                    Aucune icône correspondante.
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-indigo/60 uppercase tracking-wider">
                          Description
                        </label>
                        <Textarea
                          value={pillar.desc}
                          onChange={(e) => handlePillarChange(index, "desc", e.target.value)}
                          placeholder="Ex: Un enseignement biblique pur et sans compromis pour asseoir les fondements..."
                          rows={2}
                          className="rounded-lg border-[rgba(40,25,80,0.12)] bg-white p-3 text-sm text-indigo focus-visible:border-gold"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 2: ÉQUIPE PASTORALE */}
          <TabsContent value="pastors" className="space-y-6 animate-in fade-in duration-200">
            <div className="rounded-2xl border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-sm space-y-6">
              <h3 className="font-display text-lg font-bold text-indigo italic border-b pb-3">
                Configuration de la Section Équipe
              </h3>

              <div className="grid grid-cols-1 gap-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="team_title" className="text-xs font-bold text-indigo uppercase tracking-wider">
                    Titre Principal
                  </label>
                  <Input
                    id="team_title"
                    value={teamTitle}
                    onChange={(e) => { clearAlerts(); setTeamTitle(e.target.value); }}
                    placeholder="L'Équipe Pastorale"
                    className="h-11 rounded-xl border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 text-sm text-indigo focus-visible:border-gold"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="team_intro" className="text-xs font-bold text-indigo uppercase tracking-wider">
                    Introduction générale
                  </label>
                  <Textarea
                    id="team_intro"
                    value={teamIntro}
                    onChange={(e) => { clearAlerts(); setTeamIntro(e.target.value); }}
                    placeholder="Présentez brièvement l'équipe pastorale..."
                    rows={3}
                    className="rounded-xl border-[rgba(40,25,80,0.12)] bg-[#faf8f4] p-3.5 text-sm text-indigo focus-visible:border-gold"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-sm space-y-6">
              <h3 className="font-display text-lg font-bold text-indigo italic border-b pb-3">
                Sélection et Ordre des Pasteurs
              </h3>

              {/* Combobox Searchable Select */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-indigo uppercase tracking-wider">
                  Rechercher et Ajouter des Serviteurs
                </label>
                <div ref={searchContainerRef} className="relative">
                  <div
                    onClick={() => setIsSearchOpen((o) => !o)}
                    className="flex min-h-[46px] w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2 text-sm outline-none transition focus-within:border-gold hover:border-gold"
                  >
                    <span className="flex items-center gap-2 text-faint">
                      <Search className="size-4" />
                      {selectedIds.length > 0
                        ? `${selectedIds.length} pasteur(s) sélectionné(s)`
                        : "Rechercher et cocher des serviteurs dans la base de données..."}
                    </span>
                    <span className="rounded-md bg-indigo/5 px-2 py-0.5 text-[11px] font-bold text-indigo uppercase">
                      Cliquer pour ouvrir
                    </span>
                  </div>

                  {isSearchOpen && (
                    <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-[rgba(40,25,80,0.1)] bg-white shadow-[0_12px_40px_rgba(22,15,51,0.14)] animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="flex items-center gap-2 border-b border-[rgba(40,25,80,0.08)] px-3 py-2">
                        <Search className="size-3.5 text-faint" />
                        <input
                          autoFocus
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Taper le nom ou l'email du membre..."
                          className="w-full bg-transparent text-sm text-indigo outline-none placeholder:text-faint"
                        />
                      </div>
                      <div className="max-h-56 overflow-y-auto p-1.5">
                        {filteredUsers.map((u) => {
                          const isChecked = selectedIds.includes(u.id);
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => togglePastor(u.id)}
                              className={cn(
                                "flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-cream",
                                isChecked && "bg-cream/60"
                              )}
                            >
                              <div className="min-w-0 flex-1">
                                <span className="block truncate font-semibold text-indigo">
                                  {u.name}
                                </span>
                                <span className="block truncate text-xs text-faint">
                                  {u.email}
                                </span>
                              </div>
                              <span
                                className={cn(
                                  "flex size-5 shrink-0 items-center justify-center rounded-[6px] border transition",
                                  isChecked
                                    ? "border-gold bg-gradient-to-br from-gold to-gold-dark text-white"
                                    : "border-[rgba(40,25,80,0.2)] bg-white"
                                )}
                              >
                                {isChecked && <Check className="size-3.5" strokeWidth={3} />}
                              </span>
                            </button>
                          );
                        })}
                        {filteredUsers.length === 0 && (
                          <p className="px-2.5 py-3 text-center text-xs text-faint">
                            Aucun utilisateur actif trouvé.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-faint">
                  Recherchez et cochez les utilisateurs qui composent l&apos;équipe pastorale. Ils apparaîtront ci-dessous dans l&apos;ordre configuré.
                </p>
              </div>

              {/* Ordered list with Move Up / Down controls & Avatar uploaders */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-indigo uppercase tracking-wider block">
                  Ordre d&apos;affichage de l&apos;équipe pastorale &amp; Avatars
                </label>

                {orderedPastors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center bg-[#faf8f4]/20">
                    <Users className="size-8 text-faint mb-2" />
                    <p className="text-sm font-semibold text-indigo">Aucun pasteur sélectionné</p>
                    <p className="text-xs text-faint mt-1">
                      Sélectionnez des membres à l&apos;aide du champ de recherche ci-dessus.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[rgba(40,25,80,0.06)] rounded-xl border border-[rgba(40,25,80,0.08)] bg-[#faf8f4]/20 overflow-hidden">
                    {orderedPastors.map((pastor, index) => {
                      const isFirst = index === 0;
                      const isLast = index === orderedPastors.length - 1;
                      
                      // Resolve avatar preview
                      const hasLocal = !!localPreviews[pastor.id];
                      const localUrl = localPreviews[pastor.id];
                      const serverPath = pastorAvatars[pastor.id];
                      const isDeleted = deletedAvatarIds.includes(pastor.id);
                      
                      const hasAvatar = hasLocal || (!!serverPath && !isDeleted);
                      const finalAvatarUrl = hasLocal ? localUrl : getFullPhotoUrl(serverPath ?? null);

                      // Generate initials fallback
                      const words = pastor.name.split(" ").filter(Boolean);
                      const initials = words.length >= 2
                        ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
                        : pastor.name.slice(0, 2).toUpperCase();

                      return (
                        <div
                          key={pastor.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white transition hover:bg-cream/20"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo/5 text-[10px] font-bold text-indigo">
                              {index + 1}
                            </span>
                            
                            {/* Avatar visual preview circle */}
                            <div className="relative group/avatar size-11 shrink-0">
                              {hasAvatar ? (
                                <img
                                  src={finalAvatarUrl || ""}
                                  alt={pastor.name}
                                  className="size-11 rounded-full object-cover shadow-inner border border-gold/20"
                                />
                              ) : (
                                <div className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-mid to-indigo text-white text-sm font-bold shadow-sm">
                                  {initials}
                                </div>
                              )}
                              
                              {/* Overlay camera trigger */}
                              <label
                                htmlFor={`avatar_input_${pastor.id}`}
                                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white cursor-pointer opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                              >
                                <Camera className="size-4.5" />
                              </label>
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-indigo truncate">{pastor.name}</p>
                              <p className="text-xs text-faint truncate">{pastor.email}</p>
                            </div>
                          </div>

                          {/* Avatar Uploader Controls */}
                          <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
                            {/* Hidden file input */}
                            <input
                              type="file"
                              accept="image/*"
                              id={`avatar_input_${pastor.id}`}
                              onChange={(e) => handleAvatarChange(pastor.id, e)}
                              className="hidden"
                            />
                            
                            <label
                              htmlFor={`avatar_input_${pastor.id}`}
                              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[rgba(40,25,80,0.1)] bg-white px-3 py-1.5 text-xs font-bold text-indigo transition hover:bg-cream/40"
                            >
                              <Camera className="size-3.5" />
                              Importer
                            </label>

                            {hasAvatar && (
                              <button
                                type="button"
                                onClick={() => handleAvatarRemove(pastor.id)}
                                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-live transition hover:bg-red-100"
                                title="Revenir à l'initiale par défaut"
                              >
                                Retirer
                              </button>
                            )}

                            {/* Reordering and remove from team controls */}
                            <div className="flex items-center gap-1 border-l border-[rgba(40,25,80,0.08)] pl-3 ml-1">
                              <button
                                type="button"
                                disabled={isFirst}
                                onClick={() => moveUp(index)}
                                className={cn(
                                  "flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[rgba(40,25,80,0.1)] bg-white text-indigo transition hover:bg-cream/40",
                                  isFirst && "cursor-not-allowed opacity-40 hover:bg-white"
                                )}
                                title="Déplacer vers le haut"
                              >
                                <ChevronUp className="size-4" />
                              </button>
                              <button
                                type="button"
                                disabled={isLast}
                                onClick={() => moveDown(index)}
                                className={cn(
                                  "flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[rgba(40,25,80,0.1)] bg-white text-indigo transition hover:bg-cream/40",
                                  isLast && "cursor-not-allowed opacity-40 hover:bg-white"
                                )}
                                title="Déplacer vers le bas"
                              >
                                <ChevronDown className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePastor(pastor.id)}
                                className="ml-1 flex size-8 cursor-pointer items-center justify-center rounded-lg text-faint hover:bg-red-50 hover:text-live transition"
                                title="Retirer de l'équipe"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[rgba(40,25,80,0.06)] pt-5">
          <BrandButton
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 shadow-sm font-bold py-2.5 px-6 rounded-xl bg-indigo text-white hover:bg-indigo-mid"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Sauvegarder les modifications
          </BrandButton>
        </div>
      </form>
    </div>
  );
}
