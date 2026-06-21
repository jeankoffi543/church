"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Inbox,
  Mail,
  Phone,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

import type { AdminMe, AdminMinistryApplication } from "@/lib/admin-api";
import { approveMinistryApplication, rejectMinistryApplication } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Pagination } from "../../_components/pagination";

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
  me,
}: {
  initialApplications: AdminMinistryApplication[];
  me: AdminMe;
}) {
  const [applications, setApplications] = useState(initialApplications);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Optional decision note (motif) recorded with an approve/reject, and whether
  // it is shared with the candidate in the public status lookup.
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionNotePublic, setDecisionNotePublic] = useState(false);

  const openApplication = (application: AdminMinistryApplication) => {
    setSelectedId(application.id);
    setDecisionNote(application.decision_note ?? "");
    setDecisionNotePublic(application.decision_note_public);
    setStatus(null);
  };

  const isGlobalValidator = me.is_super_admin || me.roles.includes("Pasteur");

  /** Whether the current admin may act on a given application's ministry. */
  const canValidate = (application: AdminMinistryApplication): boolean => {
    if (isGlobalValidator) return true;
    return me.id === application.ministry?.chef_id;
  };

  const filtered = useMemo(
    () => applications.filter((a) => (statusFilter === "all" ? true : a.status === statusFilter)),
    [applications, statusFilter]
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const selected = applications.find((a) => a.id === selectedId) ?? null;
  const pendingCount = applications.filter((a) => a.status === "pending").length;

  const replaceInList = (updated: AdminMinistryApplication) =>
    setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));

  const handleDecision = (
    application: AdminMinistryApplication,
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
            ? await approveMinistryApplication(application.id, payload)
            : await rejectMinistryApplication(application.id, payload);
        replaceInList(res.data);
        setStatus({
          type: "success",
          message: decision === "approve" ? "Candidature approuvée." : "Candidature rejetée.",
        });
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
    const text = encodeURIComponent(
      `Bonjour ${application.name}, merci pour votre candidature au ministère « ${application.ministry?.name ?? ""} » à MFM Ficgayo.`
    );
    return `https://wa.me/${phone}?text=${text}`;
  };

  return (
    <div className="mx-auto max-w-[1100px] animate-fade-up">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">
            Recrutement
          </span>
          <h1 className="mt-1 flex items-center gap-3 font-display text-[34px] font-semibold text-indigo italic">
            Candidatures aux ministères
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo/10 px-3 py-1 text-[13px] font-bold not-italic text-indigo">
              {applications.length}
              {pendingCount > 0 && (
                <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-gold text-[10px] font-black text-indigo">
                  {pendingCount}
                </span>
              )}
            </span>
          </h1>
          <p className="mt-1 text-sm text-body">
            {isGlobalValidator
              ? "Traitez les demandes de recrutement de tous les ministères."
              : "Traitez les demandes de recrutement du ministère que vous dirigez."}
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

      {/* Filters */}
      <div className="mb-6 flex items-center gap-1.5 rounded-xl border border-[rgba(40,25,80,0.1)] bg-white p-1 shadow-[0_1px_3px_rgba(22,15,51,0.02)] w-fit">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={cn(
              "cursor-pointer rounded-[10px] px-3.5 py-2 text-xs font-bold transition",
              statusFilter === f.key ? "bg-indigo text-white shadow-sm" : "text-body hover:bg-cream hover:text-indigo"
            )}
          >
            {f.label}
            {f.key === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full bg-gold text-[9px] font-black text-indigo">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-indigo">
            <thead className="border-b border-[rgba(40,25,80,0.08)] bg-cream text-xs font-bold tracking-wider text-body uppercase">
              <tr>
                <th className="px-6 py-4">Candidat</th>
                <th className="px-6 py-4">Ministère</th>
                <th className="px-6 py-4">Motivation</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
              {paged.map((application) => {
                const cfg = STATUS_CONFIG[application.status];
                return (
                  <tr
                    key={application.id}
                    onClick={() => openApplication(application)}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-cream/40",
                      selectedId === application.id && "bg-gold/5"
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo/5 text-xs font-bold text-indigo">
                          {application.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold">{application.name}</p>
                          <p className="text-[11px] text-faint">{application.phone}</p>
                          <p className="truncate text-[11px] text-faint">{application.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-indigo/5 px-2.5 py-1 text-[11px] font-bold text-indigo">
                        {application.ministry?.name ?? "—"}
                      </span>
                    </td>
                    <td className="max-w-[260px] px-6 py-4">
                      <p className="truncate text-xs text-body">{application.motivation}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                          cfg.bg,
                          cfg.text
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", cfg.dot, cfg.pulse && "animate-pulse")} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-faint">
                      {application.created_at
                        ? new Date(application.created_at).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Inbox className="size-10 text-gold/40" />
                      <p className="text-sm font-semibold text-body-strong">Aucune candidature</p>
                      <p className="max-w-xs text-xs text-body">
                        Les nouvelles demandes de recrutement apparaîtront ici.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            total={filtered.length}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={(n) => {
              setPerPage(n);
              setPage(1);
            }}
            itemLabel="candidatures"
          />
        )}
      </div>

      {/* Processing modal */}
      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        {selected && (
          <DialogContent
            showCloseButton
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-0 gap-0 border-0 outline-none animate-fade-up"
          >
            <div className="flex items-center justify-between border-b border-[rgba(40,25,80,0.08)] px-6 py-4">
              <div>
                <span className="text-[10px] font-bold tracking-[0.18em] text-gold-dark uppercase">
                  Candidature · {selected.ministry?.name ?? "—"}
                </span>
                <h2 className="mt-0.5 font-display text-xl font-bold text-indigo italic">
                  {selected.name}
                </h2>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                  STATUS_CONFIG[selected.status].bg,
                  STATUS_CONFIG[selected.status].text
                )}
              >
                {selected.status === "pending" && <Clock className="size-3" />}
                {selected.status === "approved" && <CheckCircle className="size-3" />}
                {selected.status === "rejected" && <XCircle className="size-3" />}
                {STATUS_CONFIG[selected.status].label}
              </span>
            </div>

            <div className="space-y-5 px-6 py-6">
              {/* Contact */}
              <section className="space-y-3">
                <h3 className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">Coordonnées</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <a
                    href={`mailto:${selected.email}`}
                    className="flex items-center gap-2.5 rounded-xl border border-[rgba(40,25,80,0.1)] px-3.5 py-2.5 text-sm text-body transition hover:border-gold hover:bg-cream"
                  >
                    <Mail className="size-4 text-faint" />
                    <span className="truncate">{selected.email}</span>
                  </a>
                  <a
                    href={`tel:${selected.phone}`}
                    className="flex items-center gap-2.5 rounded-xl border border-[rgba(40,25,80,0.1)] px-3.5 py-2.5 text-sm text-body transition hover:border-gold hover:bg-cream"
                  >
                    <Phone className="size-4 text-faint" />
                    <span>{selected.phone}</span>
                  </a>
                </div>
                <a
                  href={whatsappUrl(selected)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:brightness-110"
                >
                  <MessageCircle className="size-4" />
                  Contacter sur WhatsApp
                </a>
              </section>

              {/* Motivation */}
              <section className="space-y-3">
                <h3 className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">Motivation</h3>
                <p className="rounded-xl bg-cream p-4 text-sm leading-relaxed text-body-strong">
                  {selected.motivation}
                </p>
              </section>
            </div>

            {/* Footer actions */}
            <div className="space-y-4 border-t border-[rgba(40,25,80,0.08)] px-6 py-4">
              {canValidate(selected) ? (
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
                      placeholder="Ajoutez un motif (ex. raison du refus, équipe assignée…)"
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
                      <p className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">
                        Motif de la décision
                      </p>
                      <p className="rounded-xl bg-cream p-3 text-sm leading-relaxed text-body-strong">
                        {selected.decision_note}
                      </p>
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
    </div>
  );
}
