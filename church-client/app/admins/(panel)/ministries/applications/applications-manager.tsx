"use client";

import { useCallback, useState, useTransition } from "react";
import { Loader2, CheckCircle, XCircle, Clock, Inbox, Mail, Phone, MessageCircle, ShieldCheck, User } from "lucide-react";

import type { AdminMe, AdminMinistryApplication, AdminListMeta } from "@/lib/admin-api";
import { approveMinistryApplication, rejectMinistryApplication, getMinistryApplicationsPaginated } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { PageShell, PageHeader } from "@/components/admin/data/page-shell";
import { DataTable } from "@/components/admin/data/data-table";
import { type Column } from "@/components/admin/data/use-data-table";
import { useServerDataTable } from "@/components/admin/data/use-server-data-table";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";

export const MINISTRY_APPLICATIONS_PER_PAGE = 10;

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "pending", label: "En attente" },
  { key: "approved", label: "Approuvées" },
  { key: "rejected", label: "Rejetées" },
];

const STATUS_CONFIG: Record<
  AdminMinistryApplication["status"],
  { label: string; bg: string; text: string; dot: string; pulse?: boolean }
> = {
  pending: { label: "En attente", bg: "bg-gold/10", text: "text-gold-dark", dot: "bg-gold", pulse: true },
  approved: { label: "Approuvée", bg: "bg-online/10", text: "text-online", dot: "bg-online" },
  rejected: { label: "Rejetée", bg: "bg-live/10", text: "text-live", dot: "bg-live" },
};

