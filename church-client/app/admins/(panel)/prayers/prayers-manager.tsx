"use client";

import { useState, useTransition, useCallback } from "react";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  MessageCircle,
  ChevronDown,
  Save,
  Phone,
  Mail,
  User,
  BookHeart,
} from "lucide-react";
import type { AdminPrayerRequest, AdminUser } from "@/lib/admin-api";
import {
  updatePrayerStatus,
  assignPrayer,
  updatePrayer,
  deletePrayer,
  updateAdminSettings,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/* ── Constants ───────────────────────────────────────────────────── */

type StatusFilter = "all" | "new" | "praying" | "answered" | "archived";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "new", label: "Nouvelles" },
  { key: "praying", label: "En prière" },
  { key: "answered", label: "Exaucées" },
  { key: "archived", label: "Archivées" },
];

const STATUS_CONFIG: Record<
  AdminPrayerRequest["status"],
  { label: string; dot: string; bg: string; text: string; pulse?: boolean }
> = {
  new: {
    label: "Nouvelle",
    dot: "bg-live",
    bg: "bg-live/10",
    text: "text-live",
    pulse: true,
  },
  praying: {
    label: "En prière",
    dot: "bg-gold",
    bg: "bg-gold/10",
    text: "text-gold-dark",
  },
  answered: {
    label: "Exaucée",
    dot: "bg-online",
    bg: "bg-online/10",
    text: "text-online",
  },
  archived: {
    label: "Archivée",
    dot: "bg-faint",
    bg: "bg-faint/10",
    text: "text-faint",
  },
};

/* ── Component ───────────────────────────────────────────────────── */

