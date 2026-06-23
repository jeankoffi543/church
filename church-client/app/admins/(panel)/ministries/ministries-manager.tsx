"use client";

import { useState, useTransition, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Loader2,
  X,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  ImagePlus,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { createMinistry, updateMinistry, deleteMinistry } from "@/lib/admin-api";
import type { AdminMinistry, AdminUser } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { assetUrl } from "@/lib/asset-url";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Link from "next/link";
import { SearchableSelect } from "../_components/searchable-select";
import { Pagination } from "../_components/pagination";
import { QueryBuilder } from "@/components/admin/query-builder";
import type { FilterField, ActiveFilter, FilterOperator } from "@/components/admin/query-builder";

type Ministry = AdminMinistry;

const filterFields: FilterField[] = [
  { id: "name", label: "Nom", type: "text" },
  { id: "chef", label: "Chef du ministère", type: "async-select" },
  { id: "schedule", label: "Programme / Horaires", type: "text" },
  { 
    id: "is_active", 
    label: "Statut", 
    type: "select", 
    options: [
      { value: "active", label: "Actif" },
      { value: "inactive", label: "Inactif" }
    ] 
  }
];

const matchString = (value: string, term: string, operator: FilterOperator): boolean => {
  const v = value.toLowerCase();
  const t = term.toLowerCase();
  if (operator === "contains") {
    return v.includes(t);
  }
  if (operator === "equals") {
    return v === t;
  }
  if (operator === "starts_with") {
    return v.startsWith(t);
  }
  if (operator === "ends_with") {
    return v.endsWith(t);
  }
  return true;
};

export function MinistriesManager({
  initialMinistries,
  staff,
}: {
  initialMinistries: Ministry[];
  staff: AdminUser[];
}) {
  const [ministries, setMinistries] = useState<Ministry[]>(initialMinistries);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0); // Display order inside modal
  const [isActive, setIsActive] = useState(true);
  const [chefId, setChefId] = useState<number | null>(null);
  
  // Table sorting states
  const [sortBy, setSortBy] = useState<"name" | "chef" | "schedule" | "is_active" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

  // Table filtering states (Centralized Inline Chips)
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  // Cover image: a freshly picked file, and/or removal of the existing one.
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const staffOptions = staff.map((u) => ({
    value: u.id,
    label: u.name,
    sublabel: u.email,
  }));

  const resetImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
  };

  const handlePickImage = (file: File | null) => {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveImage(false);
  };

  const handleClearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
  };

  // Resolve what to show in the upload box: a new pick, or the existing image.
  const currentImageSrc =
    imagePreview ??
    (!removeImage && editingMinistry?.image ? assetUrl(editingMinistry.image) : null);

  const openCreateModal = () => {
    setEditingMinistry(null);
    setName("");
    setDescription("");
    setSchedule("");
    setFormSortOrder(0);
    setIsActive(true);
    setChefId(null);
    resetImage();
    setIsModalOpen(true);
  };

  const openEditModal = (ministry: Ministry) => {
    setEditingMinistry(ministry);
    setName(ministry.name);
    setDescription(ministry.description ?? "");
    setSchedule(ministry.schedule ?? "");
    setFormSortOrder(ministry.sort_order);
    setIsActive(ministry.is_active);
    setChefId(ministry.chef_id);
    resetImage();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMinistry(null);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer le ministère "${name}" ?`)) return;

    setStatus(null);
    startTransition(async () => {
      try {
        await deleteMinistry(id);
        setMinistries(ministries.filter((m) => m.id !== id));
        setStatus({ type: "success", message: `Le ministère "${name}" a été supprimé.` });
      } catch (err) {
        const error = err as Error;
        setStatus({ type: "error", message: error.message || "Impossible de supprimer ce ministère." });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setStatus(null);
    startTransition(async () => {
      try {
        const payload = {
          name,
          description: description || null,
          schedule: schedule || null,
          sort_order: Number(formSortOrder),
          is_active: isActive,
          chef_id: chefId,
        };

        if (editingMinistry) {
          const res = await updateMinistry(editingMinistry.id, payload, imageFile, removeImage);
          const updated = res.data as Ministry;
          setMinistries(ministries.map((m) => (m.id === updated.id ? updated : m)));
          setStatus({ type: "success", message: `Le ministère "${name}" a été mis à jour.` });
        } else {
          const res = await createMinistry({ ...payload, name }, imageFile);
          const created = res.data as Ministry;
          setMinistries([...ministries, created]);
          setStatus({ type: "success", message: `Le ministère "${name}" a été créé.` });
        }
        closeModal();
      } catch (err) {
        const error = err as Error;
        setStatus({ type: "error", message: error.message || "Erreur de validation ou de connexion." });
      }
    });
  };

  const hasActiveFilters = activeFilters.length > 0;

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearch("");
    setPage(1);
  };

  const handleSort = (column: "name" | "chef" | "schedule" | "is_active") => {
    if (sortBy !== column) {
      setSortBy(column);
      setSortOrder("asc");
    } else {
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else if (sortOrder === "desc") {
        setSortBy(null);
        setSortOrder(null);
      } else {
        setSortOrder("asc");
      }
    }
  };

  // Processed Ministries (combined filters + sorting)
  const processedMinistries = useMemo(() => {
    let result = ministries.filter((m) => {
      // Primary Search Bar
      if (search.trim() !== "") {
        const q = search.toLowerCase();
        const nameMatch = m.name.toLowerCase().includes(q);
        const descMatch = m.description ? m.description.toLowerCase().includes(q) : false;
        if (!nameMatch && !descMatch) return false;
      }

      // Query Builder Active Filters
      for (const filter of activeFilters) {
        if (filter.fieldId === "name") {
          if (!filter.value || filter.value.trim() === "") continue;
          if (!matchString(m.name, filter.value, filter.operator)) {
            return false;
          }
        } else if (filter.fieldId === "chef") {
          if (filter.value === "") continue;
          const chefIdValue = Number(filter.value);
          if (m.chef_id !== chefIdValue) {
            return false;
          }
        } else if (filter.fieldId === "schedule") {
          if (!filter.value || filter.value.trim() === "") continue;
          const sched = m.schedule ?? "";
          if (!matchString(sched, filter.value, filter.operator)) {
            return false;
          }
        } else if (filter.fieldId === "is_active") {
          if (filter.value === "") continue;
          const targetIsActive = filter.value === "active";
          if (m.is_active !== targetIsActive) {
            return false;
          }
        }
      }

      return true;
    });

    // Sorting
    if (sortBy && sortOrder) {
      result = [...result].sort((a, b) => {
        let valA = "";
        let valB = "";

        if (sortBy === "name") {
          valA = a.name;
          valB = b.name;
        } else if (sortBy === "chef") {
          valA = a.chef?.name ?? "";
          valB = b.chef?.name ?? "";
        } else if (sortBy === "schedule") {
          valA = a.schedule ?? "";
          valB = b.schedule ?? "";
        } else if (sortBy === "is_active") {
          const numA = a.is_active ? 1 : 0;
          const numB = b.is_active ? 1 : 0;
          return sortOrder === "asc" ? numA - numB : numB - numA;
        }

        const cmp = valA.localeCompare(valB, "fr", { numeric: true, sensitivity: "base" });
        return sortOrder === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [ministries, search, activeFilters, sortBy, sortOrder]);

  // Client-side pagination based on processed list
  const pageCount = Math.max(1, Math.ceil(processedMinistries.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const paged = processedMinistries.slice((currentPage - 1) * perPage, currentPage * perPage);

  // Chevron rendering helper
  const renderSortChevron = (column: "name" | "chef" | "schedule" | "is_active") => {
    if (sortBy !== column) {
      return <ChevronsUpDown className="size-3 text-faint shrink-0" />;
    }
    if (sortOrder === "asc") {
      return <ChevronUp className="size-3 text-gold-dark shrink-0" />;
    }
    if (sortOrder === "desc") {
      return <ChevronDown className="size-3 text-gold-dark shrink-0" />;
    }
    return <ChevronsUpDown className="size-3 text-faint shrink-0" />;
  };

  return (
    <div className="mx-auto max-w-[1100px] animate-fade-up relative">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">
            Ressources
          </span>
          <h1 className="mt-1 font-display text-[34px] font-semibold text-indigo italic">
            Gestion des Ministères
          </h1>
          <p className="mt-1 text-sm text-body">
            Gérez la liste des départements, services et pôles d’activité de la Maison.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/admins/ministries/applications"
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-indigo/20 bg-white px-5 py-3 text-sm font-bold text-indigo transition hover:bg-cream"
          >
            Voir les Candidatures
          </Link>
          <button
            onClick={openCreateModal}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-3 text-sm font-bold text-indigo shadow-[0_12px_30px_rgba(200,144,46,0.25)] transition hover:-translate-y-0.5 hover:brightness-105"
          >
            <Plus className="size-4" /> Nouveau Ministère
          </button>
        </div>
      </header>

      {status && (
        <div
          className={cn(
            "mb-6 flex items-start gap-3.5 rounded-xl border p-4 text-sm z-10 relative",
            status.type === "success" ? "border-online/20 bg-online/5 text-body-strong" : "border-live/20 bg-live/5 text-live"
          )}
        >
          {status.type === "success" ? (
            <CheckCircle className="size-5 shrink-0 text-online" />
          ) : (
            <AlertCircle className="size-5 shrink-0 text-live" />
          )}
          <div>
            <p className="font-bold">{status.type === "success" ? "Succès" : "Erreur"}</p>
            <p className="mt-0.5 text-xs text-body">{status.message}</p>
          </div>
        </div>
      )}

      {/* Filter and search bar row (Set z-20 relative for correct stacking context) */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap z-20 relative">
        <div className="flex flex-1 items-center gap-3 flex-wrap">
          {/* Main search bar */}
          <div className="flex flex-1 min-w-[220px] max-w-md items-center gap-2.5 rounded-xl border border-[rgba(40,25,80,0.1)] bg-white px-3.5 py-2.5 shadow-[0_1px_3px_rgba(22,15,51,0.02)]">
            <Search className="size-4 text-faint" />
            <input
              type="text"
              placeholder="Rechercher un ministère..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full text-[14px] text-indigo outline-none placeholder:text-faint"
            />
          </div>

          {/* Reusable Query Builder containing inline chips & sliders filter button */}
          <QueryBuilder
            fields={filterFields}
            activeFilters={activeFilters}
            onChange={(nextFilters) => {
              setActiveFilters(nextFilters);
              setPage(1);
            }}
            asyncOptions={{
              chef: staffOptions,
            }}
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-live/15 bg-live/5 px-3.5 py-2 text-xs font-semibold text-live transition hover:bg-live/10"
          >
            <X className="size-3.5" />
            Effacer les filtres actifs
          </button>
        )}
      </div>

      {/* Table grid (z-10 relative) */}
      <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)] relative z-10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-indigo">
            <thead className="bg-cream border-b border-[rgba(40,25,80,0.08)] text-xs font-bold tracking-wider text-body uppercase select-none">
              <tr>
                <th className="px-6 py-4 w-[80px]">Ordre</th>
                
                {/* Nom */}
                <th 
                  className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nom</span>
                    {renderSortChevron("name")}
                  </div>
                </th>

                {/* Chef */}
                <th 
                  className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("chef")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Chef</span>
                    {renderSortChevron("chef")}
                  </div>
                </th>

                {/* Programme / Horaires */}
                <th 
                  className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("schedule")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Programme / Horaires</span>
                    {renderSortChevron("schedule")}
                  </div>
                </th>

                {/* Statut */}
                <th 
                  className="px-6 py-4 w-[140px] cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("is_active")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Statut</span>
                    {renderSortChevron("is_active")}
                  </div>
                </th>

                <th className="px-6 py-4 text-right w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
              {paged.map((ministry) => (
                <tr key={ministry.id} className="hover:bg-cream/40 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-faint">{ministry.sort_order}</td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold">{ministry.name}</p>
                      {ministry.description && (
                        <p className="mt-0.5 text-xs text-body line-clamp-1">{ministry.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {ministry.chef ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo/5 text-[10px] font-bold text-indigo">
                          {ministry.chef.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="text-xs font-semibold text-indigo">{ministry.chef.name}</span>
                      </span>
                    ) : (
                      <span className="text-xs italic text-faint">Non assigné</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-body-soft">
                    {ministry.schedule ?? "—"}
                  </td>
                  <td className="px-6 py-4">
                    {ministry.is_active ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-online/10 px-2.5 py-1 text-xs font-bold text-online">
                        <Eye className="size-3" /> Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-live/10 px-2.5 py-1 text-xs font-bold text-live">
                        <EyeOff className="size-3" /> Inactif
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(ministry)}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[rgba(40,25,80,0.1)] text-indigo hover:border-gold hover:bg-gold/5 transition-colors"
                        title="Modifier"
                      >
                        <Edit className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ministry.id, ministry.name)}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-live/10 text-live hover:bg-live/10 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {processedMinistries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-xs text-body">
                    Aucun ministère trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {processedMinistries.length > 0 && (
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            total={processedMinistries.length}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={(n) => {
              setPerPage(n);
              setPage(1);
            }}
            itemLabel="ministères"
          />
        )}
      </div>

      {/* Modal Dialog */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent
          showCloseButton
          className="w-[95vw] md:max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border-0 bg-white p-6 gap-0 outline-none"
        >
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-display text-xl font-bold text-indigo italic">
              {editingMinistry ? "Modifier le ministère" : "Créer un ministère"}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Nom du ministère *</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Département Jeunesse"
                className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Programme / Horaires</span>
              <input
                type="text"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="ex: Samedi 16:00 · Salle Polyvalente"
                className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
              />
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Chef du ministère</span>
              <SearchableSelect
                options={staffOptions}
                value={chefId}
                onChange={setChefId}
                placeholder="Assigner un responsable…"
                clearLabel="— Aucun chef —"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Image du ministère</span>
              {currentImageSrc ? (
                <div className="relative overflow-hidden rounded-xl border border-[rgba(40,25,80,0.12)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={currentImageSrc} alt="Aperçu du ministère" className="h-40 w-full object-cover" />
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="absolute top-2 right-2 flex size-7 cursor-pointer items-center justify-center rounded-full bg-ink/70 text-white backdrop-blur-sm transition hover:bg-live"
                    title="Retirer l'image"
                  >
                    <X className="size-4" />
                  </button>
                  <label className="absolute bottom-2 right-2 cursor-pointer rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-bold text-indigo shadow-sm backdrop-blur-sm transition hover:bg-white">
                    Changer
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handlePickImage(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              ) : (
                <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[rgba(40,25,80,0.25)] bg-[#faf8f4] text-center transition hover:border-gold hover:bg-gold/5">
                  <span className="flex size-11 items-center justify-center rounded-full bg-indigo/5 text-indigo">
                    <ImagePlus className="size-5" />
                  </span>
                  <span className="text-[13px] font-bold text-indigo">Importer une image</span>
                  <span className="text-[11px] text-faint">JPG, PNG ou WEBP · max 4 Mo</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handlePickImage(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Ordre d’affichage</span>
                <input
                  type="number"
                  min={0}
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(Number(e.target.value))}
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
                />
              </label>

              <div className="flex flex-col gap-2.5 justify-center">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Visibilité public</span>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="size-4 accent-gold cursor-pointer"
                  />
                  <span className="text-[13px] font-semibold text-indigo">Afficher sur le site</span>
                </label>
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Objectif et activités du ministère..."
                className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold resize-none leading-relaxed"
              />
            </label>

            <div className="mt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="cursor-pointer rounded-xl border border-[rgba(40,25,80,0.1)] px-4 py-2.5 text-xs font-bold text-body hover:bg-cream transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-2.5 text-xs font-bold text-indigo transition hover:brightness-105 disabled:opacity-50"
              >
                {isPending && <Loader2 className="size-3.5 animate-spin" />}
                Enregistrer
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
