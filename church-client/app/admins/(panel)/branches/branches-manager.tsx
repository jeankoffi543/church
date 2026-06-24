"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Link as LinkIcon,
  Globe,
  MapPin,
  Phone,
  Clock,
  User,
  X,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  SlidersHorizontal,
} from "lucide-react";
import {
  createBranch,
  updateBranch,
  deleteBranch,
  getAdminBranchesPaginated,
  type AdminBranch,
  type AdminUser,
  type AdminListMeta
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrandButton } from "@/components/ui/brand-button";
import { SearchableSelect, type SearchableOption } from "../_components/searchable-select";
import { Pagination } from "../_components/pagination";
import { useServerList } from "../_components/use-server-list";
import { LocationPicker } from "../_components/location-picker";
import { QueryBuilder, serializeFiltersForQueryMaster } from "@/components/admin/query-builder";
import type { FilterField, ActiveFilter } from "@/components/admin/query-builder";

export const BRANCHES_PER_PAGE = 10;

/** UI sort columns → QueryMaster sortable model fields (pastor is a relation, not sortable). */
const BRANCH_SORT_FIELD: Record<string, string | undefined> = {
  title: "title",
  address: "address",
  pastor: undefined,
};

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

const filterFields: FilterField[] = [
  { id: "title", label: "Nom du campus", type: "text" },
  { id: "address", label: "Adresse / Ville", type: "text" },
  { id: "pastor", label: "Pasteur", type: "async-select" }
];

