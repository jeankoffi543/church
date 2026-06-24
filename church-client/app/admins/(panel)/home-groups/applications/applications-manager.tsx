"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Search, CheckCircle, XCircle, Clock, Mail, Phone, MessageCircle, ShieldCheck, Loader2, Home, User, ArrowLeft } from "lucide-react";

import {
  type AdminHomeGroup,
  type AdminHomeGroupApplication,
  type AdminMe,
  type AdminListMeta,
  approveHomeGroupApplication,
  rejectHomeGroupApplication,
  getAdminHomeGroupApplicationsPaginated,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { PageShell, PageHeader } from "@/components/admin/data/page-shell";
import { DataTable } from "@/components/admin/data/data-table";
import { type Column } from "@/components/admin/data/use-data-table";
import { useServerDataTable } from "@/components/admin/data/use-server-data-table";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";

export const HOME_GROUP_APPLICATIONS_PER_PAGE = 10;

const TOOLBAR_INPUT = "h-11 rounded-xl border border-[rgba(40,25,80,0.12)] bg-cream text-sm text-indigo outline-none focus:border-gold";

const STATUS_CONFIG: Record<
  AdminHomeGroupApplication["status"],
  { label: string; bg: string; text: string; dot: string; pulse?: boolean }
> = {
  pending: { label: "En attente", bg: "bg-gold/10", text: "text-gold-dark", dot: "bg-gold", pulse: true },
  approved: { label: "Approuvée", bg: "bg-online/10", text: "text-online", dot: "bg-online" },
  rejected: { label: "Rejetée", bg: "bg-live/10", text: "text-live", dot: "bg-live" },
};

export function ApplicationsManager({
  initialApplications,
  initialMeta,
  homeGroups,
  me,
}: {
  initialApplications: AdminHomeGroupApplication[];
  initialMeta: AdminListMeta;
  homeGroups: AdminHomeGroup[];
  me: AdminMe | null;
}) {
  const [status, setStatus] = useState<Status>(null);
  const [isPending, startTransition] = useTransition();

  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Server-side list (search + group + status filters + pagination via QueryMaster).
  const appFilters: Record<string, string> = {};
  if (selectedGroupId !== "all") appFilters.home_group_id = selectedGroupId;
  if (selectedStatus !== "all") appFilters.status = selectedStatus;

  const table = useServerDataTable<AdminHomeGroupApplication>({
    fetcher: getAdminHomeGroupApplicationsPaginated,
    initialData: initialApplications,
    initialMeta,
    initialPerPage: HOME_GROUP_APPLICATIONS_PER_PAGE,
    extraFilters: appFilters,
  });
  const setApplications = table.setItems;

  const [selectedApp, setSelectedApp] = useState<AdminHomeGroupApplication | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionNotePublic, setDecisionNotePublic] = useState(false);

  const isSuperAdmin = me?.is_super_admin ?? false;
  const isPasteur = me?.roles.includes("Pasteurs") ?? false;
  const isResponsable = me?.roles.includes("Responsables de cellule") ?? false;

  const canProcess = (app: AdminHomeGroupApplication) => {
    if (isSuperAdmin || isPasteur) return true;
    if (isResponsable) return Number(app.home_group?.leader_id) === Number(me?.id);
    return false;
  };

  const openApp = (app: AdminHomeGroupApplication) => {
    setSelectedApp(app);
    setDecisionNote(app.decision_note ?? "");
    setDecisionNotePublic(app.decision_note_public ?? false);
    setStatus(null);
  };

  const handleDecision = (application: AdminHomeGroupApplication, decision: "approve" | "reject") => {
    setStatus(null);
    startTransition(async () => {
      try {
        const payload = { decision_note: decisionNote.trim() || null, decision_note_public: decisionNotePublic };
        const res =
          decision === "approve"
            ? await approveHomeGroupApplication(application.id, payload)
            : await rejectHomeGroupApplication(application.id, payload);
        setApplications((prev) => prev.map((a) => (a.id === application.id ? res.data : a)));
        table.refresh();
        setStatus({ type: "success", message: decision === "approve" ? "Demande d'adhésion approuvée." : "Demande d'adhésion rejetée." });
        setSelectedApp(null);
      } catch (err) {
        const message = (err as Error).message;
        setStatus({
          type: "error",
          message: message === "FORBIDDEN" ? "Accès restreint : vous n'êtes pas autorisé à traiter cette demande." : message || "Action impossible.",
        });
      }
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  const whatsappUrl = (application: AdminHomeGroupApplication) => {
    const phone = application.phone.replace(/[^0-9]/g, "");
    const text = encodeURIComponent(`Bonjour ${application.name}, merci pour votre demande d'adhésion au groupe de maison « ${application.home_group?.name ?? ""} » à MFM Ficgayo.`);
    return `https://wa.me/${phone}?text=${text}`;
  };

  const columns: Column<AdminHomeGroupApplication>[] = [
    { id: "created_at", header: "Date", className: "whitespace-nowrap text-xs text-body", cell: (a) => formatDate(a.created_at) },
    {
      id: "name",
      header: "Nom",
      cell: (a) => (
        <div>
          <div className="font-semibold text-indigo">{a.name}</div>
          {a.user && <div className="text-[10px] font-bold tracking-wider text-online uppercase">Fidèle connecté</div>}
        </div>
      ),
    },
    {
      id: "contact",
      header: "Contact",
      cell: (a) => (
        <div>
          <div className="text-indigo">{a.phone}</div>
          <div className="text-xs text-faint">{a.email}</div>
        </div>
      ),
    },
    {
      id: "home_group",
      header: "Cellule",
      cell: (a) => (
        <div>
          <div className="font-medium text-indigo">{a.home_group?.name || `Cellule #${a.home_group_id}`}</div>
          <div className="text-xs text-faint">{a.home_group?.leader}</div>
        </div>
      ),
    },
    {
      id: "status",
      header: "Statut",
      cell: (a) => (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold", STATUS_CONFIG[a.status].bg, STATUS_CONFIG[a.status].text)}>
          <span className={cn("size-1.5 rounded-full", STATUS_CONFIG[a.status].dot, STATUS_CONFIG[a.status].pulse && "animate-pulse")} />
          {STATUS_CONFIG[a.status].label}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (a) => (
        <button onClick={() => openApp(a)} className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-indigo/5 px-4 py-2 text-xs font-bold text-indigo transition hover:bg-indigo hover:text-white">
          Traiter
        </button>
      ),
    },
  ];

  return (
    <PageShell>
      <Link href="/admins/home-groups" className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-faint uppercase transition hover:text-indigo">
        <ArrowLeft className="size-3.5" /> Retour aux Cellules
      </Link>

      <PageHeader
        eyebrow="Recrutement"
        title="Demandes d’adhésion"
        subtitle={`${table.total} demande${table.total > 1 ? "s" : ""} · gérez les fidèles souhaitant rejoindre un groupe de maison.`}
      />

      <StatusBanner status={status} className="mb-6" />

      {/* Filters toolbar */}
      <div className="mb-6 flex flex-wrap gap-4 rounded-2xl border border-[rgba(40,25,80,0.08)] bg-white p-4 shadow-[0_1px_3px_rgba(22,15,51,0.03)]">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, téléphone..."
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
            className={cn(TOOLBAR_INPUT, "w-full pr-4 pl-11 placeholder:text-faint")}
          />
        </div>
        <select value={selectedGroupId} onChange={(e) => { setSelectedGroupId(e.target.value); table.setPage(1); }} className={cn(TOOLBAR_INPUT, "min-w-[180px] px-4")}>
          <option value="all">Toutes les cellules</option>
          {homeGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); table.setPage(1); }} className={cn(TOOLBAR_INPUT, "min-w-[150px] px-4")}>
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="approved">Approuvé</option>
          <option value="rejected">Rejeté</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={table.view}
        getKey={(a) => a.id}
        sortBy={table.sortBy}
        sortDir={table.sortDir}
        onSort={table.toggleSort}
        onRowClick={openApp}
        emptyLabel="Aucune demande d'adhésion trouvée."
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
          itemLabel: "demandes",
        }}
      />

      {/* Processing Dialog (bespoke) */}
      <Dialog open={selectedApp !== null} onOpenChange={(open) => !open && setSelectedApp(null)}>
        {selectedApp && (
          <DialogContent
            showCloseButton
            className="w-[95vw] md:max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-0 gap-0 border-0 outline-none animate-fade-up"
          >
            <div className="flex items-center justify-between border-b border-[rgba(40,25,80,0.08)] px-6 py-4">
              <div>
                <span className="text-[10px] font-bold tracking-[0.18em] text-gold-dark uppercase">Demande d’adhésion - {selectedApp.home_group?.name ?? "—"}</span>
                <h2 className="mt-0.5 font-display text-xl font-bold text-indigo italic">{selectedApp.name}</h2>
              </div>
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold", STATUS_CONFIG[selectedApp.status].bg, STATUS_CONFIG[selectedApp.status].text)}>
                {selectedApp.status === "pending" && <Clock className="size-3" />}
                {selectedApp.status === "approved" && <CheckCircle className="size-3" />}
                {selectedApp.status === "rejected" && <XCircle className="size-3" />}
                {STATUS_CONFIG[selectedApp.status].label}
              </span>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl border border-[rgba(40,25,80,0.1)] bg-muted/10 px-3.5 py-2.5">
                  <User className="size-4 text-faint" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-faint uppercase">Nom complet</div>
                    <div className="truncate text-sm font-semibold text-indigo">{selectedApp.name}</div>
                  </div>
                </div>

                <a href={`mailto:${selectedApp.email}`} className="flex items-center gap-3 rounded-xl border border-[rgba(40,25,80,0.1)] bg-muted/10 px-3.5 py-2.5 transition hover:border-gold hover:bg-cream">
                  <Mail className="size-4 text-faint" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-faint uppercase">Email</div>
                    <div className="truncate text-sm font-semibold text-indigo">{selectedApp.email}</div>
                  </div>
                </a>

                <div className="flex items-center justify-between gap-2 rounded-xl border border-[rgba(40,25,80,0.1)] bg-muted/10 px-3.5 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <Phone className="size-4 text-faint" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-faint uppercase">Téléphone</div>
                      <a href={`tel:${selectedApp.phone}`} className="truncate text-sm font-semibold text-indigo hover:underline">{selectedApp.phone}</a>
                    </div>
                  </div>
                  <a
                    href={whatsappUrl(selectedApp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#25D366] text-white shadow-sm transition hover:brightness-110"
                    title="Contacter sur WhatsApp"
                  >
                    <MessageCircle className="size-4" />
                  </a>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-[rgba(40,25,80,0.1)] bg-muted/10 px-3.5 py-2.5">
                  <Home className="size-4 text-faint" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-faint uppercase">Zone / Quartier</div>
                    <div className="truncate text-sm font-semibold text-indigo">{selectedApp.home_group?.address || "Non spécifiée"}</div>
                  </div>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">Motivation</h3>
                <p className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed whitespace-pre-line text-body-strong">{selectedApp.motivation}</p>
              </section>
            </div>

            <div className="space-y-4 border-t border-[rgba(40,25,80,0.08)] px-6 py-4">
              {canProcess(selectedApp) ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">
                      Motif de la décision <span className="font-normal normal-case tracking-normal text-faint">(optionnel)</span>
                    </label>
                    <textarea
                      value={decisionNote}
                      onChange={(e) => setDecisionNote(e.target.value)}
                      rows={2}
                      placeholder="Ajoutez un motif (ex. raison du refus, détails d'affectation…)"
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
                      onClick={() => handleDecision(selectedApp, "approve")}
                      disabled={isPending || selectedApp.status === "approved"}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-online/10 px-4 py-3 text-xs font-bold text-online transition hover:bg-online/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                      Approuver
                    </button>
                    <button
                      onClick={() => handleDecision(selectedApp, "reject")}
                      disabled={isPending || selectedApp.status === "rejected"}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-live/20 px-4 py-3 text-xs font-bold text-live transition hover:bg-live/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isPending ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                      Rejeter
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {selectedApp.decision_note && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">Motif de la décision</p>
                      <p className="rounded-xl bg-cream p-3 text-sm leading-relaxed text-body-strong">{selectedApp.decision_note}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-cream/60 px-4 py-3 text-xs font-semibold text-body">
                    <ShieldCheck className="size-4 text-faint" />
                    Seul le responsable désigné de cette cellule peut traiter cette demande.
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
