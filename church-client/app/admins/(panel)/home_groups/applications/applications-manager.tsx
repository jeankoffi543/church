"use client";

import { useState, useTransition } from "react";
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  X,
  Phone,
  User,
  Mail,
  Home,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  Check,
} from "lucide-react";
import Link from "next/link";
import {
  type AdminHomeGroup,
  type AdminHomeGroupApplication,
  type AdminMe,
  approveHomeGroupApplication,
  rejectHomeGroupApplication,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";

type Feedback = { type: "success" | "error"; message: string } | null;

export function ApplicationsManager({
  initialApplications,
  homeGroups,
  me,
}: {
  initialApplications: AdminHomeGroupApplication[];
  homeGroups: AdminHomeGroup[];
  me: AdminMe | null;
}) {
  const [applications, setApplications] = useState<AdminHomeGroupApplication[]>(initialApplications);
  const [status, setStatus] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();

  // Filter states
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

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

  const handleApprove = (appId: number) => {
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await approveHomeGroupApplication(appId);
        setApplications((prev) =>
          prev.map((app) => (app.id === appId ? res.data : app))
        );
        setSelectedApp(res.data);
        setStatus({ type: "success", message: "La demande a été acceptée avec succès." });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Impossible d'approuver cette demande." });
      }
    });
  };

  const handleReject = (appId: number) => {
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await rejectHomeGroupApplication(appId);
        setApplications((prev) =>
          prev.map((app) => (app.id === appId ? res.data : app))
        );
        setSelectedApp(res.data);
        setStatus({ type: "success", message: "La demande a été rejetée." });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Impossible de rejeter cette demande." });
      }
    });
  };

  // Filter logic
  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.email.toLowerCase().includes(search.toLowerCase()) ||
      app.phone.includes(search);

    const matchesGroup =
      selectedGroupId === "all" || app.home_group_id === Number(selectedGroupId);

    const matchesStatus =
      selectedStatus === "all" || app.status === selectedStatus;

    return matchesSearch && matchesGroup && matchesStatus;
  });

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

  const getWhatsAppLink = (phoneStr: string) => {
    const cleanDigits = phoneStr.replace(/\D/g, "");
    return `https://api.whatsapp.com/send?phone=${cleanDigits}`;
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
              {filteredApplications.length}
            </span>
          </h1>
          <p className="mt-1 text-sm text-body">
            Gérez les fidèles souhaitant s&apos;inscrire ou rejoindre un groupe de maison.
          </p>
        </div>
      </header>

      {status && !selectedApp && (
        <div
          className={cn(
            "mb-6 flex items-start gap-3.5 rounded-xl border p-4 text-sm",
            status.type === "success"
              ? "border-online/20 bg-online/5 text-body-strong"
              : "border-live/20 bg-live/5 text-live"
          )}
        >
          {status.type === "success" ? (
            <CheckCircle2 className="size-5 shrink-0 text-online" />
          ) : (
            <AlertTriangle className="size-5 shrink-0 text-live" />
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
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] pl-11 pr-4 text-sm text-indigo placeholder:text-faint outline-none focus:border-gold"
          />
        </div>

        {/* Filter by Group */}
        <div className="w-full sm:w-auto min-w-[180px]">
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
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
            onChange={(e) => setSelectedStatus(e.target.value)}
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
        <div className="overflow-x-auto">
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
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-faint">
                    Aucune demande d&apos;adhésion trouvée.
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => {
                      setSelectedApp(app);
                      setStatus(null);
                    }}
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
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border",
                          app.status === "pending" && "bg-amber-50 text-amber-700 border-amber-200",
                          app.status === "approved" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                          app.status === "rejected" && "bg-rose-50 text-rose-700 border-rose-200"
                        )}
                      >
                        {app.status === "pending" && (
                          <>
                            <Clock className="size-3.5" /> En attente
                          </>
                        )}
                        {app.status === "approved" && (
                          <>
                            <Check className="size-3.5" /> Approuvé
                          </>
                        )}
                        {app.status === "rejected" && (
                          <>
                            <XCircle className="size-3.5" /> Rejeté
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedApp(app);
                          setStatus(null);
                        }}
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
      </div>

      {/* Centered Modal Details */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedApp(null)}
          />

          {/* Modal Container: perfectly centered */}
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-[22px] shadow-2xl overflow-hidden border border-[rgba(40,25,80,0.08)] z-50 animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[rgba(40,25,80,0.08)] px-6 py-4 bg-[#faf8f4]">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-gold-dark uppercase">
                  Détails de la demande
                </span>
                <h2 className="font-display text-lg font-bold text-indigo italic">
                  Candidature de {selectedApp.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="cursor-pointer rounded-lg p-2 text-faint hover:bg-cream hover:text-indigo transition"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {status && (
                <div
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 text-xs",
                    status.type === "success"
                      ? "border-online/20 bg-online/5 text-body-strong"
                      : "border-live/20 bg-live/5 text-live"
                  )}
                >
                  {status.type === "success" ? (
                    <CheckCircle2 className="size-4 shrink-0 text-online" />
                  ) : (
                    <AlertTriangle className="size-4 shrink-0 text-live" />
                  )}
                  <p className="font-semibold">{status.message}</p>
                </div>
              )}

              {/* Grid detail fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex gap-3 items-center rounded-xl bg-[#faf8f4] p-3">
                  <User className="size-5 text-gold-dark shrink-0" />
                  <div>
                    <div className="text-[10px] font-bold text-faint uppercase">Nom complet</div>
                    <div className="text-sm font-semibold text-indigo">{selectedApp.name}</div>
                  </div>
                </div>

                <div className="flex gap-3 items-center rounded-xl bg-[#faf8f4] p-3">
                  <Mail className="size-5 text-gold-dark shrink-0" />
                  <div>
                    <div className="text-[10px] font-bold text-faint uppercase">Adresse email</div>
                    <div className="text-sm font-semibold text-indigo truncate max-w-[200px]">{selectedApp.email}</div>
                  </div>
                </div>

                <div className="flex gap-3 items-center rounded-xl bg-[#faf8f4] p-3">
                  <Phone className="size-5 text-gold-dark shrink-0" />
                  <div>
                    <div className="text-[10px] font-bold text-faint uppercase">Téléphone</div>
                    <div className="text-sm font-semibold text-indigo">{selectedApp.phone}</div>
                  </div>
                </div>

                <div className="flex gap-3 items-center rounded-xl bg-[#faf8f4] p-3">
                  <Home className="size-5 text-gold-dark shrink-0" />
                  <div>
                    <div className="text-[10px] font-bold text-faint uppercase">Cellule demandée</div>
                    <div className="text-sm font-semibold text-indigo">
                      {selectedApp.home_group?.name || `Cellule #${selectedApp.home_group_id}`}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 items-center rounded-xl bg-[#faf8f4] p-3 sm:col-span-2">
                  <Calendar className="size-5 text-gold-dark shrink-0" />
                  <div>
                    <div className="text-[10px] font-bold text-faint uppercase">Date de soumission</div>
                    <div className="text-sm font-semibold text-indigo">{formatDate(selectedApp.created_at)}</div>
                  </div>
                </div>
              </div>

              {/* Motivation */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-indigo uppercase tracking-wider">Lettre de Motivation</h4>
                <div className="rounded-xl border border-[rgba(40,25,80,0.08)] bg-cream/30 p-4 text-sm text-body leading-relaxed whitespace-pre-line italic">
                  « {selectedApp.motivation} »
                </div>
              </div>

              {/* WhatsApp direct contact button */}
              <div className="pt-2">
                <a
                  href={getWhatsAppLink(selectedApp.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-sm font-bold text-white shadow-md transition"
                >
                  <Phone className="size-4" /> Contacter le fidèle sur WhatsApp
                </a>
              </div>

              {/* Security Matrix / Context Check feedback */}
              {!canProcess(selectedApp) && (
                <div className="flex gap-3 rounded-xl border border-live/20 bg-live/5 p-4 text-xs text-live">
                  <AlertTriangle className="size-5 shrink-0" />
                  <p className="font-semibold leading-relaxed">
                    Action impossible : Seuls les Pasteurs, Super Admins ou le leader désigné de cette cellule ({selectedApp.home_group?.leader}) sont autorisés à approuver ou rejeter cette demande.
                  </p>
                </div>
              )}

              {/* Decision info (if already processed) */}
              {selectedApp.status !== "pending" && (
                <div className="flex gap-3 rounded-xl border border-indigo/10 bg-indigo/5 p-4 text-xs text-indigo">
                  <CheckCircle2 className="size-5 shrink-0 text-gold-dark" />
                  <div>
                    <p className="font-bold">Demande déjà traitée</p>
                    <p className="mt-1 leading-relaxed">
                      Statut final : <span className="font-bold uppercase">{selectedApp.status}</span>.
                      {selectedApp.processor && (
                        <span> Traité par : {selectedApp.processor.name}</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-[rgba(40,25,80,0.08)] px-6 py-4 bg-[#faf8f4]">
              <button
                onClick={() => setSelectedApp(null)}
                className="cursor-pointer rounded-xl px-5 py-3 text-xs font-bold text-body hover:bg-cream transition"
              >
                Fermer
              </button>

              {selectedApp.status === "pending" && canProcess(selectedApp) && (
                <>
                  <button
                    disabled={isPending}
                    onClick={() => handleReject(selectedApp.id)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-live/30 bg-white hover:bg-live/5 px-5 py-3 text-xs font-bold text-live transition disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <XCircle className="size-3.5" />
                    )}
                    Rejeter
                  </button>

                  <button
                    disabled={isPending}
                    onClick={() => handleApprove(selectedApp.id)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-br from-gold to-gold-dark hover:brightness-105 px-5 py-3 text-xs font-bold text-indigo shadow-md transition disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-3.5" />
                    )}
                    Approuver
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
