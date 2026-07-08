"use client";

import { useState, useTransition } from "react";
import { Check, Layers, Pencil, Plus, Save, Trash2 } from "lucide-react";

import type { AdminMember, AdminTeam } from "@/lib/admin-api";
import { createAdminTeam, deleteAdminTeam, getAdminTeams, updateAdminTeam } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { PageShell, PageHeader } from "@/components/admin/data/page-shell";
import { Button } from "@/components/admin/ui/button";
import { Field, inputClass } from "@/components/admin/ui/field";
import { Badge } from "@/components/admin/ui/badge";
import { Modal } from "@/components/admin/ui/modal";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";

const emptyForm = { name: "", description: "", is_active: true, member_ids: [] as number[] };

export function TeamsManager({
  initialTeams,
  members,
  canManage,
}: {
  initialTeams: AdminTeam[];
  members: AdminMember[];
  canManage: boolean;
}) {
  const [teams, setTeams] = useState(initialTeams);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTeam | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminTeam | null>(null);

  const refresh = async () => {
    const res = await getAdminTeams({ page: 1, perPage: 50, sort: { field: "name", dir: "asc" } });
    setTeams(res.data);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setStatus(null);
    setFormOpen(true);
  };

  const openEdit = (team: AdminTeam) => {
    setEditing(team);
    setForm({
      name: team.name,
      description: team.description ?? "",
      is_active: team.is_active,
      member_ids: (team.members ?? []).map((m) => m.id),
    });
    setStatus(null);
    setFormOpen(true);
  };

  const toggleMember = (id: number) => {
    setForm((f) => ({
      ...f,
      member_ids: f.member_ids.includes(id) ? f.member_ids.filter((m) => m !== id) : [...f.member_ids, id],
    }));
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    setSaving(true);
    startTransition(async () => {
      try {
        const payload = {
          name: form.name.trim(),
          description: form.description || null,
          is_active: form.is_active,
          member_ids: form.member_ids,
        };
        if (editing) {
          await updateAdminTeam(editing.id, payload);
          setStatus({ type: "success", message: "Équipe mise à jour." });
        } else {
          await createAdminTeam(payload);
          setStatus({ type: "success", message: "Équipe créée." });
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

  const confirmDelete = () => {
    const team = deleteTarget;
    if (!team) return;
    setDeleteTarget(null);
    startTransition(async () => {
      try {
        await deleteAdminTeam(team.id);
        setStatus({ type: "success", message: "Équipe supprimée." });
        await refresh();
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Suppression impossible." });
      }
    });
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Vie de l'Église"
        title="Équipes de service"
        subtitle="Les départements qui servent aux cultes — planifie leur roster depuis la page Cultes."
        actions={
          canManage && (
            <Button icon={<Plus className="size-4" />} onClick={openCreate}>
              Nouvelle équipe
            </Button>
          )
        }
      />

      <StatusBanner status={status} className="mb-6" />

      <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[rgba(40,25,80,0.08)] bg-cream">
              <th className="px-6 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Équipe</th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Membres</th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Statut</th>
              <th className="px-6 py-3.5 text-right text-[11px] font-bold tracking-wider text-body uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
            {teams.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-faint">Aucune équipe créée.</td></tr>
            )}
            {teams.map((team) => (
              <tr key={team.id} className="hover:bg-cream/30">
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-gold-dark" />
                    <div>
                      <div className="font-semibold text-indigo">{team.name}</div>
                      {team.description && <div className="text-[11px] text-faint">{team.description}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 font-bold text-indigo">{team.members_count ?? 0}</td>
                <td className="px-4 py-3.5">
                  <Badge tone={team.is_active ? "success" : "neutral"}>{team.is_active ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="px-6 py-3.5">
                  {canManage && (
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(team)} className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-cream hover:text-indigo" title="Modifier">
                        <Pencil className="size-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(team)} className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-live/10 hover:text-live" title="Supprimer">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={formOpen} onOpenChange={setFormOpen} title={editing ? "Modifier l'équipe" : "Nouvelle équipe"} size="sm">
        <div className="grid grid-cols-1 gap-4 px-6 py-6">
          <Field label="Nom" required>
            <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex : Louange & Adoration" className={inputClass} />
          </Field>
          <Field label="Description" hint="Facultatif">
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className={inputClass} />
          </Field>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-body-strong">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="size-4 accent-gold-dark" />
            Équipe active
          </label>
          <Field label={`Membres (${form.member_ids.length})`}>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] p-2">
              {members.length === 0 && <p className="px-2 py-2 text-xs text-faint">Aucun fidèle enregistré.</p>}
              {members.map((m) => {
                const active = form.member_ids.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMember(m.id)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-white",
                      active && "bg-white"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded-[5px] border transition",
                        active ? "border-gold bg-gradient-to-br from-gold to-gold-dark text-white" : "border-[rgba(40,25,80,0.2)] bg-white"
                      )}
                    >
                      {active && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="font-semibold text-indigo">{m.name}</span>
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[rgba(40,25,80,0.08)] px-6 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={() => setFormOpen(false)}>Annuler</Button>
          <Button type="button" size="sm" icon={<Save className="size-3.5" />} loading={saving && isPending} disabled={!form.name.trim()} onClick={handleSave}>
            {editing ? "Enregistrer" : "Créer"}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Supprimer cette équipe ?"
        message={`« ${deleteTarget?.name ?? ""} » sera supprimée. Les plannings existants qui la référencent resteront intacts, sans équipe assignée.`}
        confirmLabel="Supprimer"
        loading={isPending}
        onConfirm={confirmDelete}
      />
    </PageShell>
  );
}
