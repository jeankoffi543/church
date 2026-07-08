"use client";

import { useState, useTransition } from "react";
import { Calendar, Coins, Layers, Pencil, Plus, Save, Search, Trash2, UserPlus, Users, X } from "lucide-react";

import type { AdminListMeta, AdminMember, AdminService, AdminTeam, ServiceAssignmentStatus } from "@/lib/admin-api";
import {
  createAdminService,
  deleteAdminService,
  getAdminServices,
  updateAdminService,
  upsertAdminServiceAssignments,
  upsertAttendances,
  upsertOfferingCollections,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { PageShell, PageHeader } from "@/components/admin/data/page-shell";
import { Button } from "@/components/admin/ui/button";
import { Field, inputClass } from "@/components/admin/ui/field";
import { Modal } from "@/components/admin/ui/modal";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";
import { Pagination } from "../_components/pagination";
import { useServerList } from "../_components/use-server-list";

const ASSIGNMENT_STATUSES: { key: ServiceAssignmentStatus; label: string }[] = [
  { key: "prevu", label: "Prévu" },
  { key: "confirme", label: "Confirmé" },
  { key: "absent", label: "Absent" },
];

type RosterLine = { member_id: number | ""; team_id: number | ""; role: string; status: ServiceAssignmentStatus; notes: string };

const SERVICE_TYPES = [
  { key: "culte_dominical", label: "Culte dominical" },
  { key: "etude_biblique", label: "Étude biblique" },
  { key: "veillee", label: "Veillée de prière" },
  { key: "culte_special", label: "Culte spécial" },
  { key: "autre", label: "Autre" },
];
const typeLabel = (key: string) => SERVICE_TYPES.find((t) => t.key === key)?.label ?? key;

const NATURES = [
  { key: "dime", label: "Dîme" },
  { key: "offrande", label: "Offrande" },
  { key: "projet", label: "Projet Maison de Feu" },
  { key: "missions", label: "Missions" },
];

const ATTENDANCE_CATEGORIES = [
  { key: "hommes", label: "Hommes" },
  { key: "femmes", label: "Femmes" },
  { key: "enfants", label: "Enfants" },
  { key: "visiteurs", label: "Visiteurs" },
];

const emptyForm = { title: "", type: "culte_dominical", date: "", start_time: "" };

export function ServicesManager({
  initialData,
  initialMeta,
  canManage,
  canRecordAttendance,
  canManageTeams,
  members,
  teams,
}: {
  initialData: AdminService[];
  initialMeta: AdminListMeta;
  canManage: boolean;
  canRecordAttendance: boolean;
  canManageTeams: boolean;
  members: AdminMember[];
  teams: AdminTeam[];
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);

  const {
    items: services,
    meta,
    isLoading,
    refresh,
  } = useServerList<AdminService>({
    fetcher: (params) => getAdminServices(params),
    params: { page, perPage, search, sort: { field: "date", dir: "desc" } },
    initialData,
    initialMeta,
    loadOnMount: true,
  });

  // Create / edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminService | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Collecte modal
  const [collecteFor, setCollecteFor] = useState<AdminService | null>(null);
  const [collecteAmounts, setCollecteAmounts] = useState<Record<string, string>>({});
  const [savingCollecte, setSavingCollecte] = useState(false);

  // Présences modal
  const [presenceFor, setPresenceFor] = useState<AdminService | null>(null);
  const [presenceCounts, setPresenceCounts] = useState<Record<string, string>>({});
  const [savingPresence, setSavingPresence] = useState(false);

  // Planning (équipes) modal
  const [rosterFor, setRosterFor] = useState<AdminService | null>(null);
  const [rosterLines, setRosterLines] = useState<RosterLine[]>([]);
  const [savingRoster, setSavingRoster] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminService | null>(null);

  const totalCollected = (s: AdminService) =>
    s.offering_collections.reduce((acc, c) => acc + c.amount, 0);

  const totalAttendance = (s: AdminService) =>
    s.attendances.reduce((acc, a) => acc + a.count, 0);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setStatus(null);
    setFormOpen(true);
  };

  const openEdit = (s: AdminService) => {
    setEditing(s);
    setForm({ title: s.title ?? "", type: s.type, date: s.date, start_time: s.start_time ?? "" });
    setStatus(null);
    setFormOpen(true);
  };

  const handleSaveService = () => {
    if (!form.type || !form.date) return;
    setSaving(true);
    startTransition(async () => {
      try {
        const payload = {
          title: form.title.trim() || null,
          type: form.type,
          date: form.date,
          start_time: form.start_time || null,
        };
        if (editing) {
          await updateAdminService(editing.id, payload);
          setStatus({ type: "success", message: "Culte mis à jour." });
        } else {
          await createAdminService(payload);
          setStatus({ type: "success", message: "Culte planifié." });
        }
        setFormOpen(false);
        await refresh();
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Enregistrement impossible." });
      } finally {
        setSaving(false);
      }
    });
  };

  const openCollecte = (s: AdminService) => {
    setCollecteFor(s);
    const amounts: Record<string, string> = {};
    for (const n of NATURES) {
      const existing = s.offering_collections.find((c) => c.nature === n.key);
      amounts[n.key] = existing ? String(existing.amount) : "";
    }
    setCollecteAmounts(amounts);
    setStatus(null);
  };

  const handleSaveCollecte = () => {
    if (!collecteFor) return;
    const lines = NATURES
      .map((n) => ({ nature: n.key, amount: Number(collecteAmounts[n.key] || 0) }))
      .filter((l) => l.amount > 0);

    if (lines.length === 0) {
      setStatus({ type: "error", message: "Renseigne au moins un montant." });
      return;
    }

    setSavingCollecte(true);
    startTransition(async () => {
      try {
        await upsertOfferingCollections(collecteFor.id, lines);
        setStatus({ type: "success", message: `Collecte enregistrée pour le ${collecteFor.date}.` });
        setCollecteFor(null);
        await refresh();
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Enregistrement impossible." });
      } finally {
        setSavingCollecte(false);
      }
    });
  };

  const openPresence = (s: AdminService) => {
    setPresenceFor(s);
    const counts: Record<string, string> = {};
    for (const c of ATTENDANCE_CATEGORIES) {
      const existing = s.attendances.find((a) => a.category === c.key);
      counts[c.key] = existing ? String(existing.count) : "";
    }
    setPresenceCounts(counts);
    setStatus(null);
  };

  const handleSavePresence = () => {
    if (!presenceFor) return;
    const lines = ATTENDANCE_CATEGORIES
      .map((c) => ({ category: c.key, count: Number(presenceCounts[c.key] || 0) }))
      .filter((l) => l.count > 0);

    if (lines.length === 0) {
      setStatus({ type: "error", message: "Renseigne au moins un effectif." });
      return;
    }

    setSavingPresence(true);
    startTransition(async () => {
      try {
        await upsertAttendances(presenceFor.id, lines);
        setStatus({ type: "success", message: `Présences enregistrées pour le ${presenceFor.date}.` });
        setPresenceFor(null);
        await refresh();
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Enregistrement impossible." });
      } finally {
        setSavingPresence(false);
      }
    });
  };

  const openRoster = (s: AdminService) => {
    setRosterFor(s);
    setRosterLines(
      s.assignments.map((a) => ({
        member_id: a.member_id,
        team_id: a.team_id ?? "",
        role: a.role,
        status: a.status,
        notes: a.notes ?? "",
      }))
    );
    setStatus(null);
  };

  const addRosterLine = () => {
    setRosterLines((lines) => [...lines, { member_id: "", team_id: "", role: "", status: "prevu", notes: "" }]);
  };

  const removeRosterLine = (index: number) => {
    setRosterLines((lines) => lines.filter((_, i) => i !== index));
  };

  const updateRosterLine = (index: number, patch: Partial<RosterLine>) => {
    setRosterLines((lines) => lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const handleSaveRoster = () => {
    if (!rosterFor) return;
    const lines = rosterLines.filter((l) => l.member_id && l.role.trim());
    if (lines.length !== rosterLines.length) {
      setStatus({ type: "error", message: "Chaque ligne doit avoir un membre et un rôle." });
      return;
    }

    setSavingRoster(true);
    startTransition(async () => {
      try {
        await upsertAdminServiceAssignments(
          rosterFor.id,
          lines.map((l) => ({
            member_id: Number(l.member_id),
            team_id: l.team_id ? Number(l.team_id) : null,
            role: l.role.trim(),
            status: l.status,
            notes: l.notes || null,
          }))
        );
        setStatus({ type: "success", message: `Planning enregistré pour le ${rosterFor.date}.` });
        setRosterFor(null);
        await refresh();
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Enregistrement impossible." });
      } finally {
        setSavingRoster(false);
      }
    });
  };

  const confirmDelete = () => {
    const service = deleteTarget;
    if (!service) return;
    setDeleteTarget(null);
    startTransition(async () => {
      try {
        await deleteAdminService(service.id);
        setStatus({ type: "success", message: "Culte supprimé." });
        await refresh();
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Suppression impossible." });
      }
    });
  };

  const pageCount = Math.max(1, Math.ceil(meta.total / meta.per_page));

  return (
    <PageShell>
      <PageHeader
        eyebrow="Vie de l'Église"
        title="Cultes"
        subtitle={`${meta.total} culte${meta.total > 1 ? "s" : ""} planifié${meta.total > 1 ? "s" : ""} · saisis la collecte en espèces après chaque culte.`}
        actions={
          canManage && (
            <Button icon={<Plus className="size-4" />} onClick={openCreate}>
              Nouveau culte
            </Button>
          )
        }
      />

      <StatusBanner status={status} className="mb-6" />

      <div className="mb-5 relative max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Rechercher un titre…"
          className={cn(inputClass, "py-2 pl-9")}
        />
      </div>

      <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[rgba(40,25,80,0.08)] bg-cream">
              <th className="px-6 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Date</th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Type</th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Titre</th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Collecte</th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Présences</th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Équipe</th>
              <th className="px-6 py-3.5 text-right text-[11px] font-bold tracking-wider text-body uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-faint">Chargement…</td>
              </tr>
            )}
            {!isLoading && services.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-faint">Aucun culte enregistré.</td>
              </tr>
            )}
            {!isLoading && services.map((s) => (
              <tr key={s.id} className="hover:bg-cream/30">
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-faint" />
                    <div>
                      <div className="font-semibold text-indigo">{s.date}</div>
                      {s.start_time && <div className="text-[11px] text-faint">{s.start_time}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="rounded-md border border-gold/20 bg-gold/10 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-gold-dark">
                    {typeLabel(s.type)}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-body-strong">{s.title || "—"}</td>
                <td className="px-4 py-3.5 font-bold text-indigo">
                  {totalCollected(s) > 0
                    ? `${totalCollected(s).toLocaleString("fr-FR")} F CFA`
                    : <span className="font-normal text-faint">Non saisie</span>}
                </td>
                <td className="px-4 py-3.5 font-bold text-indigo">
                  {totalAttendance(s) > 0
                    ? `${totalAttendance(s).toLocaleString("fr-FR")} pers.`
                    : <span className="font-normal text-faint">Non saisies</span>}
                </td>
                <td className="px-4 py-3.5 font-bold text-indigo">
                  {s.assignments.length > 0
                    ? `${s.assignments.length} serviteur${s.assignments.length > 1 ? "s" : ""}`
                    : <span className="font-normal text-faint">Non planifiée</span>}
                </td>
                <td className="px-6 py-3.5">
                  <div className="flex items-center justify-end gap-2">
                    {canRecordAttendance && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Users className="size-3.5" />}
                        onClick={() => openPresence(s)}
                      >
                        Présences
                      </Button>
                    )}
                    {canManageTeams && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Layers className="size-3.5" />}
                        onClick={() => openRoster(s)}
                      >
                        Planning
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Coins className="size-3.5" />}
                      onClick={() => openCollecte(s)}
                    >
                      Collecte
                    </Button>
                    {canManage && (
                      <>
                        <button
                          onClick={() => openEdit(s)}
                          className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-cream hover:text-indigo"
                          title="Modifier"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-live/10 hover:text-live"
                          title="Supprimer"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta.total > 0 && (
        <div className="mt-4 overflow-hidden rounded-[14px] border border-[rgba(40,25,80,0.08)] bg-white">
          <Pagination
            page={meta.current_page}
            pageCount={pageCount}
            total={meta.total}
            perPage={meta.per_page}
            onPageChange={setPage}
            onPerPageChange={(n) => {
              setPerPage(n);
              setPage(1);
            }}
            itemLabel="cultes"
          />
        </div>
      )}

      {/* Create / edit modal */}
      <Modal open={formOpen} onOpenChange={setFormOpen} title={editing ? "Modifier le culte" : "Nouveau culte"} size="sm">
        <div className="grid grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2">
          <Field label="Type" className="sm:col-span-2">
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className={inputClass}
            >
              {SERVICE_TYPES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Titre" hint="Facultatif" className="sm:col-span-2">
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex : Veillée spéciale Pâques"
              className={inputClass}
            />
          </Field>
          <Field label="Date" required>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="Heure" hint="Facultatif">
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
              className={inputClass}
            />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[rgba(40,25,80,0.08)] px-6 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={() => setFormOpen(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            icon={<Save className="size-3.5" />}
            loading={saving && isPending}
            disabled={!form.type || !form.date}
            onClick={handleSaveService}
          >
            {editing ? "Enregistrer" : "Planifier"}
          </Button>
        </div>
      </Modal>

      {/* Collecte modal */}
      <Modal
        open={collecteFor !== null}
        onOpenChange={(o) => !o && setCollecteFor(null)}
        title="Saisir la collecte du culte"
        description={collecteFor ? `${typeLabel(collecteFor.type)} · ${collecteFor.date}` : undefined}
        size="sm"
      >
        <div className="space-y-3.5 px-6 py-6">
          {NATURES.map((n) => (
            <Field key={n.key} label={n.label}>
              <input
                type="number"
                min="0"
                step="1"
                value={collecteAmounts[n.key] ?? ""}
                onChange={(e) => setCollecteAmounts((prev) => ({ ...prev, [n.key]: e.target.value }))}
                placeholder="0"
                className={inputClass}
              />
            </Field>
          ))}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[rgba(40,25,80,0.08)] px-6 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={() => setCollecteFor(null)}>
            Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            icon={<Save className="size-3.5" />}
            loading={savingCollecte && isPending}
            onClick={handleSaveCollecte}
          >
            Enregistrer la collecte
          </Button>
        </div>
      </Modal>

      {/* Présences modal */}
      <Modal
        open={presenceFor !== null}
        onOpenChange={(o) => !o && setPresenceFor(null)}
        title="Saisir les présences du culte"
        description={presenceFor ? `${typeLabel(presenceFor.type)} · ${presenceFor.date}` : undefined}
        size="sm"
      >
        <div className="space-y-3.5 px-6 py-6">
          {ATTENDANCE_CATEGORIES.map((c) => (
            <Field key={c.key} label={c.label}>
              <input
                type="number"
                min="0"
                step="1"
                value={presenceCounts[c.key] ?? ""}
                onChange={(e) => setPresenceCounts((prev) => ({ ...prev, [c.key]: e.target.value }))}
                placeholder="0"
                className={inputClass}
              />
            </Field>
          ))}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[rgba(40,25,80,0.08)] px-6 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={() => setPresenceFor(null)}>
            Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            icon={<Save className="size-3.5" />}
            loading={savingPresence && isPending}
            onClick={handleSavePresence}
          >
            Enregistrer les présences
          </Button>
        </div>
      </Modal>

      {/* Planning (équipes) modal */}
      <Modal
        open={rosterFor !== null}
        onOpenChange={(o) => !o && setRosterFor(null)}
        title="Planning des équipes de service"
        description={rosterFor ? `${typeLabel(rosterFor.type)} · ${rosterFor.date}` : undefined}
        size="lg"
      >
        <div className="space-y-3 px-6 py-6">
          {rosterLines.length === 0 && (
            <p className="rounded-xl border border-dashed border-[rgba(40,25,80,0.15)] px-4 py-6 text-center text-sm text-faint">
              Aucun serviteur planifié pour ce culte.
            </p>
          )}
          {rosterLines.map((line, index) => (
            <div key={index} className="grid grid-cols-1 gap-2.5 rounded-xl border border-[rgba(40,25,80,0.08)] bg-cream/40 p-3.5 sm:grid-cols-[1.4fr_1.1fr_1.1fr_1fr_auto]">
              <select
                value={line.member_id}
                onChange={(e) => updateRosterLine(index, { member_id: e.target.value ? Number(e.target.value) : "" })}
                className={cn(inputClass, "py-2")}
              >
                <option value="">Membre…</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select
                value={line.team_id}
                onChange={(e) => updateRosterLine(index, { team_id: e.target.value ? Number(e.target.value) : "" })}
                className={cn(inputClass, "py-2")}
              >
                <option value="">Sans équipe</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input
                type="text"
                value={line.role}
                onChange={(e) => updateRosterLine(index, { role: e.target.value })}
                placeholder="Rôle (ex : Chantre)"
                className={cn(inputClass, "py-2")}
              />
              <select
                value={line.status}
                onChange={(e) => updateRosterLine(index, { status: e.target.value as ServiceAssignmentStatus })}
                className={cn(inputClass, "py-2")}
              >
                {ASSIGNMENT_STATUSES.map((st) => <option key={st.key} value={st.key}>{st.label}</option>)}
              </select>
              <button
                type="button"
                onClick={() => removeRosterLine(index)}
                className="flex cursor-pointer items-center justify-center rounded-lg p-2 text-faint transition hover:bg-live/10 hover:text-live"
                title="Retirer"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" icon={<UserPlus className="size-3.5" />} onClick={addRosterLine}>
            Ajouter un serviteur
          </Button>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[rgba(40,25,80,0.08)] px-6 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={() => setRosterFor(null)}>
            Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            icon={<Save className="size-3.5" />}
            loading={savingRoster && isPending}
            onClick={handleSaveRoster}
          >
            Enregistrer le planning
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Supprimer ce culte ?"
        message={`Le culte du ${deleteTarget?.date ?? ""} sera supprimé. Impossible si une collecte y est déjà rattachée.`}
        confirmLabel="Supprimer"
        loading={isPending}
        onConfirm={confirmDelete}
      />
    </PageShell>
  );
}
