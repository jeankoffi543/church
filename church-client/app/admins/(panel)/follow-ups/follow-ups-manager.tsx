"use client";

import { useState, useTransition } from "react";
import { Calendar, MessageSquarePlus, Phone, Plus, Save } from "lucide-react";

import type {
  AdminConvert,
  AdminFollowUp,
  AdminListMeta,
  AdminMember,
  AdminServant,
  FollowUpActionType,
  FollowUpFollowableType,
  FollowUpStatus,
} from "@/lib/admin-api";
import {
  addAdminFollowUpNote,
  createAdminFollowUp,
  getAdminFollowUp,
  getAdminFollowUps,
  updateAdminFollowUp,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { PageShell, PageHeader } from "@/components/admin/data/page-shell";
import { Button } from "@/components/admin/ui/button";
import { Field, inputClass } from "@/components/admin/ui/field";
import { Badge, type BadgeTone } from "@/components/admin/ui/badge";
import { Modal } from "@/components/admin/ui/modal";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";
import { Pagination } from "../_components/pagination";
import { useServerList } from "../_components/use-server-list";

const STATUSES: { key: FollowUpStatus; label: string; tone: BadgeTone }[] = [
  { key: "nouveau", label: "Nouveau", tone: "info" },
  { key: "contacte", label: "Contacté", tone: "warning" },
  { key: "visite_programmee", label: "Visite programmée", tone: "warning" },
  { key: "integre", label: "Intégré", tone: "success" },
  { key: "abandonne", label: "Abandonné", tone: "neutral" },
];
const statusMeta = (key: string) => STATUSES.find((s) => s.key === key) ?? { key, label: key, tone: "neutral" as BadgeTone };

const ACTION_TYPES: { key: FollowUpActionType; label: string }[] = [
  { key: "appel", label: "Appel" },
  { key: "visite", label: "Visite" },
  { key: "sms", label: "SMS" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "autre", label: "Autre" },
];

const followableTypeLabel = (t: string) => (t === "convert" ? "Nouvelle âme" : "Fidèle");

export function FollowUpsManager({
  initialData,
  initialMeta,
  converts,
  members,
  servants,
  canManage,
}: {
  initialData: AdminFollowUp[];
  initialMeta: AdminListMeta;
  converts: AdminConvert[];
  members: AdminMember[];
  servants: AdminServant[];
  canManage: boolean;
}) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);

  const {
    items: followUps,
    meta,
    isLoading,
    refresh,
  } = useServerList<AdminFollowUp>({
    fetcher: (params) => getAdminFollowUps(params),
    params: { page, perPage, sort: { field: "created_at", dir: "desc" } },
    initialData,
    initialMeta,
    loadOnMount: true,
  });

  /* ── Create modal ───────────────────────────────────────────────── */

  const [createOpen, setCreateOpen] = useState(false);
  const [targetType, setTargetType] = useState<FollowUpFollowableType>("convert");
  const [targetId, setTargetId] = useState<number | "">("");
  const [assignedTo, setAssignedTo] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setTargetType("convert");
    setTargetId("");
    setAssignedTo("");
    setStatus(null);
    setCreateOpen(true);
  };

  const handleCreate = () => {
    if (!targetId) return;
    setSaving(true);
    startTransition(async () => {
      try {
        await createAdminFollowUp({
          followable_type: targetType,
          followable_id: Number(targetId),
          assigned_to: assignedTo ? Number(assignedTo) : null,
        });
        setStatus({ type: "success", message: "Suivi créé." });
        setCreateOpen(false);
        await refresh();
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Création impossible." });
      } finally {
        setSaving(false);
      }
    });
  };

  /* ── Detail modal ───────────────────────────────────────────────── */

  const [detail, setDetail] = useState<AdminFollowUp | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailStatus, setDetailStatus] = useState<FollowUpStatus>("nouveau");
  const [detailAssignedTo, setDetailAssignedTo] = useState<number | "">("");
  const [detailNextAction, setDetailNextAction] = useState("");
  const [savingDetail, setSavingDetail] = useState(false);

  const [noteType, setNoteType] = useState<FollowUpActionType>("appel");
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const openDetail = (id: number) => {
    setDetailLoading(true);
    setDetail(null);
    startTransition(async () => {
      try {
        const full = await getAdminFollowUp(id);
        setDetail(full);
        setDetailStatus(full.status);
        setDetailAssignedTo(full.assigned_to ?? "");
        setDetailNextAction(full.next_action_date ?? "");
        setNoteText("");
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Impossible d'ouvrir ce dossier." });
      } finally {
        setDetailLoading(false);
      }
    });
  };

  const handleSaveDetail = () => {
    if (!detail) return;
    setSavingDetail(true);
    startTransition(async () => {
      try {
        const updated = await updateAdminFollowUp(detail.id, {
          status: detailStatus,
          assigned_to: detailAssignedTo ? Number(detailAssignedTo) : null,
          next_action_date: detailNextAction || null,
        });
        setDetail(updated);
        setStatus({ type: "success", message: "Dossier mis à jour." });
        await refresh();
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Mise à jour impossible." });
      } finally {
        setSavingDetail(false);
      }
    });
  };

  const handleAddNote = () => {
    if (!detail || !noteText.trim()) return;
    setSavingNote(true);
    startTransition(async () => {
      try {
        await addAdminFollowUpNote(detail.id, { action_type: noteType, note: noteText.trim() });
        const full = await getAdminFollowUp(detail.id);
        setDetail(full);
        setNoteText("");
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Ajout de note impossible." });
      } finally {
        setSavingNote(false);
      }
    });
  };

  const pageCount = Math.max(1, Math.ceil(meta.total / meta.per_page));
  const targetOptions = targetType === "convert" ? converts : members;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Vie de l'Église"
        title="Suivi des âmes"
        subtitle={`${meta.total} dossier${meta.total > 1 ? "s" : ""} de suivi pastoral — les tiens, ou tous si tu es Pasteur.`}
        actions={
          canManage && (
            <Button icon={<Plus className="size-4" />} onClick={openCreate}>
              Nouveau suivi
            </Button>
          )
        }
      />

      <StatusBanner status={status} className="mb-6" />

      <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[rgba(40,25,80,0.08)] bg-cream">
              <th className="px-6 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Personne suivie</th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Conseiller</th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Statut</th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Prochaine action</th>
              <th className="px-6 py-3.5 text-right text-[11px] font-bold tracking-wider text-body uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
            {isLoading && (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-faint">Chargement…</td></tr>
            )}
            {!isLoading && followUps.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-faint">Aucun dossier de suivi.</td></tr>
            )}
            {!isLoading && followUps.map((f) => {
              const statusInfo = statusMeta(f.status);
              return (
                <tr key={f.id} className="hover:bg-cream/30">
                  <td className="px-6 py-3.5">
                    <div className="font-semibold text-indigo">{f.followable_name ?? "—"}</div>
                    <div className="text-[11px] text-faint">{followableTypeLabel(f.followable_type)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-body-strong">{f.counselor_name ?? <span className="text-faint">Non assigné</span>}</td>
                  <td className="px-4 py-3.5"><Badge tone={statusInfo.tone}>{statusInfo.label}</Badge></td>
                  <td className="px-4 py-3.5 text-body-strong">
                    {f.next_action_date
                      ? <span className="flex items-center gap-1.5"><Calendar className="size-3.5 text-faint" /> {f.next_action_date}</span>
                      : <span className="text-faint">—</span>}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <Button variant="secondary" size="sm" onClick={() => openDetail(f.id)}>
                      Ouvrir
                    </Button>
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
            itemLabel="dossiers"
          />
        </div>
      )}

      {/* Create modal */}
      <Modal open={createOpen} onOpenChange={setCreateOpen} title="Nouveau suivi" size="sm">
        <div className="grid grid-cols-1 gap-4 px-6 py-6">
          <Field label="Type de cible">
            <select
              value={targetType}
              onChange={(e) => {
                setTargetType(e.target.value as FollowUpFollowableType);
                setTargetId("");
              }}
              className={inputClass}
            >
              <option value="convert">Nouvelle âme</option>
              <option value="member">Fidèle</option>
            </select>
          </Field>
          <Field label="Personne" required>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value ? Number(e.target.value) : "")} className={inputClass}>
              <option value="">Sélectionner…</option>
              {targetOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Conseiller assigné">
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value ? Number(e.target.value) : "")} className={inputClass}>
              <option value="">Non assigné</option>
              {servants.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[rgba(40,25,80,0.08)] px-6 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>Annuler</Button>
          <Button type="button" size="sm" icon={<Save className="size-3.5" />} loading={saving && isPending} disabled={!targetId} onClick={handleCreate}>
            Créer
          </Button>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal open={detail !== null || detailLoading} onOpenChange={(o) => !o && setDetail(null)} title={detail?.followable_name ?? "Dossier de suivi"} description={detail ? followableTypeLabel(detail.followable_type) : undefined} size="lg">
        {detailLoading || !detail ? (
          <div className="px-6 py-10 text-center text-sm text-faint">Chargement…</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-2">
            <div className="space-y-4">
              <Field label="Statut">
                <select value={detailStatus} onChange={(e) => setDetailStatus(e.target.value as FollowUpStatus)} className={inputClass}>
                  {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Conseiller assigné">
                <select value={detailAssignedTo} onChange={(e) => setDetailAssignedTo(e.target.value ? Number(e.target.value) : "")} className={inputClass}>
                  <option value="">Non assigné</option>
                  {servants.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Prochaine action">
                <input type="date" value={detailNextAction} onChange={(e) => setDetailNextAction(e.target.value)} className={inputClass} />
              </Field>
              <Button size="sm" icon={<Save className="size-3.5" />} loading={savingDetail && isPending} onClick={handleSaveDetail}>
                Enregistrer
              </Button>
            </div>

            <div>
              <h3 className="mb-3 text-[13px] font-bold text-body-strong">Historique</h3>
              <div className="max-h-[260px] space-y-3 overflow-y-auto rounded-xl border border-[rgba(40,25,80,0.08)] bg-cream/40 p-3.5">
                {detail.notes.length === 0 && (
                  <p className="text-center text-xs text-faint">Aucune note pour l&apos;instant.</p>
                )}
                {detail.notes.map((n) => (
                  <div key={n.id} className="rounded-lg border border-[rgba(40,25,80,0.06)] bg-white p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gold-dark">
                        <Phone className="size-3" /> {ACTION_TYPES.find((a) => a.key === n.action_type)?.label ?? n.action_type}
                      </span>
                      <span className="text-[10px] text-faint">{n.author_name ?? "—"}</span>
                    </div>
                    <p className="text-[13px] text-body-strong">{n.note}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <select value={noteType} onChange={(e) => setNoteType(e.target.value as FollowUpActionType)} className={cn(inputClass, "w-36 py-2")}>
                    {ACTION_TYPES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
                  </select>
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Ajouter une note…"
                    className={cn(inputClass, "flex-1 py-2")}
                    onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                  />
                  <Button size="sm" icon={<MessageSquarePlus className="size-3.5" />} loading={savingNote && isPending} disabled={!noteText.trim()} onClick={handleAddNote}>
                    Ajouter
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