export function BranchesManager({
  initialBranches,
  initialMeta,
  users,
}: {
  initialBranches: AdminBranch[];
  initialMeta: AdminListMeta;
  users: AdminUser[];
}) {
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<AdminBranch | null>(null);

  // Sorting and Filtering states
  const [sortBy, setSortBy] = useState<"title" | "address" | "pastor" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  // Pagination states
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(BRANCHES_PER_PAGE);

  // Server-side list (search / filters / sort / pagination via QueryMaster).
  const branchSort = sortBy ? BRANCH_SORT_FIELD[sortBy] : undefined;
  const {
    items: branches,
    setItems: setBranches,
    meta,
    isLoading,
    refresh,
  } = useServerList<AdminBranch>({
    fetcher: getAdminBranchesPaginated,
    params: {
      page,
      perPage,
      search,
      sort: branchSort && sortOrder ? { field: branchSort, dir: sortOrder } : null,
      filters: serializeFiltersForQueryMaster(activeFilters),
    },
    initialData: initialBranches,
    initialMeta,
  });

  // Form states
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [website, setWebsite] = useState("");
  const [pastorId, setPastorId] = useState<number | null>(null);

  // Auto-dismiss status banner after 4s
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  const resetForm = () => {
    setTitle("");
    setSlug("");
    setDescription("");
    setAddress("");
    setPhone("");
    setHours("");
    setLat("");
    setLng("");
    setWebsite("");
    setPastorId(null);
  };

  const openCreateModal = () => {
    setEditingBranch(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (b: AdminBranch) => {
    setEditingBranch(b);
    setTitle(b.title);
    setSlug(b.slug);
    setDescription(b.description ?? "");
    setAddress(b.address);
    setPhone(b.phone);
    setHours(b.hours);
    setLat(b.lat ? String(b.lat) : "");
    setLng(b.lng ? String(b.lng) : "");
    setWebsite(b.website ?? "");
    setPastorId(b.pastor_id);
    setIsModalOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingBranch) {
      setSlug(slugify(val));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !slug.trim() || !address.trim() || !phone.trim() || !hours.trim() || !lat.trim() || !lng.trim()) {
      setStatus({ type: "error", message: "Veuillez remplir tous les champs obligatoires." });
      return;
    }

    const payload: Partial<AdminBranch> = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      address: address.trim(),
      phone: phone.trim(),
      hours: hours.trim(),
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      website: website.trim() || null,
      pastor_id: pastorId,
    };

    if (isNaN(payload.lat!) || isNaN(payload.lng!)) {
      setStatus({ type: "error", message: "Les coordonnées géographiques doivent être des nombres valides." });
      return;
    }

    startTransition(async () => {
      try {
        if (editingBranch) {
          const res = await updateBranch(editingBranch.id, payload);
          setBranches((prev) => prev.map((item) => (item.id === editingBranch.id ? res.data : item)));
          refresh();
          setStatus({ type: "success", message: "La branche a été mise à jour avec succès." });
        } else {
          const res = await createBranch(payload);
          setBranches((prev) => [...prev, res.data]);
          refresh();
          setStatus({ type: "success", message: "La branche a été créée avec succès." });
        }
        setIsModalOpen(false);
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Une erreur est survenue." });
      }
    });
  };

  const handleDelete = (b: AdminBranch) => {
    if (!confirm(`Supprimer définitivement la branche « ${b.title} » ?`)) return;

    startTransition(async () => {
      try {
        await deleteBranch(b.id);
        setBranches((prev) => prev.filter((item) => item.id !== b.id));
        refresh();
        setStatus({ type: "success", message: "La branche a été supprimée." });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Suppression impossible." });
      }
    });
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearch("");
    setPage(1);
  };

  const handleSort = (column: "title" | "address" | "pastor") => {
    setPage(1);
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

  const renderSortChevron = (column: "title" | "address" | "pastor") => {
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

  // The API already returns the filtered + sorted page; render it directly.
  const paged = branches;
  const total = meta.total;
  const pageCount = Math.max(1, meta.last_page);
  const currentPage = meta.current_page;

  // Searchable select options for pastors
  const userOptions = useMemo<SearchableOption[]>(() => {
    return users.map((u) => ({
      value: u.id,
      label: u.name,
      sublabel: u.email,
    }));
  }, [users]);

  return (
    <div className="mx-auto max-w-[1100px] animate-fade-up">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">
            Gestion territoriale
          </span>
          <h1 className="mt-1 flex items-center gap-3 font-display text-[34px] font-semibold text-indigo italic">
            Campus &amp; Extensions
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo/10 px-3 py-1 text-[13px] font-bold not-italic text-indigo">
              {total}
            </span>
          </h1>
          <p className="mt-1 text-sm text-body">
            Gérez les campus principaux, les extensions régionales et affectez les pasteurs résidents.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-indigo px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-mid"
        >
          <Plus className="size-4" />
          Nouveau campus / extension
        </button>
      </header>

      {/* Status banner */}
      {status && (
        <div
          className={cn(
            "mb-6 flex items-start gap-3.5 rounded-xl border p-4 text-sm animate-in fade-in duration-200",
            status.type === "success"
              ? "border-online/20 bg-online/5 text-body-strong"
              : "border-live/20 bg-live/5 text-live"
          )}
        >
          {status.type === "success" ? (
            <CheckCircle className="size-5 shrink-0 text-online" />
          ) : (
            <AlertCircle className="size-5 shrink-0 text-live" />
          )}
          <p className="font-semibold">{status.message}</p>
        </div>
      )}

      {/* Filter and search bar row (Set z-20 relative for correct stacking context) */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap z-20 relative">
        <div className="flex flex-1 items-center gap-3 flex-wrap">
          {/* Main search bar */}
          <div className="flex flex-1 min-w-[220px] max-w-sm items-center gap-2.5 rounded-xl border border-[rgba(40,25,80,0.12)] bg-white px-3.5 py-2">
            <Search className="size-4 text-faint" />
            <input
              type="text"
              placeholder="Rechercher par nom, adresse, pasteur..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full text-[14px] text-indigo outline-none placeholder:text-faint bg-transparent border-none"
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
              pastor: userOptions,
            }}
          />
        </div>

        {activeFilters.length > 0 && (
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
        <div className={cn("overflow-x-auto transition-opacity", isLoading && "pointer-events-none opacity-60")}>
          <table className="w-full text-left text-sm text-indigo">
            <thead className="border-b border-[rgba(40,25,80,0.08)] bg-cream text-xs font-bold tracking-wider text-body uppercase select-none">
              <tr>
                <th 
                  className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("title")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nom / Ville</span>
                    {renderSortChevron("title")}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("address")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Adresse</span>
                    {renderSortChevron("address")}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("pastor")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Pasteur Résident</span>
                    {renderSortChevron("pastor")}
                  </div>
                </th>
                <th className="px-6 py-4">Horaires cultes</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
              {paged.map((b) => (
                <tr key={b.id} className="transition-colors hover:bg-cream/40">
                  <td className="px-6 py-4">
                    <div>
                      <span className="font-bold text-base block">{b.title}</span>
                      <span className="text-xs text-faint font-mono block">/{b.slug}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-indigo leading-relaxed block max-w-xs truncate">
                      {b.address}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {b.pastor ? (
                      <div>
                        <span className="font-semibold block text-xs">{b.pastor.name}</span>
                        <span className="text-[10px] text-faint block">{b.pastor.email}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-faint italic">Non assigné</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs">{b.hours}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(b)}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[rgba(40,25,80,0.1)] bg-white text-indigo transition hover:bg-cream/40"
                        title="Modifier"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(b)}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-faint hover:bg-red-50 hover:text-live transition"
                        title="Supprimer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <MapPin className="size-8 text-faint mb-2" />
                      <p className="text-sm font-semibold text-indigo">Aucun campus/extension trouvé</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            total={total}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={(n) => {
              setPerPage(n);
              setPage(1);
            }}
            itemLabel="campus / extensions"
          />
        )}
      </div>

      {/* Expanded Add/Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className="w-[95vw] md:max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border-0 p-6 bg-white shadow-xl focus-visible:outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()} // Immune against focus scroll-up issues
        >
          <div className="flex items-center justify-between border-b pb-4 mb-5">
            <h2 className="font-display text-xl font-bold text-indigo italic">
              {editingBranch ? "Modifier le campus" : "Créer un nouveau campus / extension"}
            </h2>
            <button
              onClick={() => setIsModalOpen(false)}
              className="rounded-full p-1 text-faint hover:bg-cream transition cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title & Slug */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-indigo uppercase tracking-wider">
                  Nom du campus / extension *
                </label>
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Ex: Siège régional de Yopougon"
                  className="h-10 rounded-lg border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 text-sm text-indigo focus-visible:border-gold"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-indigo uppercase tracking-wider">
                  Slug unique *
                </label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="Ex: siege-regional-yopougon"
                  className="h-10 rounded-lg border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 text-sm text-indigo focus-visible:border-gold font-mono"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-indigo uppercase tracking-wider">
                Description descriptive *
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez brièvement la branche, son historique ou sa vocation..."
                rows={3}
                className="rounded-lg border-[rgba(40,25,80,0.12)] bg-[#faf8f4] p-3 text-sm text-indigo focus-visible:border-gold"
                required
              />
            </div>

            {/* Phone & Cult Hours */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-indigo uppercase tracking-wider">
                  Téléphone de contact *
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: +225 07 00 00 00 00"
                  className="h-10 rounded-lg border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 text-sm text-indigo focus-visible:border-gold"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-indigo uppercase tracking-wider">
                  Horaires des cultes *
                </label>
                <Input
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="Ex: Dimanche 09h00 · Mardi 18h30"
                  className="h-10 rounded-lg border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 text-sm text-indigo focus-visible:border-gold"
                  required
                />
              </div>
            </div>

            {/* Site Internet */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-indigo uppercase tracking-wider">
                Site Internet (Optionnel)
              </label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="Ex: https://mfm-ficgayo.ci"
                className="h-10 rounded-lg border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 text-sm text-indigo focus-visible:border-gold"
              />
            </div>

            {/* Interactive Location Selection */}
            <LocationPicker
              value={{
                address,
                latitude: lat ? parseFloat(lat) : null,
                longitude: lng ? parseFloat(lng) : null,
                zone: null,
              }}
              onChange={(next) => {
                setAddress(next.address);
                setLat(next.latitude !== null ? String(next.latitude) : "");
                setLng(next.longitude !== null ? String(next.longitude) : "");
              }}
            />

            {/* Resident Pastor Searchable combobox select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-indigo uppercase tracking-wider">
                Sélectionner le Pasteur Résident
              </label>
              <SearchableSelect
                options={userOptions}
                value={pastorId}
                onChange={setPastorId}
                placeholder="Rechercher et associer un pasteur..."
                clearable={true}
                clearLabel="— Aucun Pasteur —"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-10 cursor-pointer rounded-lg border border-[rgba(40,25,80,0.15)] bg-white px-4 py-2 text-xs font-bold text-indigo transition hover:bg-cream/40"
              >
                Annuler
              </button>
              <BrandButton
                type="submit"
                disabled={isPending}
                className="h-10 flex items-center gap-2 shadow-sm font-bold px-6 bg-indigo text-white hover:bg-indigo-mid"
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {editingBranch ? "Enregistrer" : "Créer la branche"}
              </BrandButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