export function ApplicationsManager({
  initialApplications,
  initialMeta,
  initialPendingCount,
  me,
}: {
  initialApplications: AdminMinistryApplication[];
  initialMeta: AdminListMeta;
  initialPendingCount: number;
  me: AdminMe;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);

  const [decisionNote, setDecisionNote] = useState("");
  const [decisionNotePublic, setDecisionNotePublic] = useState(false);

  const table = useServerDataTable<AdminMinistryApplication>({
    fetcher: getMinistryApplicationsPaginated,
    initialData: initialApplications,
    initialMeta,
    initialPerPage: MINISTRY_APPLICATIONS_PER_PAGE,
    extraFilters: statusFilter === "all" ? undefined : { status: statusFilter },
  });
  const applications = table.view;
  const setApplications = table.setItems;

  const [pendingCount, setPendingCount] = useState(initialPendingCount);
  const refreshPending = useCallback(() => {
    getMinistryApplicationsPaginated({ filters: { status: "pending" }, perPage: 1 })
      .then((res) => setPendingCount(res.meta.total))
      .catch(() => {});
  }, []);

  const openApplication = (application: AdminMinistryApplication) => {
    setSelectedId(application.id);
    setDecisionNote(application.decision_note ?? "");
    setDecisionNotePublic(application.decision_note_public);
    setStatus(null);
  };

  const isGlobalValidator = me.is_super_admin || me.roles.includes("Pasteur");
  const canValidate = (application: AdminMinistryApplication): boolean =>
    isGlobalValidator || me.id === application.ministry?.chef_id;

  const selected = applications.find((a) => a.id === selectedId) ?? null;

  const replaceInList = (updated: AdminMinistryApplication) => {
    setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    table.refresh();
    refreshPending();
  };

  const handleDecision = (application: AdminMinistryApplication, decision: "approve" | "reject") => {
    setStatus(null);
    startTransition(async () => {
      try {
        const payload = { decision_note: decisionNote.trim() || null, decision_note_public: decisionNotePublic };
        const res =
          decision === "approve"
            ? await approveMinistryApplication(application.id, payload)
            : await rejectMinistryApplication(application.id, payload);
        replaceInList(res.data);
        setStatus({ type: "success", message: decision === "approve" ? "Candidature approuvée." : "Candidature rejetée." });
        setSelectedId(null);
      } catch (err) {
        const message = (err as Error).message;
        setStatus({
          type: "error",
          message:
            message === "FORBIDDEN"
              ? "Accès restreint : vous n'êtes pas le chef désigné de ce ministère."
              : message || "Action impossible.",
        });
      }
    });
  };

  const whatsappUrl = (application: AdminMinistryApplication) => {
    const phone = application.phone.replace(/[^0-9]/g, "");
    const text = encodeURIComponent(`Bonjour ${application.name}, merci pour votre candidature au ministère « ${application.ministry?.name ?? ""} » à MFM Ficgayo.`);
    return `https://wa.me/${phone}?text=${text}`;
  };

  const columns: Column<AdminMinistryApplication>[] = [
    {
      id: "candidate",
      header: "Candidat",
      cell: (a) => (
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo/5 text-xs font-bold text-indigo">
            {a.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold">{a.name}</p>
            <p className="text-[11px] text-faint">{a.phone}</p>
            <p className="truncate text-[11px] text-faint">{a.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: "ministry",
      header: "Ministère",
      cell: (a) => <span className="rounded-full bg-indigo/5 px-2.5 py-1 text-[11px] font-bold text-indigo">{a.ministry?.name ?? "—"}</span>,
    },
    {
      id: "motivation",
      header: "Motivation",
      className: "max-w-[260px]",
      cell: (a) => <p className="truncate text-xs text-body">{a.motivation}</p>,
    },
    {
      id: "status",
      header: "Statut",
      cell: (a) => {
        const cfg = STATUS_CONFIG[a.status];
        return (
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold", cfg.bg, cfg.text)}>
            <span className={cn("size-1.5 rounded-full", cfg.dot, cfg.pulse && "animate-pulse")} />
            {cfg.label}
          </span>
        );
      },
    },
    {
      id: "created_at",
      header: "Date",
      className: "font-mono text-xs font-semibold text-faint",
      cell: (a) =>
        a.created_at ? new Date(a.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—",
    },
  ];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Recrutement"
        title="Candidatures aux ministères"
        subtitle={`${table.total} candidature${table.total > 1 ? "s" : ""}${pendingCount > 0 ? ` · ${pendingCount} en attente` : ""} · ${
          isGlobalValidator ? "traitez les demandes de tous les ministères." : "traitez les demandes du ministère que vous dirigez."
        }`}
      />

      <StatusBanner status={status} className="mb-6" />

      {/* Status filter pills */}
      <div className="mb-6 flex w-fit items-center gap-1.5 rounded-xl border border-[rgba(40,25,80,0.1)] bg-white p-1 shadow-[0_1px_3px_rgba(22,15,51,0.02)]">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setStatusFilter(f.key);
              table.setPage(1);
            }}
            className={cn(
              "cursor-pointer rounded-[10px] px-3.5 py-2 text-xs font-bold transition",
              statusFilter === f.key ? "bg-indigo text-white shadow-sm" : "text-body hover:bg-cream hover:text-indigo",
            )}
          >
            {f.label}
            {f.key === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full bg-gold text-[9px] font-black text-indigo">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={table.view}
        getKey={(a) => a.id}
        sortBy={table.sortBy}
        sortDir={table.sortDir}
        onSort={table.toggleSort}
        onRowClick={openApplication}
        rowClassName={(a) => (selectedId === a.id ? "bg-gold/5" : undefined)}
        empty={
          <div className="flex flex-col items-center gap-3 py-8">
            <Inbox className="size-10 text-gold/40" />
            <p className="text-sm font-semibold text-body-strong">Aucune candidature</p>
            <p className="max-w-xs text-xs text-body">Les nouvelles demandes de recrutement apparaîtront ici.</p>
          </div>
        }
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
          itemLabel: "candidatures",
        }}
      />

      {/* Processing modal (bespoke) */}
      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        {selected && (
          <DialogContent
            showCloseButton
            className="w-[95vw] md:max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-0 gap-0 border-0 outline-none animate-fade-up"
          >
            <div className="flex items-center justify-between border-b border-[rgba(40,25,80,0.08)] px-6 py-4">
              <div>
                <span className="text-[10px] font-bold tracking-[0.18em] text-gold-dark uppercase">Demande d’adhésion - {selected.ministry?.name ?? "—"}</span>
                <h2 className="mt-0.5 font-display text-xl font-bold text-indigo italic">{selected.name}</h2>
              </div>
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold", STATUS_CONFIG[selected.status].bg, STATUS_CONFIG[selected.status].text)}>
                {selected.status === "pending" && <Clock className="size-3" />}
                {selected.status === "approved" && <CheckCircle className="size-3" />}
                {selected.status === "rejected" && <XCircle className="size-3" />}
                {STATUS_CONFIG[selected.status].label}
              </span>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl border border-[rgba(40,25,80,0.1)] bg-muted/10 px-3.5 py-2.5">
                  <User className="size-4 text-faint" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-faint uppercase">Nom complet</div>
                    <div className="truncate text-sm font-semibold text-indigo">{selected.name}</div>
                  </div>
                </div>

                <a href={`mailto:${selected.email}`} className="flex items-center gap-3 rounded-xl border border-[rgba(40,25,80,0.1)] bg-muted/10 px-3.5 py-2.5 transition hover:border-gold hover:bg-cream">
                  <Mail className="size-4 text-faint" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-faint uppercase">Email</div>
                    <div className="truncate text-sm font-semibold text-indigo">{selected.email}</div>
                  </div>
                </a>

                <div className="flex items-center justify-between gap-2 rounded-xl border border-[rgba(40,25,80,0.1)] bg-muted/10 px-3.5 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <Phone className="size-4 text-faint" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-faint uppercase">Téléphone</div>
                      <a href={`tel:${selected.phone}`} className="truncate text-sm font-semibold text-indigo hover:underline">{selected.phone}</a>
                    </div>
                  </div>
                  <a
                    href={whatsappUrl(selected)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#25D366] text-white shadow-sm transition hover:brightness-110"
                    title="Contacter sur WhatsApp"
                  >
                    <MessageCircle className="size-4" />
                  </a>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-[rgba(40,25,80,0.1)] bg-muted/10 px-3.5 py-2.5">
                  <ShieldCheck className="size-4 text-faint" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-faint uppercase">Ministère visé</div>
                    <div className="truncate text-sm font-semibold text-indigo">{selected.ministry?.name || "Non spécifié"}</div>
                  </div>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">Motivation</h3>
                <p className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed whitespace-pre-line text-body-strong">{selected.motivation}</p>
              </section>
            </div>

            <div className="space-y-4 border-t border-[rgba(40,25,80,0.08)] px-6 py-4">
              {canValidate(selected) ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">
                      Motif de la décision <span className="font-normal normal-case tracking-normal text-faint">(optionnel)</span>
                    </label>
                    <textarea
                      value={decisionNote}
                      onChange={(e) => setDecisionNote(e.target.value)}
                      rows={2}
                      placeholder="Ajoutez un motif (ex. raison du refus, équipe assignée…)"
                      className="w-full resize-none rounded-xl border border-[rgba(40,25,80,0.12)] bg-cream px-3.5 py-2.5 text-sm leading-relaxed text-indigo outline-none transition placeholder:text-faint focus:border-gold"
                    />
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(40,25,80,0.1)] bg-cream/50 px-3.5 py-2.5">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-indigo">Visible par le candidat</p>
                        <p className="text-[11px] text-body">
                          {decisionNotePublic ? "Le motif sera affiché lors du suivi de sa candidature." : "Le motif reste interne (non visible par le candidat)."}
                        </p>
                      </div>
                      <Switch checked={decisionNotePublic} onCheckedChange={setDecisionNotePublic} label="Partager le motif avec le candidat" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleDecision(selected, "approve")}
                      disabled={isPending || selected.status === "approved"}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-online/10 px-4 py-3 text-xs font-bold text-online transition hover:bg-online/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                      Approuver
                    </button>
                    <button
                      onClick={() => handleDecision(selected, "reject")}
                      disabled={isPending || selected.status === "rejected"}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-live/20 px-4 py-3 text-xs font-bold text-live transition hover:bg-live/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isPending ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                      Rejeter
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {selected.decision_note && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">Motif de la décision</p>
                      <p className="rounded-xl bg-cream p-3 text-sm leading-relaxed text-body-strong">{selected.decision_note}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-cream/60 px-4 py-3 text-xs font-semibold text-body">
                    <ShieldCheck className="size-4 text-faint" />
                    Seul le chef désigné de ce ministère peut traiter cette candidature.
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </PageShell>
  );
}
