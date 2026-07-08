"use client";

import { useState, useTransition } from "react";
import { Boxes, Calendar, MapPin, Pencil, Plus, Save, Trash2 } from "lucide-react";

import type {
  AdminListMeta,
  AdminResource,
  AdminResourceBooking,
  ResourceBookingStatus,
  ResourceCondition,
  ResourceType,
} from "@/lib/admin-api";
import {
  createAdminResource,
  createAdminResourceBooking,
  deleteAdminResource,
  deleteAdminResourceBooking,
  getAdminResourceBookings,
  getAdminResources,
  updateAdminResource,
  updateAdminResourceBooking,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { PageShell, PageHeader } from "@/components/admin/data/page-shell";
import { Button } from "@/components/admin/ui/button";
import { Field, inputClass } from "@/components/admin/ui/field";
import { Badge, type BadgeTone } from "@/components/admin/ui/badge";
import { Modal } from "@/components/admin/ui/modal";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";
import { Pagination } from "../_components/pagination";
import { useServerList } from "../_components/use-server-list";

const RESOURCE_TYPES: { key: ResourceType; label: string }[] = [
  { key: "salle", label: "Salle" },
  { key: "vehicule", label: "Véhicule" },
  { key: "materiel", label: "Matériel" },
  { key: "autre", label: "Autre" },
];
const resourceTypeLabel = (key: string) => RESOURCE_TYPES.find((t) => t.key === key)?.label ?? key;

const CONDITIONS: { key: ResourceCondition; label: string; tone: BadgeTone }[] = [
  { key: "bon", label: "Bon état", tone: "success" },
  { key: "moyen", label: "État moyen", tone: "warning" },
  { key: "hors_service", label: "Hors service", tone: "neutral" },
];
const conditionMeta = (key: string) => CONDITIONS.find((c) => c.key === key) ?? { key, label: key, tone: "neutral" as BadgeTone };

const BOOKING_STATUSES: { key: ResourceBookingStatus; label: string; tone: BadgeTone }[] = [
  { key: "confirme", label: "Confirmée", tone: "success" },
  { key: "annule", label: "Annulée", tone: "neutral" },
];
const bookingStatusMeta = (key: string) => BOOKING_STATUSES.find((s) => s.key === key) ?? { key, label: key, tone: "neutral" as BadgeTone };

const emptyResourceForm = { name: "", type: "salle" as ResourceType, description: "", location: "", condition: "bon" as ResourceCondition, is_active: true };
const emptyBookingForm = { resource_id: "" as number | "", title: "", starts_at: "", ends_at: "", notes: "" };

export function ResourcesManager({
  initialResources,
  initialBookings,
  initialBookingsMeta,
  canManage,
}: {
  initialResources: AdminResource[];
  initialBookings: AdminResourceBooking[];
  initialBookingsMeta: AdminListMeta;
  canManage: boolean;
}) {
  const [tab, setTab] = useState<"resources" | "bookings">("resources");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);

  /* ── Ressources ─────────────────────────────────────────────────── */

  const [resources, setResources] = useState(initialResources);
  const [resourceFormOpen, setResourceFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<AdminResource | null>(null);
  const [resourceForm, setResourceForm] = useState(emptyResourceForm);
  const [savingResource, setSavingResource] = useState(false);
  const [deleteResourceTarget, setDeleteResourceTarget] = useState<AdminResource | null>(null);

  const refreshResources = async () => {
    const res = await getAdminResources({ page: 1, perPage: 50, sort: { field: "name", dir: "asc" } });
    setResources(res.data);
  };

  const openCreateResource = () => {
    setEditingResource(null);
    setResourceForm(emptyResourceForm);
    setStatus(null);
    setResourceFormOpen(true);
  };

  const openEditResource = (r: AdminResource) => {
    setEditingResource(r);
    setResourceForm({
      name: r.name,
      type: r.type,
      description: r.description ?? "",
      location: r.location ?? "",
      condition: r.condition,
      is_active: r.is_active,
    });
    setStatus(null);
    setResourceFormOpen(true);
  };

  const handleSaveResource = () => {
    if (!resourceForm.name.trim()) return;
    setSavingResource(true);
    startTransition(async () => {
      try {
        const payload = {
          name: resourceForm.name.trim(),
          type: resourceForm.type,
          description: resourceForm.description || null,
          location: resourceForm.location || null,
          condition: resourceForm.condition,
          is_active: resourceForm.is_active,
        };
        if (editingResource) {
          await updateAdminResource(editingResource.id, payload);
          setStatus({ type: "success", message: "Ressource mise à jour." });
        } else {
          await createAdminResource(payload);
          setStatus({ type: "success", message: "Ressource ajoutée à l'inventaire." });
        }
        setResourceFormOpen(false);
        await refreshResources();
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Enregistrement impossible." });
      } finally {
        setSavingResource(false);
      }
    });
  };

  const confirmDeleteResource = () => {
    const resource = deleteResourceTarget;
    if (!resource) return;
    setDeleteResourceTarget(null);
    startTransition(async () => {
      try {
        await deleteAdminResource(resource.id);
        setStatus({ type: "success", message: "Ressource supprimée." });
        await refreshResources();
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Suppression impossible." });
      }
    });
  };

  /* ── Réservations ───────────────────────────────────────────────── */

  const [bookingPage, setBookingPage] = useState(1);
  const [bookingPerPage, setBookingPerPage] = useState(20);

  const {
    items: bookings,
    meta: bookingsMeta,
    isLoading: bookingsLoading,
    refresh: refreshBookings,
  } = useServerList<AdminResourceBooking>({
    fetcher: (params) => getAdminResourceBookings(params),
    params: { page: bookingPage, perPage: bookingPerPage, sort: { field: "starts_at", dir: "asc" } },
    initialData: initialBookings,
    initialMeta: initialBookingsMeta,
    loadOnMount: true,
  });

  const [bookingFormOpen, setBookingFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<AdminResourceBooking | null>(null);
  const [bookingForm, setBookingForm] = useState(emptyBookingForm);
  const [savingBooking, setSavingBooking] = useState(false);
  const [deleteBookingTarget, setDeleteBookingTarget] = useState<AdminResourceBooking | null>(null);

  const openCreateBooking = () => {
    setEditingBooking(null);
    setBookingForm(emptyBookingForm);
    setStatus(null);
    setBookingFormOpen(true);
  };

  const openEditBooking = (b: AdminResourceBooking) => {
    setEditingBooking(b);
    setBookingForm({
      resource_id: b.resource_id,
      title: b.title,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
      notes: b.notes ?? "",
    });
    setStatus(null);
    setBookingFormOpen(true);
  };

  const handleSaveBooking = () => {
    if (!bookingForm.resource_id || !bookingForm.title.trim() || !bookingForm.starts_at || !bookingForm.ends_at) return;
    setSavingBooking(true);
    startTransition(async () => {
      try {
        const payload = {
          resource_id: Number(bookingForm.resource_id),
          title: bookingForm.title.trim(),
          starts_at: bookingForm.starts_at,
          ends_at: bookingForm.ends_at,
          notes: bookingForm.notes || null,
        };
        if (editingBooking) {
          await updateAdminResourceBooking(editingBooking.id, payload);
          setStatus({ type: "success", message: "Réservation mise à jour." });
        } else {
          await createAdminResourceBooking(payload);
          setStatus({ type: "success", message: "Réservation créée." });
        }
        setBookingFormOpen(false);
        await refreshBookings();
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Enregistrement impossible." });
      } finally {
        setSavingBooking(false);
      }
    });
  };

  const confirmDeleteBooking = () => {
    const booking = deleteBookingTarget;
    if (!booking) return;
    setDeleteBookingTarget(null);
    startTransition(async () => {
      try {
        await deleteAdminResourceBooking(booking.id);
        setStatus({ type: "success", message: "Réservation supprimée." });
        await refreshBookings();
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Suppression impossible." });
      }
    });
  };

  const bookingsPageCount = Math.max(1, Math.ceil(bookingsMeta.total / bookingsMeta.per_page));

  return (
    <PageShell>
      <PageHeader
        eyebrow="Vie de l'Église"
        title="Logistique"
        subtitle="Inventaire des salles, véhicules et matériel — et leurs réservations."
        actions={
          canManage && (
            <Button icon={<Plus className="size-4" />} onClick={tab === "resources" ? openCreateResource : openCreateBooking}>
              {tab === "resources" ? "Nouvelle ressource" : "Nouvelle réservation"}
            </Button>
          )
        }
      />

      <StatusBanner status={status} className="mb-6" />

      <div className="mb-6 inline-flex rounded-xl border border-[rgba(40,25,80,0.1)] bg-white p-1">
        <TabButton active={tab === "resources"} onClick={() => setTab("resources")} icon={<Boxes className="size-4" />} label={`Ressources (${resources.length})`} />
        <TabButton active={tab === "bookings"} onClick={() => setTab("bookings")} icon={<Calendar className="size-4" />} label={`Réservations (${bookingsMeta.total})`} />
      </div>

      {tab === "resources" ? (
        <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[rgba(40,25,80,0.08)] bg-cream">
                <th className="px-6 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Ressource</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Type</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">État</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Réservations</th>
                <th className="px-6 py-3.5 text-right text-[11px] font-bold tracking-wider text-body uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
              {resources.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-faint">Aucune ressource enregistrée.</td></tr>
              )}
              {resources.map((r) => {
                const cond = conditionMeta(r.condition);
                return (
                  <tr key={r.id} className="hover:bg-cream/30">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-indigo">{r.name}</div>
                      {r.location && <div className="flex items-center gap-1.5 text-[11px] text-faint"><MapPin className="size-3" /> {r.location}</div>}
                      {!r.is_active && <div className="mt-0.5 text-[11px] font-bold text-live">Inactive</div>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-md border border-gold/20 bg-gold/10 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-gold-dark">
                        {resourceTypeLabel(r.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5"><Badge tone={cond.tone}>{cond.label}</Badge></td>
                    <td className="px-4 py-3.5 font-bold text-indigo">{r.bookings_count ?? 0}</td>
                    <td className="px-6 py-3.5">
                      {canManage && (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditResource(r)} className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-cream hover:text-indigo" title="Modifier">
                            <Pencil className="size-4" />
                          </button>
                          <button onClick={() => setDeleteResourceTarget(r)} className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-live/10 hover:text-live" title="Supprimer">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[rgba(40,25,80,0.08)] bg-cream">
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Réservation</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Ressource</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Créneau</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Statut</th>
                  <th className="px-6 py-3.5 text-right text-[11px] font-bold tracking-wider text-body uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
                {bookingsLoading && (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-faint">Chargement…</td></tr>
                )}
                {!bookingsLoading && bookings.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-faint">Aucune réservation.</td></tr>
                )}
                {!bookingsLoading && bookings.map((b) => {
                  const statusInfo = bookingStatusMeta(b.status);
                  return (
                    <tr key={b.id} className="hover:bg-cream/30">
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-indigo">{b.title}</div>
                        <div className="text-[11px] text-faint">{b.booked_by_name ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3.5 text-body-strong">{b.resource_name ?? "—"}</td>
                      <td className="px-4 py-3.5 text-body-strong">
                        <div className="flex items-center gap-1.5 text-[13px]"><Calendar className="size-3.5 text-faint" /> {b.starts_at.replace("T", " ")}</div>
                        <div className="text-[11px] text-faint">→ {b.ends_at.replace("T", " ")}</div>
                      </td>
                      <td className="px-4 py-3.5"><Badge tone={statusInfo.tone}>{statusInfo.label}</Badge></td>
                      <td className="px-6 py-3.5">
                        {canManage && (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openEditBooking(b)} className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-cream hover:text-indigo" title="Modifier">
                              <Pencil className="size-4" />
                            </button>
                            <button onClick={() => setDeleteBookingTarget(b)} className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-live/10 hover:text-live" title="Supprimer">
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {bookingsMeta.total > 0 && (
            <div className="mt-4 overflow-hidden rounded-[14px] border border-[rgba(40,25,80,0.08)] bg-white">
              <Pagination
                page={bookingsMeta.current_page}
                pageCount={bookingsPageCount}
                total={bookingsMeta.total}
                perPage={bookingsMeta.per_page}
                onPageChange={setBookingPage}
                onPerPageChange={(n) => {
                  setBookingPerPage(n);
                  setBookingPage(1);
                }}
                itemLabel="réservations"
              />
            </div>
          )}
        </>
      )}

      {/* Resource modal */}
      <Modal open={resourceFormOpen} onOpenChange={setResourceFormOpen} title={editingResource ? "Modifier la ressource" : "Nouvelle ressource"} size="sm">
        <div className="grid grid-cols-1 gap-4 px-6 py-6">
          <Field label="Nom" required>
            <input type="text" value={resourceForm.name} onChange={(e) => setResourceForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex : Bus 30 places" className={inputClass} />
          </Field>
          <Field label="Type">
            <select value={resourceForm.type} onChange={(e) => setResourceForm((f) => ({ ...f, type: e.target.value as ResourceType }))} className={inputClass}>
              {RESOURCE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Lieu / localisation" hint="Facultatif">
            <input type="text" value={resourceForm.location} onChange={(e) => setResourceForm((f) => ({ ...f, location: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="État">
            <select value={resourceForm.condition} onChange={(e) => setResourceForm((f) => ({ ...f, condition: e.target.value as ResourceCondition }))} className={inputClass}>
              {CONDITIONS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Description" hint="Facultatif">
            <textarea value={resourceForm.description} onChange={(e) => setResourceForm((f) => ({ ...f, description: e.target.value }))} rows={3} className={inputClass} />
          </Field>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-body-strong">
            <input type="checkbox" checked={resourceForm.is_active} onChange={(e) => setResourceForm((f) => ({ ...f, is_active: e.target.checked }))} className="size-4 accent-gold-dark" />
            Disponible à la réservation
          </label>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[rgba(40,25,80,0.08)] px-6 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={() => setResourceFormOpen(false)}>Annuler</Button>
          <Button type="button" size="sm" icon={<Save className="size-3.5" />} loading={savingResource && isPending} disabled={!resourceForm.name.trim()} onClick={handleSaveResource}>
            {editingResource ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </Modal>

      {/* Booking modal */}
      <Modal open={bookingFormOpen} onOpenChange={setBookingFormOpen} title={editingBooking ? "Modifier la réservation" : "Nouvelle réservation"} size="sm">
        <div className="grid grid-cols-1 gap-4 px-6 py-6">
          <Field label="Ressource" required>
            <select value={bookingForm.resource_id} onChange={(e) => setBookingForm((f) => ({ ...f, resource_id: e.target.value ? Number(e.target.value) : "" }))} className={inputClass}>
              <option value="">Sélectionner…</option>
              {resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <Field label="Titre" required>
            <input type="text" value={bookingForm.title} onChange={(e) => setBookingForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex : Culte spécial Pâques" className={inputClass} />
          </Field>
          <Field label="Début" required>
            <input type="datetime-local" value={bookingForm.starts_at} onChange={(e) => setBookingForm((f) => ({ ...f, starts_at: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Fin" required>
            <input type="datetime-local" value={bookingForm.ends_at} onChange={(e) => setBookingForm((f) => ({ ...f, ends_at: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Notes" hint="Facultatif">
            <textarea value={bookingForm.notes} onChange={(e) => setBookingForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className={inputClass} />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[rgba(40,25,80,0.08)] px-6 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={() => setBookingFormOpen(false)}>Annuler</Button>
          <Button
            type="button"
            size="sm"
            icon={<Save className="size-3.5" />}
            loading={savingBooking && isPending}
            disabled={!bookingForm.resource_id || !bookingForm.title.trim() || !bookingForm.starts_at || !bookingForm.ends_at}
            onClick={handleSaveBooking}
          >
            {editingBooking ? "Enregistrer" : "Réserver"}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteResourceTarget !== null}
        onOpenChange={(o) => { if (!o) setDeleteResourceTarget(null); }}
        title="Supprimer cette ressource ?"
        message={`« ${deleteResourceTarget?.name ?? ""} » sera retirée de l'inventaire. Impossible si des réservations y sont déjà rattachées.`}
        confirmLabel="Supprimer"
        loading={isPending}
        onConfirm={confirmDeleteResource}
      />

      <ConfirmDialog
        open={deleteBookingTarget !== null}
        onOpenChange={(o) => { if (!o) setDeleteBookingTarget(null); }}
        title="Supprimer cette réservation ?"
        message={`« ${deleteBookingTarget?.title ?? ""} » sera supprimée.`}
        confirmLabel="Supprimer"
        loading={isPending}
        onConfirm={confirmDeleteBooking}
      />
    </PageShell>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-bold transition",
        active ? "bg-gradient-to-br from-gold to-gold-dark text-indigo shadow-sm" : "text-body hover:text-indigo",
      )}
    >
      {icon} {label}
    </button>
  );
}
