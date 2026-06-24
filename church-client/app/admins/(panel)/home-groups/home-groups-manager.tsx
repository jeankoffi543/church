"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Edit, Trash2, Eye, EyeOff, Clock } from "lucide-react";

import { createHomeGroup, updateHomeGroup, deleteHomeGroup, getAdminHomeGroupsPaginated, type AdminUser, type AdminListMeta } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { serializeFiltersForQueryMaster, type FilterField } from "@/components/admin/query-builder";
import { PageShell, PageHeader } from "@/components/admin/data/page-shell";
import { DataFilters } from "@/components/admin/data/data-filters";
import { DataTable } from "@/components/admin/data/data-table";
import { type Column } from "@/components/admin/data/use-data-table";
import { useServerDataTable } from "@/components/admin/data/use-server-data-table";
import { Button } from "@/components/admin/ui/button";
import { Field, inputClass } from "@/components/admin/ui/field";
import { Modal } from "@/components/admin/ui/modal";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";
import { SearchableSelect } from "../_components/searchable-select";
import { LocationPicker } from "../_components/location-picker";

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

export const HOME_GROUPS_PER_PAGE = 10;

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
  { id: "meeting_day", label: "Jour", type: "select", options: WEEK_DAYS.map((d) => ({ value: d, label: d })) },
  {
    id: "is_active",
    label: "Statut",
    type: "select",
    options: [
      { value: "active", label: "Actif" },
      { value: "inactive", label: "Inactif" },
    ],
  },
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
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHomeGroup, setEditingHomeGroup] = useState<HomeGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HomeGroup | null>(null);

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

  const userOptions = users.map((u) => ({ value: u.id, label: u.name, sublabel: u.email }));

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

  const confirmDelete = () => {
    const g = deleteTarget;
    if (!g) return;
    setDeleteTarget(null);
    setStatus(null);
    startTransition(async () => {
      try {
        await deleteHomeGroup(g.id);
        setHomeGroups((prev) => prev.filter((x) => x.id !== g.id));
        table.refresh();
        setStatus({ type: "success", message: `Le groupe "${g.name}" a été supprimé.` });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Impossible de supprimer ce groupe." });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;

    setStatus(null);
    startTransition(async () => {
      try {
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
          schedule: composeSchedule(meetingDay, meetingTime) || null,
          sort_order: Number(formSortOrder),
          is_active: isActive,
        };

        if (editingHomeGroup) {
          const res = await updateHomeGroup(editingHomeGroup.id, payload);
          const updated = res.data as HomeGroup;
          setHomeGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
          table.refresh();
          setStatus({ type: "success", message: `Le groupe de maison "${name}" a été mis à jour.` });
        } else {
          const res = await createHomeGroup(payload);
          const created = res.data as HomeGroup;
          setHomeGroups((prev) => [...prev, created]);
          table.refresh();
          setStatus({ type: "success", message: `Le groupe de maison "${name}" a été créé.` });
        }
        closeModal();
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Erreur de validation ou de connexion." });
      }
    });
  };

  const columns: Column<HomeGroup>[] = [
    { id: "name", header: "Nom du groupe", sortable: true, sortValue: (g) => g.name, className: "font-semibold", cell: (g) => g.name },
    {
      id: "leader",
      header: "Responsable",
      sortable: true,
      sortValue: (g) => g.leader ?? "",
      cell: (g) =>
        g.leader ? (
          <span className="inline-flex items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo/5 text-[10px] font-bold text-indigo">
              {g.leader.charAt(0).toUpperCase()}
            </span>
            <span className="text-xs font-semibold text-indigo">{g.leader}</span>
          </span>
        ) : (
          <span className="text-xs italic text-faint">Non assigné</span>
        ),
    },
    {
      id: "address",
      header: "Quartier / Adresse",
      sortable: true,
      sortValue: (g) => g.address,
      cell: (g) => (
        <div>
          <p className="text-xs font-semibold text-indigo">{g.address}</p>
          {g.schedule && <p className="mt-0.5 text-[11px] text-body">{g.schedule}</p>}
        </div>
      ),
    },
    {
      id: "coordinates",
      header: "Coordonnées",
      className: "font-mono text-xs text-faint",
      cell: (g) =>
        g.latitude != null && g.longitude != null ? (
          <span title={g.zone_name ?? undefined}>
            {g.latitude.toFixed(4)}, {g.longitude.toFixed(4)}
          </span>
        ) : (
          <span className="italic">Non localisé</span>
        ),
    },
    {
      id: "is_active",
      header: "Statut",
      sortable: true,
      sortValue: (g) => (g.is_active ? 1 : 0),
      cell: (g) =>
        g.is_active ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-online/10 px-2.5 py-1 text-xs font-bold text-online">
            <Eye className="size-3" /> Actif
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-live/10 px-2.5 py-1 text-xs font-bold text-live">
            <EyeOff className="size-3" /> Inactif
          </span>
        ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (g) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => openEditModal(g)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[rgba(40,25,80,0.1)] text-indigo transition-colors hover:border-gold hover:bg-gold/5"
            title="Modifier"
          >
            <Edit className="size-3.5" />
          </button>
          <button
            onClick={() => setDeleteTarget(g)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-live/10 text-live transition-colors hover:bg-live/10"
            title="Supprimer"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const table = useServerDataTable<HomeGroup>({
    fetcher: getAdminHomeGroupsPaginated,
    initialData: initialHomeGroups,
    initialMeta,
    initialPerPage: HOME_GROUPS_PER_PAGE,
    buildFilters: (filters) => {
      const f = { ...serializeFiltersForQueryMaster(filters) };
      if (f.is_active__eq) f.is_active__eq = f.is_active__eq === "active" ? "1" : "0";
      return f;
    },
  });
  const setHomeGroups = table.setItems;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Ressources"
        title="Gestion des Groupes de maison"
        subtitle="Gérez les cellules de prière et de communion fraternelle réparties dans les quartiers."
        actions={
          <>
            <Link
              href="/admins/home-groups/applications"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[rgba(40,25,80,0.12)] bg-white px-5 py-2.5 text-sm font-bold text-body transition hover:bg-cream"
            >
              Voir les Candidatures
            </Link>
            <Button icon={<Plus className="size-4" />} onClick={openCreateModal}>
              Nouveau Groupe
            </Button>
          </>
        }
      />

      <StatusBanner status={status} className="mb-6" />

      <DataFilters
        search={table.search}
        onSearch={table.setSearch}
        placeholder="Rechercher par nom, responsable ou quartier…"
        fields={filterFields}
        filters={table.filters}
        onFilters={table.setFilters}
        onReset={table.resetFilters}
      />

      <DataTable
        columns={columns}
        rows={table.view}
        getKey={(g) => g.id}
        sortBy={table.sortBy}
        sortDir={table.sortDir}
        onSort={table.toggleSort}
        emptyLabel="Aucun groupe de maison trouvé."
        pagination={{
          page: table.page,
          pageCount: table.pageCount,
          total: table.total,
          perPage: table.perPage,
          onPageChange: table.setPage,
          onPerPageChange: (n) => {
            table.setPerPage(n);
            table.setPage(1);
          },
          itemLabel: "groupes de maison",
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Supprimer le groupe de maison ?"
        message={`Le groupe « ${deleteTarget?.name ?? ""} » sera définitivement supprimé.`}
        confirmLabel="Supprimer"
        loading={isPending}
        onConfirm={confirmDelete}
      />

      <Modal open={isModalOpen} onOpenChange={(o) => (o ? setIsModalOpen(true) : closeModal())} title={editingHomeGroup ? "Modifier le groupe de maison" : "Créer un groupe de maison"} size="lg">
        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-6">
            <Field label="Nom du groupe" required>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Cellule Ficgayo Temple" className={inputClass} />
            </Field>

            <Field label="Responsable / Leader">
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
            </Field>

            <LocationPicker
              value={{ address, latitude, longitude, zone: zoneName }}
              onChange={(next) => {
                setAddress(next.address);
                setLatitude(next.latitude);
                setLongitude(next.longitude);
                setZoneName(next.zone ?? null);
              }}
            />

            <Field label="Programme des réunions">
              <div className="flex flex-col gap-2.5">
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
                            : "border border-[rgba(40,25,80,0.12)] bg-white text-body hover:border-gold hover:text-indigo",
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
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
                      <span className="font-bold text-indigo">{composeSchedule(meetingDay, meetingTime) || "—"}</span>
                    </span>
                  )}
                </div>
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Ordre de tri">
                <input type="number" min={0} value={formSortOrder} onChange={(e) => setFormSortOrder(Number(e.target.value))} className={inputClass} />
              </Field>
              <Field label="Visibilité">
                <label className="flex h-[42px] cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="size-4 cursor-pointer accent-gold" />
                  <span className="text-[13px] font-semibold text-indigo">Afficher sur la carte</span>
                </label>
              </Field>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[rgba(40,25,80,0.08)] bg-cream px-6 py-4">
            <Button type="button" variant="secondary" size="sm" onClick={closeModal}>
              Annuler
            </Button>
            <Button type="submit" size="sm" loading={isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>
    </PageShell>
  );
}
