"use client";

import { useState, useTransition } from "react";
import {
  Search,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Inbox,
  Mail,
  Phone,
  MessageCircle,
  ShieldCheck,
  Loader2,
  Home,
  User,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
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
import { Pagination } from "../../_components/pagination";
import { useServerList } from "../../_components/use-server-list";

export const HOME_GROUP_APPLICATIONS_PER_PAGE = 10;

type Feedback = { type: "success" | "error"; message: string } | null;

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
  const [status, setStatus] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();

  // Filter states
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(HOME_GROUP_APPLICATIONS_PER_PAGE);

  // Server-side list (search + group + status filters + pagination via QueryMaster).
  const applicationFilters: Record<string, string> = {};
  if (selectedGroupId !== "all") {
    applicationFilters.home_group_id = selectedGroupId;
  }
  if (selectedStatus !== "all") {
    applicationFilters.status = selectedStatus;
  }

  const {
    items: applications,
    setItems: setApplications,
    meta,
    isLoading,
    refresh,
  } = useServerList<AdminHomeGroupApplication>({
    fetcher: getAdminHomeGroupApplicationsPaginated,
    params: { page, perPage, search, filters: applicationFilters },
    initialData: initialApplications,
    initialMeta,
  });

  // Detail Modal state
  const [selectedApp, setSelectedApp] = useState<AdminHomeGroupApplication | null>(null);

  // Role permissions checks
  const isSuperAdmin = me?.is_super_admin ?? false;
  const isPasteur = me?.roles.includes("Pasteurs") ?? false;
  const isResponsable = me?.roles.includes("Responsables de cellule") ?? false;

  const canProcess = (app: AdminHomeGroupApplication) => {
    if (isSuperAdmin || isPasteur) return true;
    if (isResponsable) {
      // Must be the leader of this specific cell
      return Number(app.home_group?.leader_id) === Number(me?.id);
    }
    return false;
  };

  const [decisionNote, setDecisionNote] = useState("");
  const [decisionNotePublic, setDecisionNotePublic] = useState(false);

  const openApp = (app: AdminHomeGroupApplication) => {
    setSelectedApp(app);
    setDecisionNote(app.decision_note ?? "");
    setDecisionNotePublic(app.decision_note_public ?? false);
    setStatus(null);
  };

  const handleDecision = (
    application: AdminHomeGroupApplication,
    decision: "approve" | "reject"
  ) => {
    setStatus(null);
    startTransition(async () => {
      try {
        const payload = {
          decision_note: decisionNote.trim() || null,
          decision_note_public: decisionNotePublic,
        };
        const res =
          decision === "approve"
            ? await approveHomeGroupApplication(application.id, payload)
            : await rejectHomeGroupApplication(application.id, payload);
        setApplications((prev) =>
          prev.map((a) => (a.id === application.id ? res.data : a))
        );
        refresh();
        setStatus({
          type: "success",
          message: decision === "approve" ? "Demande d'adhésion approuvée." : "Demande d'adhésion rejetée.",
        });
        setSelectedApp(null);
      } catch (err) {
        const message = (err as Error).message;
        setStatus({
          type: "error",
          message:
            message === "FORBIDDEN"
              ? "Accès restreint : vous n'êtes pas autorisé à traiter cette demande."
              : message || "Action impossible.",
        });
      }
    });
  };

  // The API already returns the filtered page; render it directly.
  const total = meta.total;
  const pageCount = Math.max(1, meta.last_page);
  const currentPage = meta.current_page;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const whatsappUrl = (application: AdminHomeGroupApplication) => {
    const phone = application.phone.replace(/[^0-9]/g, "");
    const text = encodeURIComponent(
      `Bonjour ${application.name}, merci pour votre demande d'adhésion au groupe de maison « ${application.home_group?.name ?? ""} » à MFM Ficgayo.`
    );
    return `https://wa.me/${phone}?text=${text}`;
  };

  return (
    <div className="mx-auto max-w-[1180px] animate-fade-up">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admins/home_groups"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-faint hover:text-indigo uppercase tracking-wider mb-2"
          >
            <ArrowLeft className="size-3.5" /> Retour aux Cellules
          </Link>
          <span className="block text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">
            Recrutement
          </span>
          <h1 className="mt-1 flex items-center gap-3 font-display text-[34px] font-semibold text-indigo italic">
            Demandes d&apos;adhésion
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo/10 px-3 py-1 text-[13px] font-bold not-italic text-indigo">
              {total}
            </span>
          </h1>
          <p className="mt-1 text-sm text-body">
            Gérez les fidèles souhaitant s&apos;inscrire ou rejoindre un groupe de maison.
          </p>
        </div>
      </header>

      {status && (
        <div
          className={cn(
            "mb-6 flex items-start gap-3.5 rounded-xl border p-4 text-sm",
            status.type === "success"
              ? "border-online/20 bg-online/5 text-body-strong"
              : "border-live/20 bg-live/5 text-live"
          )}
        >
          {status.type === "success" ? (
            <CheckCircle className="size-5 shrink-0 text-online" />
          ) : (
            <AlertCircle className="size-5 shrink-0 text-live" />
          )}
          <p className="font-semibold">{status.message}</p>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="mb-6 flex flex-wrap gap-4 rounded-2xl border border-[rgba(40,25,80,0.08)] bg-white p-4 shadow-[0_1px_3px_rgba(22,15,51,0.03)]">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, téléphone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-11 rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] pl-11 pr-4 text-sm text-indigo placeholder:text-faint outline-none focus:border-gold"
          />
        </div>

        {/* Filter by Group */}
        <div className="w-full sm:w-auto min-w-[180px]">
          <select
            value={selectedGroupId}
            onChange={(e) => {
              setSelectedGroupId(e.target.value);
              setPage(1);
            }}
            className="w-full h-11 rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 text-sm text-indigo outline-none focus:border-gold"
          >
            <option value="all">Toutes les cellules</option>
            {homeGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Status */}
        <div className="w-full sm:w-auto min-w-[150px]">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="w-full h-11 rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 text-sm text-indigo outline-none focus:border-gold"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvé</option>
            <option value="rejected">Rejeté</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
        <div className={cn("overflow-x-auto transition-opacity", isLoading && "pointer-events-none opacity-60")}>
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[rgba(40,25,80,0.08)] bg-cream/40">
                <th className="px-6 py-4 text-[11px] font-bold tracking-wider text-body uppercase">
                  Date
                </th>
                <th className="px-6 py-4 text-[11px] font-bold tracking-wider text-body uppercase">
                  Nom
                </th>
                <th className="px-6 py-4 text-[11px] font-bold tracking-wider text-body uppercase">
                  Contact
                </th>
                <th className="px-6 py-4 text-[11px] font-bold tracking-wider text-body uppercase">
                  Cellule
                </th>
                <th className="px-6 py-4 text-[11px] font-bold tracking-wider text-body uppercase">
                  Statut
                </th>
                <th className="px-6 py-4 text-[11px] font-bold tracking-wider text-body uppercase text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(40,25,80,0.05)]">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-faint">
                    Aucune demande d&apos;adhésion trouvée.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => openApp(app)}
                    className="group/row cursor-pointer transition hover:bg-cream/20"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-xs text-body">
                      {formatDate(app.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-indigo">{app.name}</div>
                      {app.user && (
                        <div className="text-[10px] text-online font-bold uppercase tracking-wider">
                          Fidèle connecté
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-indigo">{app.phone}</div>
                      <div className="text-xs text-faint">{app.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-indigo">
                        {app.home_group?.name || `Cellule #${app.home_group_id}`}
                      </div>
                      <div className="text-xs text-faint">
                        {app.home_group?.leader}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                          STATUS_CONFIG[app.status].bg,
                          STATUS_CONFIG[app.status].text
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", STATUS_CONFIG[app.status].dot, STATUS_CONFIG[app.status].pulse && "animate-pulse")} />
                        {STATUS_CONFIG[app.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openApp(app)}
                        className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-indigo/5 px-4 py-2 text-xs font-bold text-indigo transition hover:bg-indigo hover:text-white"
                      >
                        Traiter
                      </button>
                    </td>
                  </tr>
                ))
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
            itemLabel="demandes"
          />
        )}
      </div>

      {/* Processing Dialog */}
      <Dialog open={selectedApp !== null} onOpenChange={(open) => !open && setSelectedApp(null)}>
        {selectedApp && (
          <DialogContent
            showCloseButton
            className="w-[95vw] md:max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-0 gap-0 border-0 outline-none animate-fade-up"
          >
            <div className="flex items-center justify-between border-b border-[rgba(40,25,80,0.08)] px-6 py-4">
              <div>
                <span className="text-[10px] font-bold tracking-[0.18em] text-gold-dark uppercase">
                  Demande d'adhésion - {selectedApp.home_group?.name ?? "—"}
                </span>
                <h2 className="mt-0.5 font-display text-xl font-bold text-indigo italic">
                  {selectedApp.name}
                </h2>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                  STATUS_CONFIG[selectedApp.status].bg,
                  STATUS_CONFIG[selectedApp.status].text
                )}
              >
                {selectedApp.status === "pending" && <Clock className="size-3" />}
                {selectedApp.status === "approved" && <CheckCircle className="size-3" />}
                {selectedApp.status === "rejected" && <XCircle className="size-3" />}
                {STATUS_CONFIG[selectedApp.status].label}
              </span>
            </div>

            <div className="space-y-5 px-6 py-6">
              {/* Grille d'informations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nom complet */}
                <div className="flex gap-3 items-center rounded-xl border border-[rgba(40,25,80,0.1)] px-3.5 py-2.5 bg-muted/10">
                  <User className="size-4 text-faint" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-faint uppercase">Nom complet</div>
                    <div className="text-sm font-semibold text-indigo truncate">{selectedApp.name}</div>
                  </div>
                </div>

                {/* Email */}
                <a
                  href={`mailto:${selectedApp.email}`}
                  className="flex gap-3 items-center rounded-xl border border-[rgba(40,25,80,0.1)] px-3.5 py-2.5 bg-muted/10 transition hover:border-gold hover:bg-cream"
                >
                  <Mail className="size-4 text-faint" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-faint uppercase">Email</div>
                    <div className="text-sm font-semibold text-indigo truncate">{selectedApp.email}</div>
                  </div>
                </a>

                {/* Téléphone et WhatsApp */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-[rgba(40,25,80,0.1)] px-3.5 py-2 bg-muted/10">
                  <div className="flex gap-3 items-center min-w-0">
                    <Phone className="size-4 text-faint" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-faint uppercase">Téléphone</div>
                      <a
                        href={`tel:${selectedApp.phone}`}
                        className="text-sm font-semibold text-indigo hover:underline truncate"
                      >
                        {selectedApp.phone}
                      </a>
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

                {/* Zone / Quartier de la cellule visée */}
                <div className="flex gap-3 items-center rounded-xl border border-[rgba(40,25,80,0.1)] px-3.5 py-2.5 bg-muted/10">
                  <Home className="size-4 text-faint" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-faint uppercase">Zone / Quartier</div>
                    <div className="text-sm font-semibold text-indigo truncate">
                      {selectedApp.home_group?.address || "Non spécifiée"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloc de Motivation */}
              <section className="space-y-2">
                <h3 className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">Motivation</h3>
                <p className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed text-body-strong whitespace-pre-line">
                  {selectedApp.motivation}
                </p>
              </section>
            </div>

            {/* Footer actions */}
            <div className="space-y-4 border-t border-[rgba(40,25,80,0.08)] px-6 py-4">
              {canProcess(selectedApp) ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">
                      Motif de la décision{" "}
                      <span className="font-normal normal-case tracking-normal text-faint">(optionnel)</span>
                    </label>
                    <textarea
                      value={decisionNote}
                      onChange={(e) => setDecisionNote(e.target.value)}
                      rows={2}
                      placeholder="Ajoutez un motif (ex. raison du refus, détails d'affectation…)"
                      className="w-full resize-none rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-sm leading-relaxed text-indigo outline-none transition placeholder:text-faint focus:border-gold"
                    />
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(40,25,80,0.1)] bg-cream/50 px-3.5 py-2.5">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-indigo">Visible par le candidat</p>
                        <p className="text-[11px] text-body">
                          {decisionNotePublic
                            ? "Le motif sera affiché lors du suivi de sa candidature."
                            : "Le motif reste interne (non visible par le candidat)."}
                        </p>
                      </div>
                      <Switch
                        checked={decisionNotePublic}
                        onCheckedChange={setDecisionNotePublic}
                        label="Partager le motif avec le candidat"
                      />
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
                      <p className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">
                        Motif de la décision
                      </p>
                      <p className="rounded-xl bg-cream p-3 text-sm leading-relaxed text-body-strong">
                        {selectedApp.decision_note}
                      </p>
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
    </div>
  );
}
