"use client";

import { useState, useTransition } from "react";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Loader2, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  SlidersHorizontal,
  Clock,
  X
} from "lucide-react";
import { createHomeGroup, updateHomeGroup, deleteHomeGroup, getAdminHomeGroupsPaginated, type AdminUser, type AdminListMeta } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SearchableSelect } from "../_components/searchable-select";
import { LocationPicker } from "../_components/location-picker";
import { Pagination } from "../_components/pagination";
import { useServerList } from "../_components/use-server-list";
import { QueryBuilder, serializeFiltersForQueryMaster } from "@/components/admin/query-builder";
import type { FilterField, ActiveFilter } from "@/components/admin/query-builder";

export const HOME_GROUPS_PER_PAGE = 10;

type HomeGroup = {
  id: number;
  name: string;
  leader: string | null;
  leader_id: number | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  zone_name: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  schedule: string | null;
  coordinates: { top?: string; left?: string; lat?: number; lng?: number } | null;
  sort_order: number;
  is_active: boolean;
};

/** Days of the week, in calendar order — stored verbatim as `meeting_day`. */
const WEEK_DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;

/** Compose the human-readable schedule the public site shows (e.g. "Mardi · 19h00"). */
function composeSchedule(day: string, time: string): string {
  const d = day.trim();
  const t = time.trim();
  if (d && t) return `${d} · ${t}`;
  return d || t;
}