export function PrayersManager({
  initialPrayers,
  users,
  initialSuccessMessage,
  initialNotificationMessage,
  initialCategories,
}: {
  initialPrayers: AdminPrayerRequest[];
  users: AdminUser[];
  initialSuccessMessage: string;
  initialNotificationMessage: string;
  initialCategories: string[];
}) {
  const [prayers, setPrayers] = useState<AdminPrayerRequest[]>(initialPrayers);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Panel-local form state
  const [panelNotes, setPanelNotes] = useState("");

  // Configuration tab state
  const [activeTab, setActiveTab] = useState<"list" | "config">("list");
  const [successMessage, setSuccessMessage] = useState(initialSuccessMessage);
  const [notificationMessage, setNotificationMessage] = useState(initialNotificationMessage);
  const [categories, setCategories] = useState<string[]>(
    initialCategories.length > 0
      ? initialCategories
      : ["Délivrance", "Santé", "Finances", "Famille", "Destinée", "Autre"]
  );

  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const handleTabChange = (tab: "list" | "config") => {
    setActiveTab(tab);
    setStatus(null);
  };

  const selected = prayers.find((p) => p.id === selectedId) ?? null;

  /* helpers */
  const openPanel = useCallback(
    (prayer: AdminPrayerRequest) => {
      setSelectedId(prayer.id);
      setPanelNotes(prayer.pastoral_notes ?? "");
      setStatus(null);
    },
    [],
  );

  const closePanel = useCallback(() => {
    setSelectedId(null);
  }, []);

  const replaceInList = useCallback(
    (updated: AdminPrayerRequest) =>
      setPrayers((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      ),
    [],
  );

  /* ── Actions ──────────────────────────────────────────────── */

  const handleStatusChange = (
    prayer: AdminPrayerRequest,
    newStatus: AdminPrayerRequest["status"],
  ) => {
    // optimistic
    replaceInList({ ...prayer, status: newStatus });
    startTransition(async () => {
      try {
        const res = await updatePrayerStatus(prayer.id, newStatus);
        replaceInList(res.data);
        setStatus({ type: "success", message: "Statut mis à jour." });
      } catch (err) {
        replaceInList(prayer); // rollback
        const error = err as Error;
        setStatus({
          type: "error",
          message: error.message || "Impossible de changer le statut.",
        });
      }
    });
  };

  const handleAssign = (
    prayer: AdminPrayerRequest,
    userId: number | null,
  ) => {
    const assignee = userId
      ? users.find((u) => u.id === userId) ?? null
      : null;
    replaceInList({
      ...prayer,
      assigned_to: userId,
      assignee: assignee
        ? { id: assignee.id, name: assignee.name, email: assignee.email }
        : null,
    });
    startTransition(async () => {
      try {
        const res = await assignPrayer(prayer.id, userId);
        replaceInList(res.data);
        setStatus({ type: "success", message: "Intercesseur assigné." });
      } catch (err) {
        replaceInList(prayer);
        const error = err as Error;
        setStatus({
          type: "error",
          message: error.message || "Impossible d\u2019assigner.",
        });
      }
    });
  };

  const handleSaveNotes = (prayer: AdminPrayerRequest) => {
    startTransition(async () => {
      try {
        const res = await updatePrayer(prayer.id, {
          pastoral_notes: panelNotes || null,
        });
        replaceInList(res.data);
        setStatus({
          type: "success",
          message: "Notes pastorales enregistrées.",
        });
      } catch (err) {
        const error = err as Error;
        setStatus({
          type: "error",
          message: error.message || "Erreur lors de la sauvegarde.",
        });
      }
    });
  };

  const handleMarkAnswered = async (prayer: AdminPrayerRequest) => {
    // Copy the prayer text + testimony to clipboard
    const text = `Témoignage – ${prayer.name ?? "Anonyme"}\nCatégorie : ${prayer.category}\n\n${prayer.message}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard may fail silently
    }
    handleStatusChange(prayer, "answered");
  };

  const handleDelete = (prayer: AdminPrayerRequest) => {
    const displayName = prayer.name ?? "Anonyme";
    if (
      !confirm(
        `Voulez-vous vraiment supprimer la requête de "${displayName}" ?`,
      )
    )
      return;

    setPrayers((prev) => prev.filter((p) => p.id !== prayer.id));
    closePanel();
    startTransition(async () => {
      try {
        await deletePrayer(prayer.id);
        setStatus({ type: "success", message: "Requête supprimée." });
      } catch (err) {
        // rollback
        setPrayers((prev) =>
          [...prev, prayer].sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          ),
        );
        const error = err as Error;
        setStatus({
          type: "error",
          message: error.message || "Impossible de supprimer.",
        });
      }
    });
  };

  const handleSaveConfig = () => {
    startTransition(async () => {
      try {
        const payload = [
          { key: "prayer_success_ui_message", value: successMessage, group: "prayers" },
          { key: "prayer_automated_notification_message", value: notificationMessage, group: "prayers" },
          { key: "prayer_categories", value: categories, group: "prayers" },
        ];
        await updateAdminSettings(payload);
        setStatus({ type: "success", message: "Configuration des réponses et catégories enregistrée." });
      } catch (err) {
        const error = err as Error;
        setStatus({
          type: "error",
          message: error.message || "Impossible d'enregistrer la configuration.",
        });
      }
    });
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    if (categories.includes(newCategoryName.trim())) {
      alert("Cette catégorie existe déjà.");
      return;
    }
    setCategories((prev) => [...prev, newCategoryName.trim()]);
    setNewCategoryName("");
    setStatus(null);
  };

  const handleStartEditCategory = (index: number, name: string) => {
    setEditingCategoryIndex(index);
    setEditingCategoryName(name);
  };

  const handleSaveEditCategory = () => {
    if (!editingCategoryName.trim() || editingCategoryIndex === null) return;
    const trimmed = editingCategoryName.trim();
    if (categories.some((c, idx) => c === trimmed && idx !== editingCategoryIndex)) {
      alert("Cette catégorie existe déjà.");
      return;
    }
    setCategories((prev) =>
      prev.map((c, idx) => (idx === editingCategoryIndex ? trimmed : c))
    );
    setEditingCategoryIndex(null);
    setEditingCategoryName("");
    setStatus(null);
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryIndex(null);
    setEditingCategoryName("");
  };

  const handleDeleteCategory = (index: number) => {
    const categoryName = categories[index];
    if (
      !confirm(
        `Voulez-vous vraiment supprimer la catégorie "${categoryName}" ?`
      )
    )
      return;
    setCategories((prev) => prev.filter((_, idx) => idx !== index));
    setStatus(null);
  };

  /* ── Derived ──────────────────────────────────────────────── */

  const filtered = prayers
    .filter((p) => (statusFilter === "all" ? true : p.status === statusFilter))
    .filter((p) =>
      categoryFilter === "all" ? true : p.category === categoryFilter,
    )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  const newCount = prayers.filter((p) => p.status === "new").length;

  const whatsappUrl = (prayer: AdminPrayerRequest) => {
    const phone = prayer.phone.replace(/^\+/, "");
    const name = encodeURIComponent(prayer.name ?? "frère/sœur");
    return `https://wa.me/${phone}?text=Bonjour%20${name}%2C%20l'%C3%A9quipe%20d'intercession%20de%20MFM%20Ficgayo%20a%20bien%20re%C3%A7u%20votre%20demande%20de%20pri%C3%A8re.%20Nous%20prions%20pour%20vous.`;
  };

  /* ── Render ───────────────────────────────────────────────── */

  return (
    <div className="relative mx-auto max-w-[1100px] animate-fade-up">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">
            Intercession
          </span>
          <h1 className="mt-1 flex items-center gap-3 font-display text-[34px] font-semibold text-indigo italic">
            Requêtes de Prière
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo/10 px-3 py-1 text-[13px] font-bold not-italic text-indigo">
              {prayers.length}
              {newCount > 0 && (
                <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-live text-[10px] font-black text-white animate-pulse">
                  {newCount}
                </span>
              )}
            </span>
          </h1>
          <p className="mt-1 text-sm text-body">
            Gérez les demandes de prière, assignez les intercesseurs et suivez les exaucements.
          </p>
        </div>
      </header>

      {/* ── Status feedback ─────────────────────────────────── */}
      {status && (
        <div
          className={cn(
            "mb-6 flex items-start gap-3.5 rounded-xl border p-4 text-sm",
            status.type === "success"
              ? "border-online/20 bg-online/5 text-body-strong"
              : "border-live/20 bg-live/5 text-live",
          )}
        >
          {status.type === "success" ? (
            <CheckCircle className="size-5 shrink-0 text-online" />
          ) : (
            <AlertCircle className="size-5 shrink-0 text-live" />
          )}
          <div>
            <p className="font-bold">
              {status.type === "success" ? "Succès" : "Erreur"}
            </p>
            <p className="mt-0.5 text-xs text-body">{status.message}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-[rgba(40,25,80,0.08)] pb-px">
        <button
          onClick={() => handleTabChange("list")}
          className={cn(
            "cursor-pointer border-b-2 px-4 py-2.5 text-sm font-bold transition-all",
            activeTab === "list"
              ? "border-indigo text-indigo"
              : "border-transparent text-body hover:text-indigo"
          )}
        >
          Liste des Requêtes
        </button>
        <button
          onClick={() => handleTabChange("config")}
          className={cn(
            "cursor-pointer border-b-2 px-4 py-2.5 text-sm font-bold transition-all",
            activeTab === "config"
              ? "border-indigo text-indigo"
              : "border-transparent text-body hover:text-indigo"
          )}
        >
          Configuration des Réponses
        </button>
      </div>

      {activeTab === "list" ? (
        <>
          {/* ── Filter bar ──────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Status pills */}
        <div className="flex items-center gap-1.5 rounded-xl border border-[rgba(40,25,80,0.1)] bg-white p-1 shadow-[0_1px_3px_rgba(22,15,51,0.02)]">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                "cursor-pointer rounded-[10px] px-3.5 py-2 text-xs font-bold transition",
                statusFilter === f.key
                  ? "bg-indigo text-white shadow-sm"
                  : "text-body hover:bg-cream hover:text-indigo",
              )}
            >
              {f.label}
              {f.key === "new" && newCount > 0 && (
                <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full bg-live text-[9px] font-black text-white">
                  {newCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Category dropdown */}
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="cursor-pointer appearance-none rounded-xl border border-[rgba(40,25,80,0.1)] bg-white py-2.5 pr-9 pl-3.5 text-xs font-bold text-indigo shadow-[0_1px_3px_rgba(22,15,51,0.02)] outline-none transition hover:border-gold focus:border-gold"
          >
            <option value="all">Toutes catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-faint" />
        </div>
      </div>

      {/* ── Data table ──────────────────────────────────────── */}
      <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-indigo">
            <thead className="border-b border-[rgba(40,25,80,0.08)] bg-cream text-xs font-bold tracking-wider text-body uppercase">
              <tr>
                <th className="px-6 py-4">Demandeur</th>
                <th className="px-6 py-4">Catégorie</th>
                <th className="px-6 py-4">Message</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Assigné à</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
              {filtered.map((prayer) => {
                const cfg = STATUS_CONFIG[prayer.status];
                return (
                  <tr
                    key={prayer.id}
                    onClick={() => openPanel(prayer)}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-cream/40",
                      selectedId === prayer.id && "bg-gold/5",
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo/5 text-xs font-bold text-indigo">
                          {(prayer.name ?? "A")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold">
                            {prayer.name ?? "Anonyme"}
                          </p>
                          {prayer.phone && (
                            <p className="text-[11px] text-faint">
                              {prayer.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-indigo/5 px-2.5 py-1 text-[11px] font-bold text-indigo">
                        {prayer.category}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-6 py-4">
                      <p className="truncate text-xs text-body">
                        {prayer.message}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                          cfg.bg,
                          cfg.text,
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            cfg.dot,
                            cfg.pulse && "animate-pulse",
                          )}
                        />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-body">
                      {prayer.assignee?.name ?? (
                        <span className="italic text-faint">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-faint">
                      {new Date(prayer.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                );
              })}

              {/* ── Empty state ──────────────────────────────── */}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <BookHeart className="size-10 text-gold/40" />
                      <p className="text-sm font-semibold text-body-strong">
                        Aucune requête trouvée
                      </p>
                      <p className="max-w-xs text-xs text-body">
                        Il n&apos;y a pas de demandes de prière correspondant
                        aux filtres sélectionnés.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      ) : (
        <div className="rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-[0_1px_3px_rgba(22,15,51,0.04)] animate-fade-up">
          <h2 className="font-display text-lg font-bold text-indigo italic mb-4">
            Configuration des réponses
          </h2>
          
          <div className="space-y-6">
            {/* success message */}
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold text-body-strong uppercase tracking-wide">
                Message de succès (Sur le site web)
              </span>
              <span className="text-xs text-faint">
                Ce message s&apos;affichera à l&apos;écran du demandeur après soumission de sa requête de prière.
              </span>
              <textarea
                value={successMessage}
                onChange={(e) => {
                  setSuccessMessage(e.target.value);
                  setStatus(null);
                }}
                rows={3}
                placeholder="Merci ! Votre requête est entrée dans la chaîne d'intercession..."
                className="w-full rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 py-3 text-sm text-indigo outline-none focus:border-gold resize-none leading-relaxed"
              />
            </label>

            {/* notification template */}
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold text-body-strong uppercase tracking-wide">
                Modèle de notification automatique (SMS/Email/WhatsApp)
              </span>
              <span className="text-xs text-faint">
                Modèle utilisé pour envoyer une confirmation. Variables disponibles : <code className="rounded bg-cream px-1 font-mono text-[11px] text-gold-dark">[Nom]</code>, <code className="rounded bg-cream px-1 font-mono text-[11px] text-gold-dark">[Catégorie]</code>, <code className="rounded bg-cream px-1 font-mono text-[11px] text-gold-dark">[Message]</code>.
              </span>
              <textarea
                value={notificationMessage}
                onChange={(e) => {
                  setNotificationMessage(e.target.value);
                  setStatus(null);
                }}
                rows={4}
                placeholder="Bonjour [Nom], l'équipe d'intercession a bien reçu..."
                className="w-full rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 py-3 text-sm text-indigo outline-none focus:border-gold resize-none leading-relaxed"
              />
            </label>

            {/* categories management */}
            <div className="border-t border-[rgba(40,25,80,0.08)] pt-6">
              <span className="text-xs font-bold text-body-strong uppercase tracking-wide block mb-2">
                Catégories de demandes de prière
              </span>
              <span className="text-xs text-faint block mb-4">
                Ajoutez, modifiez ou supprimez les catégories disponibles dans le formulaire de prière.
              </span>
              
              {/* list of categories */}
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map((cat, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 rounded-full border border-indigo/10 bg-cream pl-3 pr-2 py-1 text-xs font-bold text-indigo"
                  >
                    {editingCategoryIndex === idx ? (
                      <input
                        type="text"
                        value={editingCategoryName}
                        onChange={(e) => {
                          setEditingCategoryName(e.target.value);
                          setStatus(null);
                        }}
                        className="bg-white border border-[rgba(40,25,80,0.15)] rounded px-1.5 py-0.5 text-xs text-indigo outline-none focus:border-gold w-[100px]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEditCategory();
                          if (e.key === "Escape") handleCancelEditCategory();
                        }}
                        autoFocus
                      />
                    ) : (
                      <span>{cat}</span>
                    )}

                    <div className="flex items-center gap-0.5 ml-1">
                      {editingCategoryIndex === idx ? (
                        <>
                          <button
                            type="button"
                            onClick={handleSaveEditCategory}
                            className="cursor-pointer text-online hover:opacity-85 font-black p-0.5"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditCategory}
                            className="cursor-pointer text-live hover:opacity-85 font-black p-0.5"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEditCategory(idx, cat)}
                            className="cursor-pointer text-gold-dark hover:brightness-110 p-0.5"
                            title="Modifier"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(idx)}
                            className="cursor-pointer text-live hover:opacity-85 p-0.5"
                            title="Supprimer"
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* add category input */}
              <div className="flex gap-2 max-w-sm">
                <input
                  type="text"
                  placeholder="Nouvelle catégorie (ex: Professionnel)"
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    setStatus(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  className="flex-1 rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2 text-xs text-indigo outline-none focus:border-gold"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="cursor-pointer rounded-xl bg-indigo px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-mid"
                >
                  Ajouter
                </button>
              </div>
            </div>

            {/* save button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveConfig}
                disabled={isPending}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-3 text-xs font-bold text-indigo shadow-md transition hover:brightness-105 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                Enregistrer la configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ────────────────────────────────────── */}
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) closePanel(); }}>
        {selected && (
          <DialogContent showCloseButton={true} className="w-[95vw] md:w-full md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col p-0 gap-0 border-0 outline-none animate-fade-up">
            {/* modal header */}
            <div className="flex items-center justify-between border-b border-[rgba(40,25,80,0.08)] px-6 py-4 shrink-0">
              <h2 className="font-display text-lg font-bold text-indigo italic">
                Détails de la requête
              </h2>
            </div>

              {/* two-column body */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  {/* ── LEFT COLUMN: Demandeur info ─────────────── */}
                  <div className="space-y-5 border-b md:border-b-0 md:border-r border-[rgba(40,25,80,0.08)] px-6 py-6">
                    {/* identity */}
                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">
                        Demandeur
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5 text-sm text-indigo">
                          <User className="size-4 text-faint" />
                          <span className="font-semibold">
                            {selected.name ?? "Anonyme"}
                          </span>
                        </div>
                        {selected.phone && (
                          <div className="flex items-center gap-2.5 text-sm text-body">
                            <Phone className="size-4 text-faint" />
                            <span>{selected.phone}</span>
                          </div>
                        )}
                        {selected.email && (
                          <div className="flex items-center gap-2.5 text-sm text-body">
                            <Mail className="size-4 text-faint" />
                            <span>{selected.email}</span>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* contact buttons */}
                    {selected.phone && (
                      <div className="flex gap-2">
                        <a
                          href={`tel:${selected.phone}`}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-[rgba(40,25,80,0.12)] px-3 py-2 text-xs font-bold text-indigo transition hover:bg-cream"
                        >
                          <Phone className="size-3.5" />
                          Appeler
                        </a>
                        <a
                          href={whatsappUrl(selected)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-110"
                        >
                          <MessageCircle className="size-3.5" />
                          WhatsApp
                        </a>
                      </div>
                    )}

                    {/* category */}
                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">
                        Catégorie
                      </h3>
                      <span className="inline-block rounded-full bg-indigo/5 px-3 py-1 text-xs font-bold text-indigo">
                        {selected.category}
                      </span>
                    </section>

                    {/* message */}
                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">
                        Message
                      </h3>
                      <p className="rounded-xl bg-cream p-4 text-sm leading-relaxed text-body-strong">
                        {selected.message}
                      </p>
                    </section>
                  </div>

                  {/* ── RIGHT COLUMN: Treatment form ────────────── */}
                  <div className="space-y-5 px-6 py-6">
                    {/* status */}
                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">
                        Statut
                      </h3>
                      <div className="relative">
                        <select
                          value={selected.status}
                          onChange={(e) =>
                            handleStatusChange(
                              selected,
                              e.target.value as AdminPrayerRequest["status"],
                            )
                          }
                          disabled={isPending}
                          className="w-full cursor-pointer appearance-none rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-sm font-semibold text-indigo outline-none transition focus:border-gold disabled:opacity-50"
                        >
                          <option value="new">🔴 Nouvelle</option>
                          <option value="praying">🟡 En prière</option>
                          <option value="answered">🟢 Exaucée</option>
                          <option value="archived">⚫ Archivée</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-faint" />
                      </div>
                    </section>

                    {/* assignee */}
                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">
                        Assigné à
                      </h3>
                      <div className="relative">
                        <select
                          value={selected.assigned_to ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleAssign(
                              selected,
                              val ? Number(val) : null,
                            );
                          }}
                          disabled={isPending}
                          className="w-full cursor-pointer appearance-none rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-sm font-semibold text-indigo outline-none transition focus:border-gold disabled:opacity-50"
                        >
                          <option value="">— Non assigné —</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-faint" />
                      </div>
                    </section>

                    {/* pastoral notes */}
                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">
                        Notes pastorales
                      </h3>
                      <textarea
                        value={panelNotes}
                        onChange={(e) => {
                          setPanelNotes(e.target.value);
                          setStatus(null);
                        }}
                        rows={4}
                        placeholder="Ajoutez des notes internes sur cette requête..."
                        className="w-full resize-none rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-sm leading-relaxed text-indigo outline-none transition placeholder:text-faint focus:border-gold"
                      />
                      <button
                        onClick={() => handleSaveNotes(selected)}
                        disabled={isPending}
                        className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-4 py-2.5 text-xs font-bold text-indigo shadow-sm transition hover:brightness-105 disabled:opacity-50"
                      >
                        {isPending ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Save className="size-3.5" />
                        )}
                        Enregistrer les notes
                      </button>
                    </section>
                  </div>
                </div>
              </div>

              {/* modal footer */}
              <div className="flex items-center gap-3 border-t border-[rgba(40,25,80,0.08)] px-6 py-4">
                <button
                  onClick={() => handleMarkAnswered(selected)}
                  disabled={isPending || selected.status === "answered"}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-online/10 px-4 py-3 text-xs font-bold text-online transition hover:bg-online/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckCircle className="size-4" />
                  Marquer comme Exaucé
                </button>
                <button
                  onClick={() => handleDelete(selected)}
                  disabled={isPending}
                  className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-live/20 px-4 py-3 text-xs font-bold text-live transition hover:bg-live/10 disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                  Supprimer
                </button>
              </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
