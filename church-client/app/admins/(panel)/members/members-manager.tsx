"use client";

import { useState, useTransition } from "react";
import { Mail, Pencil, Phone, Plus, Save, Search, Trash2, UserRound } from "lucide-react";

import type { AdminHomeGroup, AdminListMeta, AdminMember, AdminMemberPayload } from "@/lib/admin-api";
import {
  createAdminMember,
  deleteAdminMember,
  getAdminMembers,
  updateAdminMember,
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

const MEMBER_TYPES = [
  { key: "visiteur", label: "Visiteur" },
  { key: "membre", label: "Membre" },
  { key: "leader", label: "Leader" },
];
const memberTypeLabel = (key: string) => MEMBER_TYPES.find((t) => t.key === key)?.label ?? key;

const STATUSES: { key: string; label: string; tone: BadgeTone }[] = [
  { key: "actif", label: "Actif", tone: "success" },
  { key: "inactif", label: "Inactif", tone: "neutral" },
  { key: "transfere", label: "Transféré", tone: "info" },
  { key: "decede", label: "Décédé", tone: "neutral" },
];
const statusMeta = (key: string) => STATUSES.find((s) => s.key === key) ?? { key, label: key, tone: "neutral" as BadgeTone };

const emptyForm: AdminMemberPayload = {
  name: "",
  phone: "",
  email: "",
  gender: undefined,
  birthdate: "",
  address: "",
  marital_status: "",
  join_date: "",
  member_type: "membre",
  home_group_id: null,
  status: "actif",
  notes: "",
};

export function MembersManager({
  initialData,
  initialMeta,
  homeGroups,
  canManage,
}: {
  initialData: AdminMember[];
  initialMeta: AdminListMeta;
  homeGroups: AdminHomeGroup[];
  canManage: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);

  const {
    items: members,
    meta,
    isLoading,
    refresh,
  } = useServerList<AdminMember>({
    fetcher: (params) => getAdminMembers(params),
    params: {
      page,
      perPage,
      search,
      sort: { field: "created_at", dir: "desc" },
      filters: {
        ...(statusFilter ? { status__eq: statusFilter } : {}),
        ...(typeFilter ? { member_type__eq: typeFilter } : {}),
      },
    },
    initialData,
    initialMeta,
    loadOnMount: true,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminMember | null>(null);
  const [form, setForm] = useState<AdminMemberPayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminMember | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setStatus(null);
    setFormOpen(true);
  };

  const openEdit = (m: AdminMember) => {
    setEditing(m);
    setForm({
      name: m.name,
      phone: m.phone ?? "",
      email: m.email ?? "",
      gender: m.gender ?? undefined,
      birthdate: m.birthdate ?? "",
      address: m.address ?? "",
      marital_status: m.marital_status ?? "",
      join_date: m.join_date ?? "",
      member_type: m.member_type,
      home_group_id: m.home_group_id,
      status: m.status,
      notes: m.notes ?? "",
    });
    setStatus(null);
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    setSaving(true);
    startTransition(async () => {
      try {
        const payload: AdminMemberPayload = {
          ...form,
          name: form.name.trim(),
          phone: form.phone || null,
          email: form.email || null,
          birthdate: form.birthdate || null,
          address: form.address || null,
          marital_status: form.marital_status || null,
          join_date: form.join_date || null,
          notes: form.notes || null,
        };
        if (editing) {
          await updateAdminMember(editing.id, payload);
          setStatus({ type: "success", message: "Fidèle mis à jour." });
        } else {
          await createAdminMember(payload);
          setStatus({ type: "success", message: "Fidèle ajouté au registre." });
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
    const member = deleteTarget;
    if (!member) return;
    setDeleteTarget(null);
    startTransition(async () => {
      try {
        await deleteAdminMember(member.id);
        setStatus({ type: "success", message: "Fidèle supprimé." });
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
        title="Fidèles"
        subtitle={`${meta.total} fidèle${meta.total > 1 ? "s" : ""} inscrit${meta.total > 1 ? "s" : ""} au registre.`}
        actions={
          canManage && (
            <Button icon={<Plus className="size-4" />} onClick={openCreate}>
              Nouveau fidèle
            </Button>
          )
        }
      />

      <StatusBanner status={status} className="mb-6" />

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Nom, téléphone, e-mail…"
            className={cn(inputClass, "py-2 pl-9")}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="cursor-pointer rounded-xl border border-[rgba(40,25,80,0.12)] bg-white px-3 py-2.5 text-[13px] font-semibold text-indigo outline-none transition hover:border-gold focus:border-gold"
        >
          <option value="">Tous statuts</option>
          {STATUSES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="cursor-pointer rounded-xl border border-[rgba(40,25,80,0.12)] bg-white px-3 py-2.5 text-[13px] font-semibold text-indigo outline-none transition hover:border-gold focus:border-gold"
        >
          <option value="">Tous types</option>
          {MEMBER_TYPES.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[rgba(40,25,80,0.08)] bg-cream">
              <th className="px-6 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Fidèle</th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Contact</th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Groupe de maison</th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Type</th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Statut</th>
              <th className="px-6 py-3.5 text-right text-[11px] font-bold tracking-wider text-body uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
            {isLoading && (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-faint">Chargement…</td></tr>
            )}
            {!isLoading && members.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-faint">Aucun fidèle ne correspond à ces filtres.</td></tr>
            )}
            {!isLoading && members.map((m) => {
              const statusInfo = statusMeta(m.status);
              return (
                <tr key={m.id} className="hover:bg-cream/30">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-lilac text-indigo-mid">
                        <UserRound className="size-4" />
                      </span>
                      <div>
                        <div className="font-semibold text-indigo">{m.name}</div>
                        {m.join_date && <div className="text-[11px] text-faint">Depuis le {m.join_date}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-body-strong">
                    {m.phone && (
                      <div className="flex items-center gap-1.5 text-[13px]">
                        <Phone className="size-3.5 text-faint" /> {m.phone}
                      </div>
                    )}
                    {m.email && (
                      <div className="flex items-center gap-1.5 text-[12px] text-faint">
                        <Mail className="size-3.5" /> {m.email}
                      </div>
                    )}
                    {!m.phone && !m.email && <span className="text-faint">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-body-strong">{m.home_group_name ?? <span className="text-faint">—</span>}</td>
                  <td className="px-4 py-3.5">
                    <span className="rounded-md border border-gold/20 bg-gold/10 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-gold-dark">
                      {memberTypeLabel(m.member_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                  </td>
                  <td className="px-6 py-3.5">
                    {canManage && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(m)}
                          className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-cream hover:text-indigo"
                          title="Modifier"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(m)}
                          className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-live/10 hover:text-live"
                          title="Supprimer"
                        >
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
            itemLabel="fidèles"
          />
        </div>
      )}

      <Modal open={formOpen} onOpenChange={setFormOpen} title={editing ? "Modifier le fidèle" : "Nouveau fidèle"} size="md">
        <div className="grid grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2">
          <Field label="Nom complet" required className="sm:col-span-2">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="Téléphone">
            <input
              type="text"
              value={form.phone ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="E-mail">
            <input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="Genre">
            <select
              value={form.gender ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, gender: (e.target.value || undefined) as AdminMemberPayload["gender"] }))}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
            </select>
          </Field>
          <Field label="Date de naissance">
            <input
              type="date"
              value={form.birthdate ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, birthdate: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="Adresse" className="sm:col-span-2">
            <input
              type="text"
              value={form.address ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="Situation matrimoniale">
            <select
              value={form.marital_status ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, marital_status: e.target.value }))}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="celibataire">Célibataire</option>
              <option value="marie">Marié(e)</option>
              <option value="veuf">Veuf/Veuve</option>
              <option value="divorce">Divorcé(e)</option>
            </select>
          </Field>
          <Field label="Date d'adhésion">
            <input
              type="date"
              value={form.join_date ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, join_date: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="Type">
            <select
              value={form.member_type}
              onChange={(e) => setForm((f) => ({ ...f, member_type: e.target.value as AdminMemberPayload["member_type"] }))}
              className={inputClass}
            >
              {MEMBER_TYPES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Statut">
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as AdminMemberPayload["status"] }))}
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Groupe de maison" className="sm:col-span-2">
            <select
              value={form.home_group_id ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, home_group_id: e.target.value ? Number(e.target.value) : null }))}
              className={inputClass}
            >
              <option value="">Aucun</option>
              {homeGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
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
            disabled={!form.name.trim()}
            onClick={handleSave}
          >
            {editing ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Supprimer ce fidèle ?"
        message={`« ${deleteTarget?.name ?? ""} » sera retiré du registre.`}
        confirmLabel="Supprimer"
        loading={isPending}
        onConfirm={confirmDelete}
      />
    </PageShell>
  );
}