const filterFields: FilterField[] = [
  { id: "name", label: "Nom", type: "text" },
  { id: "leader", label: "Responsable", type: "text" },
  { id: "address", label: "Quartier / Adresse", type: "text" },
  {
    id: "meeting_day",
    label: "Jour",
    type: "select",
    options: WEEK_DAYS.map((d) => ({ value: d, label: d })),
  },
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

export function HomeGroupsManager({
  initialHomeGroups,
  initialMeta,
  users = [],
}: {
  initialHomeGroups: HomeGroup[];
  initialMeta: AdminListMeta;
  users?: AdminUser[];
}) {
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Table sorting and filtering states
  const [sortBy, setSortBy] = useState<"name" | "leader" | "address" | "is_active" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  // Pagination states
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(HOME_GROUPS_PER_PAGE);

  // Server-side list (search / filters / sort / pagination via QueryMaster).
  const homeGroupFilters: Record<string, string> = { ...serializeFiltersForQueryMaster(activeFilters) };
  if (homeGroupFilters.is_active__eq) {
    homeGroupFilters.is_active__eq = homeGroupFilters.is_active__eq === "active" ? "1" : "0";
  }

  const {
    items: homeGroups,
    setItems: setHomeGroups,
    meta,
    isLoading,
    refresh,
  } = useServerList<HomeGroup>({
    fetcher: getAdminHomeGroupsPaginated,
    params: {
      page,
      perPage,
      search,
      sort: sortBy && sortOrder ? { field: sortBy, dir: sortOrder } : null,
      filters: homeGroupFilters,
    },
    initialData: initialHomeGroups,
    initialMeta,
  });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHomeGroup, setEditingHomeGroup] = useState<HomeGroup | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [leader, setLeader] = useState("");
  const [leaderId, setLeaderId] = useState<number | "">("");
  const [address, setAddress] = useState("");
  const [meetingDay, setMeetingDay] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [zoneName, setZoneName] = useState<string | null>(null);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const openCreateModal = () => {
    setEditingHomeGroup(null);
    setName("");
    setLeader("");
    setLeaderId("");
    setAddress("");
    setMeetingDay("");
    setMeetingTime("");
    setLatitude(null);
    setLongitude(null);
    setZoneName(null);
    setFormSortOrder(0);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (group: HomeGroup) => {
    setEditingHomeGroup(group);
    setName(group.name);
    setLeader(group.leader ?? "");
    setLeaderId(group.leader_id || "");
    setAddress(group.address);
    setMeetingDay(group.meeting_day ?? "");
    setMeetingTime(group.meeting_time ?? "");
    setLatitude(group.latitude ?? null);
    setLongitude(group.longitude ?? null);
    setZoneName(group.zone_name ?? null);
    setFormSortOrder(group.sort_order);
    setIsActive(group.is_active);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingHomeGroup(null);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer le groupe de maison "${name}" ?`)) return;

    setStatus(null);
    startTransition(async () => {
      try {
        await deleteHomeGroup(id);
        setHomeGroups(homeGroups.filter((g) => g.id !== id));
        refresh();
        setStatus({ type: "success", message: `Le groupe "${name}" a été supprimé.` });
      } catch (err) {
        const error = err as Error;
        setStatus({ type: "error", message: error.message || "Impossible de supprimer ce groupe." });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;

    setStatus(null);
    startTransition(async () => {
      try {
        const composedSchedule = composeSchedule(meetingDay, meetingTime);
        const payload = {
          name,
          leader: leader || null,
          leader_id: leaderId ? Number(leaderId) : null,
          address,
          latitude,
          longitude,
          zone_name: zoneName,
          meeting_day: meetingDay || null,
          meeting_time: meetingTime || null,
          // Keep `schedule` in sync so the public site's "when" label stays accurate.
          schedule: composedSchedule || null,
          sort_order: Number(formSortOrder),
          is_active: isActive,
        };

        if (editingHomeGroup) {
          const res = await updateHomeGroup(editingHomeGroup.id, payload);
          const updated = res.data as HomeGroup;
          setHomeGroups(homeGroups.map((g) => (g.id === updated.id ? updated : g)));
          refresh();
          setStatus({ type: "success", message: `Le groupe de maison "${name}" a été mis à jour.` });
        } else {
          const res = await createHomeGroup(payload);
          const created = res.data as HomeGroup;
          setHomeGroups([...homeGroups, created]);
          refresh();
          setStatus({ type: "success", message: `Le groupe de maison "${name}" a été créé.` });
        }
        closeModal();
      } catch (err) {
        const error = err as Error;
        setStatus({ type: "error", message: error.message || "Erreur de validation ou de connexion." });
      }
    });
  };

  const userOptions = users.map((u) => ({
    value: u.id,
    label: u.name,
    sublabel: u.email,
  }));

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearch("");
    setPage(1);
  };

  const handleSort = (column: "name" | "leader" | "address" | "is_active") => {
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

  const renderSortChevron = (column: "name" | "leader" | "address" | "is_active") => {
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
  const total = meta.total;
  const pageCount = Math.max(1, meta.last_page);
  const currentPage = meta.current_page;
  const paged = homeGroups;

  return (
    <div className="mx-auto max-w-[1100px] animate-fade-up">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">
            Ressources
          </span>
          <h1 className="mt-1 font-display text-[34px] font-semibold text-indigo italic">
            Gestion des Groupes de maison
          </h1>
          <p className="mt-1 text-sm text-body">
            Gérez les cellules de prière et de communion fraternelle réparties dans les différents quartiers.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/admins/home_groups/applications"
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-indigo/20 bg-white px-5 py-3 text-sm font-bold text-indigo transition hover:bg-cream"
          >
            Voir les Candidatures
          </Link>
          <button
            onClick={openCreateModal}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-3 text-sm font-bold text-indigo shadow-[0_12px_30px_rgba(200,144,46,0.25)] transition hover:-translate-y-0.5 hover:brightness-105"
          >
            <Plus className="size-4" /> Nouveau Groupe
          </button>
        </div>
      </header>

      {status && (
        <div
          className={cn(
            "mb-6 flex items-start gap-3.5 rounded-xl border p-4 text-sm",
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
              placeholder="Rechercher par nom, responsable ou quartier..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
            <thead className="bg-cream border-b border-[rgba(40,25,80,0.08)] text-xs font-bold tracking-wider text-body uppercase select-none">
              <tr>
                <th 
                  className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nom du groupe</span>
                    {renderSortChevron("name")}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("leader")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Responsable</span>
                    {renderSortChevron("leader")}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("address")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Quartier / Adresse</span>
                    {renderSortChevron("address")}
                  </div>
                </th>
                <th className="px-6 py-4">Coordonnées</th>
                <th 
                  className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("is_active")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Statut</span>
                    {renderSortChevron("is_active")}
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
              {paged.map((group) => (
                <tr key={group.id} className="hover:bg-cream/40 transition-colors">
                  <td className="px-6 py-4 font-semibold">{group.name}</td>
                  <td className="px-6 py-4">
                    {group.leader ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo/5 text-[10px] font-bold text-indigo">
                          {group.leader.charAt(0).toUpperCase()}
                        </span>
                        <span className="text-xs font-semibold text-indigo">{group.leader}</span>
                      </span>
                    ) : (
                      <span className="text-xs italic text-faint">Non assigné</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-xs text-indigo">{group.address}</p>
                      {group.schedule && <p className="mt-0.5 text-[11px] text-body">{group.schedule}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-faint">
                    {group.latitude != null && group.longitude != null ? (
                      <span title={group.zone_name ?? undefined}>
                        {group.latitude.toFixed(4)}, {group.longitude.toFixed(4)}
                      </span>
                    ) : (
                      <span className="italic">Non localisé</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {group.is_active ? (
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
                        onClick={() => openEditModal(group)}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[rgba(40,25,80,0.1)] text-indigo hover:border-gold hover:bg-gold/5 transition-colors"
                        title="Modifier"
                      >
                        <Edit className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(group.id, group.name)}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-live/10 text-live hover:bg-live/10 transition-colors"
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
                  <td colSpan={6} className="px-6 py-10 text-center text-xs text-body">
                    Aucun groupe de maison trouvé.
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
            itemLabel="groupes de maison"
          />
        )}
      </div>

      {/* Add / edit modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent
          showCloseButton
          className="w-[95vw] md:max-w-3xl rounded-2xl bg-white p-0 gap-0 border-0 outline-none max-h-[92vh] overflow-y-auto"
        >
          <div className="border-b border-[rgba(40,25,80,0.08)] px-6 py-4">
            <h2 className="font-display text-lg font-bold text-indigo italic">
              {editingHomeGroup ? "Modifier le groupe de maison" : "Créer un groupe de maison"}
            </h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-5 px-6 py-6">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold text-body-strong uppercase tracking-wide">Nom du groupe *</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Cellule Ficgayo Temple"
                  className="w-full rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 py-3 text-sm text-indigo outline-none focus:border-gold"
                />
              </label>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-body-strong uppercase tracking-wide">Responsable / Leader</span>
                <SearchableSelect
                  options={userOptions}
                  value={leaderId === "" ? null : leaderId}
                  onChange={(val) => {
                    setLeaderId(val ?? "");
                    if (val !== null) {
                      const u = users.find((user) => user.id === val);
                      if (u) setLeader(u.name);
                    } else {
                      setLeader("");
                    }
                  }}
                  placeholder="Assigner un responsable…"
                  clearLabel="— Aucun responsable —"
                />
              </div>

              <LocationPicker
                value={{ address, latitude, longitude, zone: zoneName }}
                onChange={(next) => {
                  setAddress(next.address);
                  setLatitude(next.latitude);
                  setLongitude(next.longitude);
                  setZoneName(next.zone ?? null);
                }}
              />

              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-bold text-body-strong uppercase tracking-wide">Programme des réunions</span>
                {/* Day of the week — single, canonical selection (keeps `meeting_day` clean). */}
                <div className="flex flex-wrap gap-1.5">
                  {WEEK_DAYS.map((d) => {
                    const active = meetingDay === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setMeetingDay(active ? "" : d)}
                        aria-pressed={active}
                        className={cn(
                          "cursor-pointer rounded-full px-3 py-1.5 text-[12px] font-bold transition",
                          active
                            ? "bg-gradient-to-br from-gold to-gold-dark text-indigo shadow-sm"
                            : "border border-[rgba(40,25,80,0.12)] bg-white text-body hover:border-gold hover:text-indigo"
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
                {/* Time + live preview of the schedule label. */}
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 focus-within:border-gold">
                    <Clock className="size-4 shrink-0 text-faint" />
                    <input
                      type="time"
                      value={meetingTime}
                      onChange={(e) => setMeetingTime(e.target.value)}
                      className="bg-transparent text-sm text-indigo outline-none [color-scheme:light]"
                    />
                  </label>
                  {(meetingDay || meetingTime) && (
                    <span className="text-[12px] text-body">
                      Aperçu&nbsp;:{" "}
                      <span className="font-bold text-indigo">
                        {composeSchedule(meetingDay, meetingTime) || "—"}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-body-strong uppercase tracking-wide">Ordre de tri</span>
                  <input
                    type="number"
                    min={0}
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    className="w-full rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 py-3 text-sm text-indigo outline-none focus:border-gold"
                  />
                </label>

                <div className="flex flex-col gap-2.5 justify-center">
                  <span className="text-xs font-bold text-body-strong uppercase tracking-wide">Visibilité</span>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="size-4 accent-gold cursor-pointer"
                    />
                    <span className="text-[13px] font-semibold text-indigo">Afficher sur la carte</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[rgba(40,25,80,0.08)] px-6 py-4 bg-[#faf8f4]">
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
