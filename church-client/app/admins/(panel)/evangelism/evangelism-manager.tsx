"use client";

import { useState, useTransition } from "react";
import { Calendar, Flame, ListChecks, Mail, MapPin, Pencil, Phone, Plus, Save, Search, Trash2, UserRound } from "lucide-react";

import type {
  AdminConvert,
  AdminConvertPayload,
  AdminEvangelismCampaign,
  AdminListMeta,
  AdminServant,
} from "@/lib/admin-api";
import {
  createAdminConvert,
  createAdminEvangelismCampaign,
  deleteAdminConvert,
  deleteAdminEvangelismCampaign,
  getAdminConverts,
  getAdminEvangelismCampaigns,
  updateAdminConvert,
  updateAdminEvangelismCampaign,
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

const DECISION_TYPES = [
  { key: "nouvelle_conversion", label: "Nouvelle conversion" },
  { key: "reengagement", label: "Réengagement" },
];
const decisionTypeLabel = (key: string) => DECISION_TYPES.find((d) => d.key === key)?.label ?? key;

const CONVERT_STATUSES: { key: string; label: string; tone: BadgeTone }[] = [
  { key: "nouveau", label: "Nouveau", tone: "info" },
  { key: "en_cours_de_suivi", label: "En cours de suivi", tone: "warning" },
  { key: "integre", label: "Intégré", tone: "success" },
  { key: "perdu_de_vue", label: "Perdu de vue", tone: "neutral" },
];
const convertStatusMeta = (key: string) =>
  CONVERT_STATUSES.find((s) => s.key === key) ?? { key, label: key, tone: "neutral" as BadgeTone };

const emptyConvertForm: AdminConvertPayload = {
  name: "",
  phone: "",
  email: "",
  decision_type: "nouvelle_conversion",
  decision_date: "",
  evangelism_campaign_id: null,
  assigned_counselor_id: null,
  status: "nouveau",
  notes: "",
};

const emptyCampaignForm = { title: "", date: "", location: "", notes: "" };

export function EvangelismManager({
  initialConverts,
  initialConvertsMeta,
  initialCampaigns,
  campaignsMeta,
  servants,
  canManage,
}: {
  initialConverts: AdminConvert[];
  initialConvertsMeta: AdminListMeta;
  initialCampaigns: AdminEvangelismCampaign[];
  campaignsMeta: AdminListMeta;
  servants: AdminServant[];
  canManage: boolean;
}) {
  const [tab, setTab] = useState<"converts" | "campaigns">("converts");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);

  /* ── Nouvelles âmes ─────────────────────────────────────────────── */

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const {
    items: converts,
    meta: convertsMeta,
    isLoading: convertsLoading,
    refresh: refreshConverts,
  } = useServerList<AdminConvert>({
    fetcher: (params) => getAdminConverts(params),
    params: {
      page,
      perPage,
      search,
      sort: { field: "decision_date", dir: "desc" },
      filters: statusFilter ? { status__eq: statusFilter } : {},
    },
    initialData: initialConverts,
    initialMeta: initialConvertsMeta,
    loadOnMount: true,
  });

  const [campaigns, setCampaigns] = useState(initialCampaigns);

  const [convertFormOpen, setConvertFormOpen] = useState(false);
  const [editingConvert, setEditingConvert] = useState<AdminConvert | null>(null);
  const [convertForm, setConvertForm] = useState<AdminConvertPayload>(emptyConvertForm);
  const [savingConvert, setSavingConvert] = useState(false);
  const [deleteConvertTarget, setDeleteConvertTarget] = useState<AdminConvert | null>(null);

  const openCreateConvert = () => {
    setEditingConvert(null);
    setConvertForm(emptyConvertForm);
    setStatus(null);
    setConvertFormOpen(true);
  };

  const openEditConvert = (c: AdminConvert) => {
    setEditingConvert(c);
    setConvertForm({
      name: c.name,
      phone: c.phone ?? "",
      email: c.email ?? "",
      decision_type: c.decision_type,
      decision_date: c.decision_date,
      evangelism_campaign_id: c.evangelism_campaign_id,
      assigned_counselor_id: c.assigned_counselor_id,
      status: c.status,
      notes: c.notes ?? "",
    });
    setStatus(null);
    setConvertFormOpen(true);
  };

  const handleSaveConvert = () => {
    if (!convertForm.name.trim() || !convertForm.decision_date) return;
    setSavingConvert(true);
    startTransition(async () => {
      try {
        const payload: AdminConvertPayload = {
          ...convertForm,
          name: convertForm.name.trim(),
          phone: convertForm.phone || null,
          email: convertForm.email || null,
          notes: convertForm.notes || null,
        };
        if (editingConvert) {
          await updateAdminConvert(editingConvert.id, payload);
          setStatus({ type: "success", message: "Nouvelle âme mise à jour." });
        } else {
          await createAdminConvert(payload);
          setStatus({ type: "success", message: "Nouvelle âme enregistrée." });
        }
        setConvertFormOpen(false);
        await refreshConverts();
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Enregistrement impossible." });
      } finally {
        setSavingConvert(false);
      }
    });
  };

  const confirmDeleteConvert = () => {
    const convert = deleteConvertTarget;
    if (!convert) return;
    setDeleteConvertTarget(null);
    startTransition(async () => {
      try {
        await deleteAdminConvert(convert.id);
        setStatus({ type: "success", message: "Nouvelle âme supprimée." });
        await refreshConverts();
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Suppression impossible." });
      }
    });
  };

  /* ── Campagnes ──────────────────────────────────────────────────── */

  const [campaignFormOpen, setCampaignFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<AdminEvangelismCampaign | null>(null);
  const [campaignForm, setCampaignForm] = useState(emptyCampaignForm);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [deleteCampaignTarget, setDeleteCampaignTarget] = useState<AdminEvangelismCampaign | null>(null);

  const refreshCampaigns = async () => {
    const res = await getAdminEvangelismCampaigns({ page: 1, perPage: 50, sort: { field: "date", dir: "desc" } });
    setCampaigns(res.data);
  };

  const openCreateCampaign = () => {
    setEditingCampaign(null);
    setCampaignForm(emptyCampaignForm);
    setStatus(null);
    setCampaignFormOpen(true);
  };

  const openEditCampaign = (c: AdminEvangelismCampaign) => {
    setEditingCampaign(c);
    setCampaignForm({ title: c.title, date: c.date, location: c.location ?? "", notes: c.notes ?? "" });
    setStatus(null);
    setCampaignFormOpen(true);
  };

  const handleSaveCampaign = () => {
    if (!campaignForm.title.trim() || !campaignForm.date) return;
    setSavingCampaign(true);
    startTransition(async () => {
      try {
        const payload = {
          title: campaignForm.title.trim(),
          date: campaignForm.date,
          location: campaignForm.location || null,
          notes: campaignForm.notes || null,
        };
        if (editingCampaign) {
          await updateAdminEvangelismCampaign(editingCampaign.id, payload);
          setStatus({ type: "success", message: "Campagne mise à jour." });
        } else {
          await createAdminEvangelismCampaign(payload);
          setStatus({ type: "success", message: "Campagne créée." });
        }
        setCampaignFormOpen(false);
        await refreshCampaigns();
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Enregistrement impossible." });
      } finally {
        setSavingCampaign(false);
      }
    });
  };

  const confirmDeleteCampaign = () => {
    const campaign = deleteCampaignTarget;
    if (!campaign) return;
    setDeleteCampaignTarget(null);
    startTransition(async () => {
      try {
        await deleteAdminEvangelismCampaign(campaign.id);
        setStatus({ type: "success", message: "Campagne supprimée." });
        await refreshCampaigns();
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Suppression impossible." });
      }
    });
  };

  const convertsPageCount = Math.max(1, Math.ceil(convertsMeta.total / convertsMeta.per_page));

  return (
    <PageShell>
      <PageHeader
        eyebrow="Vie de l'Église"
        title="Évangélisation"
        subtitle="Campagnes de sortie et suivi des nouvelles âmes."
        actions={
          canManage && (
            <Button
              icon={<Plus className="size-4" />}
              onClick={tab === "converts" ? openCreateConvert : openCreateCampaign}
            >
              {tab === "converts" ? "Nouvelle âme" : "Nouvelle campagne"}
            </Button>
          )
        }
      />

      <StatusBanner status={status} className="mb-6" />

      <div className="mb-6 inline-flex rounded-xl border border-[rgba(40,25,80,0.1)] bg-white p-1">
        <TabButton active={tab === "converts"} onClick={() => setTab("converts")} icon={<UserRound className="size-4" />} label={`Nouvelles âmes (${convertsMeta.total})`} />
        <TabButton active={tab === "campaigns"} onClick={() => setTab("campaigns")} icon={<Flame className="size-4" />} label={`Campagnes (${campaignsMeta.total})`} />
      </div>

      {tab === "converts" ? (
        <>
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
              {CONVERT_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[rgba(40,25,80,0.08)] bg-cream">
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Nouvelle âme</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Contact</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Décision</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Conseiller</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Statut</th>
                  <th className="px-6 py-3.5 text-right text-[11px] font-bold tracking-wider text-body uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
                {convertsLoading && (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-faint">Chargement…</td></tr>
                )}
                {!convertsLoading && converts.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-faint">Aucune nouvelle âme ne correspond à ces filtres.</td></tr>
                )}
                {!convertsLoading && converts.map((c) => {
                  const meta = convertStatusMeta(c.status);
                  return (
                    <tr key={c.id} className="hover:bg-cream/30">
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-indigo">{c.name}</div>
                        <div className="text-[11px] text-faint">
                          {c.evangelism_campaign_title ?? "Sans campagne"}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-body-strong">
                        {c.phone && <div className="flex items-center gap-1.5 text-[13px]"><Phone className="size-3.5 text-faint" /> {c.phone}</div>}
                        {c.email && <div className="flex items-center gap-1.5 text-[12px] text-faint"><Mail className="size-3.5" /> {c.email}</div>}
                        {!c.phone && !c.email && <span className="text-faint">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-[13px] text-body-strong">
                          <Calendar className="size-3.5 text-faint" /> {c.decision_date}
                        </div>
                        <div className="text-[11px] text-faint">{decisionTypeLabel(c.decision_type)}</div>
                      </td>
                      <td className="px-4 py-3.5 text-body-strong">{c.assigned_counselor_name ?? <span className="text-faint">Non assigné</span>}</td>
                      <td className="px-4 py-3.5"><Badge tone={meta.tone}>{meta.label}</Badge></td>
                      <td className="px-6 py-3.5">
                        {canManage && (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openEditConvert(c)} className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-cream hover:text-indigo" title="Modifier">
                              <Pencil className="size-4" />
                            </button>
                            <button onClick={() => setDeleteConvertTarget(c)} className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-live/10 hover:text-live" title="Supprimer">
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

          {convertsMeta.total > 0 && (
            <div className="mt-4 overflow-hidden rounded-[14px] border border-[rgba(40,25,80,0.08)] bg-white">
              <Pagination
                page={convertsMeta.current_page}
                pageCount={convertsPageCount}
                total={convertsMeta.total}
                perPage={convertsMeta.per_page}
                onPageChange={setPage}
                onPerPageChange={(n) => {
                  setPerPage(n);
                  setPage(1);
                }}
                itemLabel="nouvelles âmes"
              />
            </div>
          )}
        </>
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[rgba(40,25,80,0.08)] bg-cream">
                <th className="px-6 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Campagne</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Lieu</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Nouvelles âmes</th>
                <th className="px-6 py-3.5 text-right text-[11px] font-bold tracking-wider text-body uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
              {campaigns.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-faint">Aucune campagne enregistrée.</td></tr>
              )}
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-cream/30">
                  <td className="px-6 py-3.5">
                    <div className="font-semibold text-indigo">{c.title}</div>
                    <div className="flex items-center gap-1.5 text-[11px] text-faint"><Calendar className="size-3.5" /> {c.date}</div>
                  </td>
                  <td className="px-4 py-3.5 text-body-strong">
                    {c.location ? <span className="flex items-center gap-1.5"><MapPin className="size-3.5 text-faint" /> {c.location}</span> : <span className="text-faint">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="flex items-center gap-1.5 font-bold text-indigo">
                      <ListChecks className="size-3.5 text-faint" /> {c.converts_count ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    {canManage && (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditCampaign(c)} className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-cream hover:text-indigo" title="Modifier">
                          <Pencil className="size-4" />
                        </button>
                        <button onClick={() => setDeleteCampaignTarget(c)} className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-live/10 hover:text-live" title="Supprimer">
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
      )}

      {/* Convert modal */}
      <Modal open={convertFormOpen} onOpenChange={setConvertFormOpen} title={editingConvert ? "Modifier la nouvelle âme" : "Nouvelle âme"} size="md">
        <div className="grid grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2">
          <Field label="Nom complet" required className="sm:col-span-2">
            <input type="text" value={convertForm.name} onChange={(e) => setConvertForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Téléphone">
            <input type="text" value={convertForm.phone ?? ""} onChange={(e) => setConvertForm((f) => ({ ...f, phone: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="E-mail">
            <input type="email" value={convertForm.email ?? ""} onChange={(e) => setConvertForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Type de décision">
            <select value={convertForm.decision_type} onChange={(e) => setConvertForm((f) => ({ ...f, decision_type: e.target.value as AdminConvertPayload["decision_type"] }))} className={inputClass}>
              {DECISION_TYPES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </Field>
          <Field label="Date de décision" required>
            <input type="date" value={convertForm.decision_date} onChange={(e) => setConvertForm((f) => ({ ...f, decision_date: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Campagne d'origine" className="sm:col-span-2">
            <select
              value={convertForm.evangelism_campaign_id ?? ""}
              onChange={(e) => setConvertForm((f) => ({ ...f, evangelism_campaign_id: e.target.value ? Number(e.target.value) : null }))}
              className={inputClass}
            >
              <option value="">Aucune (ex : appel à l&apos;autel)</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title} · {c.date}</option>)}
            </select>
          </Field>
          <Field label="Conseiller assigné">
            <select
              value={convertForm.assigned_counselor_id ?? ""}
              onChange={(e) => setConvertForm((f) => ({ ...f, assigned_counselor_id: e.target.value ? Number(e.target.value) : null }))}
              className={inputClass}
            >
              <option value="">Non assigné</option>
              {servants.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Statut">
            <select value={convertForm.status} onChange={(e) => setConvertForm((f) => ({ ...f, status: e.target.value as AdminConvertPayload["status"] }))} className={inputClass}>
              {CONVERT_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea value={convertForm.notes ?? ""} onChange={(e) => setConvertForm((f) => ({ ...f, notes: e.target.value }))} rows={3} className={inputClass} />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[rgba(40,25,80,0.08)] px-6 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={() => setConvertFormOpen(false)}>Annuler</Button>
          <Button type="button" size="sm" icon={<Save className="size-3.5" />} loading={savingConvert && isPending} disabled={!convertForm.name.trim() || !convertForm.decision_date} onClick={handleSaveConvert}>
            {editingConvert ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </Modal>

      {/* Campaign modal */}
      <Modal open={campaignFormOpen} onOpenChange={setCampaignFormOpen} title={editingCampaign ? "Modifier la campagne" : "Nouvelle campagne"} size="sm">
        <div className="grid grid-cols-1 gap-4 px-6 py-6">
          <Field label="Titre" required>
            <input type="text" value={campaignForm.title} onChange={(e) => setCampaignForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex : Sortie évangélisation Yopougon" className={inputClass} />
          </Field>
          <Field label="Date" required>
            <input type="date" value={campaignForm.date} onChange={(e) => setCampaignForm((f) => ({ ...f, date: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Lieu" hint="Facultatif">
            <input type="text" value={campaignForm.location} onChange={(e) => setCampaignForm((f) => ({ ...f, location: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Notes" hint="Facultatif">
            <textarea value={campaignForm.notes} onChange={(e) => setCampaignForm((f) => ({ ...f, notes: e.target.value }))} rows={3} className={inputClass} />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[rgba(40,25,80,0.08)] px-6 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={() => setCampaignFormOpen(false)}>Annuler</Button>
          <Button type="button" size="sm" icon={<Save className="size-3.5" />} loading={savingCampaign && isPending} disabled={!campaignForm.title.trim() || !campaignForm.date} onClick={handleSaveCampaign}>
            {editingCampaign ? "Enregistrer" : "Créer"}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteConvertTarget !== null}
        onOpenChange={(o) => { if (!o) setDeleteConvertTarget(null); }}
        title="Supprimer cette nouvelle âme ?"
        message={`« ${deleteConvertTarget?.name ?? ""} » sera retiré du registre.`}
        confirmLabel="Supprimer"
        loading={isPending}
        onConfirm={confirmDeleteConvert}
      />

      <ConfirmDialog
        open={deleteCampaignTarget !== null}
        onOpenChange={(o) => { if (!o) setDeleteCampaignTarget(null); }}
        title="Supprimer cette campagne ?"
        message={`« ${deleteCampaignTarget?.title ?? ""} » sera supprimée.`}
        confirmLabel="Supprimer"
        loading={isPending}
        onConfirm={confirmDeleteCampaign}
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
