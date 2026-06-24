"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Loader2,
  ArrowRight,
  Check,
  X,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  ClipboardCheck,
  Inbox,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { type Ministry } from "@/lib/data";
import {
  submitMinistryApplication,
  checkMinistryApplicationStatus,
  ApiValidationError,
  type ApplicationStatus,
  type ApplicationStatusItem,
  type SubmitResult,
} from "@/lib/public-api";
import { MinistryCard } from "@/components/cards/ministry-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrandButton } from "@/components/ui/brand-button";

/** Dark-theme presentation for each application status. */
const STATUS_META: Record<
  ApplicationStatus,
  { label: string; text: string; bg: string; ring: string; Icon: typeof Clock }
> = {
  pending: {
    label: "En attente",
    text: "text-[#e2b85f]",
    bg: "bg-[#e2b85f]/15",
    ring: "ring-[#e2b85f]/30",
    Icon: Clock,
  },
  approved: {
    label: "Approuvée",
    text: "text-emerald-300",
    bg: "bg-emerald-400/15",
    ring: "ring-emerald-400/30",
    Icon: CheckCircle2,
  },
  rejected: {
    label: "Non retenue",
    text: "text-[#ff9a9a]",
    bg: "bg-[#ff9a9a]/15",
    ring: "ring-[#ff9a9a]/30",
    Icon: XCircle,
  },
};

function StatusPill({ status }: { status: ApplicationStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cnPill(meta.bg, meta.text, meta.ring)}
    >
      <meta.Icon className="size-3.5" />
      {meta.label}
    </span>
  );
}

function cnPill(bg: string, text: string, ring: string) {
  return `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${bg} ${text} ${ring}`;
}

export function MinistryGrid({
  ministries,
  initialMeta,
}: {
  ministries: Ministry[];
  initialMeta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentPage = initialMeta?.current_page ?? 1;
  const pageCount = initialMeta?.last_page ?? 1;

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  // Per-field validation errors + a general (non-field) error.
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  // Set when the API reports the candidate already applied to this ministry.
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

  // Status-lookup dialog
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusContact, setStatusContact] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusResults, setStatusResults] = useState<ApplicationStatusItem[] | null>(null);

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setReason("");
    setErrors({});
    setGeneralError(null);
    setSubmitResult(null);
  };

  /** Clear a field's error as soon as the user edits it. */
  const clearError = (field: string) => {
    setGeneralError(null);
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const openJoin = (ministry: Ministry) => {
    resetForm();
    setSelectedMinistry(ministry);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedMinistry(null);
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMinistry) return;

    if (!selectedMinistry.id) {
      setGeneralError(
        "Ce ministère n'est pas disponible pour le moment. Réessayez plus tard."
      );
      return;
    }

    setLoading(true);
    setErrors({});
    setGeneralError(null);

    try {
      const result = await submitMinistryApplication({
        name,
        email,
        phone,
        motivation: reason,
        ministry_id: selectedMinistry.id,
      });

      // Already applied: keep the dialog open and reveal the current status.
      if (!result.created) {
        setSubmitResult(result);
        return;
      }

      const ministryName = selectedMinistry.name;
      setSelectedMinistry(null);
      resetForm();

      setToastMessage(
        `Merci ! Votre demande pour rejoindre le ministère "${ministryName}" a bien été envoyée. Un responsable vous contactera sous peu.`
      );
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      if (err instanceof ApiValidationError) {
        const mapped: Record<string, string> = {};
        for (const [field, messages] of Object.entries(err.errors)) {
          mapped[field] = messages[0];
        }
        setErrors(mapped);
      } else {
        setGeneralError((err as Error).message || "Une erreur est survenue.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (field: string) =>
    errors[field] ? (
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#ff8a8a]">
        <AlertCircle className="size-3" />
        {errors[field]}
      </p>
    ) : null;

  /* ── Status lookup ──────────────────────────────────────────────── */

  const openStatusDialog = (prefill?: string) => {
    setStatusContact(prefill ?? "");
    setStatusResults(null);
    setStatusError(null);
    setStatusOpen(true);
  };

  const handleStatusOpenChange = (open: boolean) => {
    setStatusOpen(open);
    if (!open) {
      setStatusContact("");
      setStatusResults(null);
      setStatusError(null);
    }
  };

  const handleStatusCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const contact = statusContact.trim();
    if (!contact) {
      setStatusError("Veuillez saisir votre email ou votre téléphone.");
      return;
    }
    setStatusLoading(true);
    setStatusError(null);
    try {
      const results = await checkMinistryApplicationStatus(contact);
      setStatusResults(results);
    } catch (err) {
      setStatusError((err as Error).message || "Impossible de vérifier le statut.");
    } finally {
      setStatusLoading(false);
    }
  };

  const showAlreadyApplied = submitResult !== null && !submitResult.created;

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[100] w-full max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-300 px-4 sm:px-0">
          <div className="flex gap-3 rounded-xl border border-[#e2b85f]/30 bg-ink p-4 shadow-[0_12px_40px_rgba(22,15,51,0.5)]">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#e2b85f]/20 text-[#e2b85f]">
              <Check className="size-4 animate-bounce" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13.5px] font-semibold leading-snug text-cream">
                Demande envoyée
              </p>
              <p className="mt-1 text-xs leading-normal text-[#9a8fb5]">
                {toastMessage}
              </p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-[#9a8fb5] hover:text-cream transition-colors bg-transparent border-none p-0 cursor-pointer outline-none"
              aria-label="Fermer la notification"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Toolbar: check existing application */}
      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={() => openStatusDialog()}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[rgba(40,25,80,0.12)] bg-white px-4 py-2.5 text-[13px] font-bold text-indigo shadow-[0_1px_3px_rgba(22,15,51,0.05)] transition hover:border-gold hover:text-gold-dark"
        >
          <ClipboardCheck className="size-4" />
          Vérifier ma candidature
        </button>
      </div>

      {/* Grid of ministries */}
      <div className="mb-10 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[18px]">
        {ministries.map((m) => (
          <MinistryCard key={m.id} ministry={m} variant="full" onJoin={openJoin} />
        ))}
      </div>

      {/* Pagination (shown when more than one page) */}
      {pageCount > 1 && (
        <div className="mb-16 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Page précédente"
            className="flex size-10 cursor-pointer items-center justify-center rounded-xl border border-[rgba(40,25,80,0.12)] bg-white text-indigo transition hover:border-gold hover:text-gold-dark disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft className="size-4" />
          </button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePageChange(p)}
              aria-current={p === currentPage ? "page" : undefined}
              className={
                p === currentPage
                  ? "flex size-10 cursor-pointer items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold-dark text-sm font-bold text-indigo shadow-[0_8px_20px_rgba(200,144,46,0.25)]"
                  : "flex size-10 cursor-pointer items-center justify-center rounded-xl border border-[rgba(40,25,80,0.12)] bg-white text-sm font-bold text-indigo transition hover:border-gold hover:text-gold-dark"
              }
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= pageCount}
            aria-label="Page suivante"
            className="flex size-10 cursor-pointer items-center justify-center rounded-xl border border-[rgba(40,25,80,0.12)] bg-white text-indigo transition hover:border-gold hover:text-gold-dark disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {/* ── Join / application dialog ─────────────────────────────── */}
      <Dialog open={selectedMinistry !== null} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-[90%] sm:max-w-md border border-white/10 bg-ink p-6 text-cream shadow-2xl rounded-xl">
          {showAlreadyApplied && submitResult ? (
            <AlreadyAppliedPanel
              result={submitResult}
              onCheckAll={() => {
                setSelectedMinistry(null);
                openStatusDialog(email);
              }}
              onClose={() => handleOpenChange(false)}
            />
          ) : (
            <>
              <DialogHeader className="gap-1 text-left">
                <span className="text-[10px] font-bold tracking-widest text-[#e2b85f] uppercase">
                  Candidature / Adhésion
                </span>
                <DialogTitle className="font-display text-2xl font-bold text-cream italic leading-tight">
                  Rejoindre : {selectedMinistry?.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#9a8fb5] leading-relaxed">
                  Veuillez remplir ce formulaire pour rejoindre l&apos;équipe de ce ministère. Un responsable reviendra vers vous rapidement.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="mt-2 space-y-4 text-left">
                <div className="space-y-1.5">
                  <label htmlFor="fullname" className="text-xs font-bold text-[#9a8fb5] uppercase tracking-wider">
                    Nom complet
                  </label>
                  <Input
                    id="fullname"
                    required
                    placeholder="Ex: Jean Koffi"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearError("name");
                    }}
                    className="h-11 rounded-xl border-white/15 bg-white/5 px-4 text-sm text-cream placeholder:text-white/30 focus-visible:border-[#e2b85f] focus-visible:ring-[#e2b85f]/30 focus-visible:ring-3 transition-all"
                  />
                  {fieldError("name")}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="phone" className="text-xs font-bold text-[#9a8fb5] uppercase tracking-wider">
                      Téléphone
                    </label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      placeholder="Ex: +225 07 00 00 00"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        clearError("phone");
                      }}
                      className="h-11 rounded-xl border-white/15 bg-white/5 px-4 text-sm text-cream placeholder:text-white/30 focus-visible:border-[#e2b85f] focus-visible:ring-[#e2b85f]/30 focus-visible:ring-3 transition-all"
                    />
                    {fieldError("phone")}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-bold text-[#9a8fb5] uppercase tracking-wider">
                      Adresse email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="Ex: jean.koffi@email.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearError("email");
                      }}
                      className="h-11 rounded-xl border-white/15 bg-white/5 px-4 text-sm text-cream placeholder:text-white/30 focus-visible:border-[#e2b85f] focus-visible:ring-[#e2b85f]/30 focus-visible:ring-3 transition-all"
                    />
                    {fieldError("email")}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="reason" className="text-xs font-bold text-[#9a8fb5] uppercase tracking-wider">
                    Pourquoi souhaitez-vous rejoindre ce ministère ?
                  </label>
                  <Textarea
                    id="reason"
                    required
                    placeholder="Partagez vos motivations et vos talents..."
                    rows={3}
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      clearError("motivation");
                    }}
                    className="rounded-xl border-white/15 bg-white/5 p-3.5 text-sm text-cream placeholder:text-white/30 focus-visible:border-[#e2b85f] focus-visible:ring-[#e2b85f]/30 focus-visible:ring-3 transition-all resize-none min-h-24"
                  />
                  {fieldError("motivation")}
                </div>

                {generalError && (
                  <div className="flex items-start gap-2 rounded-xl border border-[#ff8a8a]/30 bg-[#ff8a8a]/10 p-3 text-xs font-semibold text-[#ffb3b3]">
                    <AlertCircle className="size-4 shrink-0" />
                    {generalError}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMinistry(null);
                      openStatusDialog(email);
                    }}
                    className="cursor-pointer text-[11px] font-bold text-[#9a8fb5] underline-offset-2 transition hover:text-[#e2b85f] hover:underline"
                  >
                    Déjà postulé ? Vérifier mon statut
                  </button>
                </div>

                <BrandButton
                  type="submit"
                  disabled={loading}
                  variant="gold"
                  size="full"
                  className="h-12 text-sm font-extrabold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin animate-duration-1000" />
                      Envoi de votre demande...
                    </>
                  ) : (
                    <>
                      Valider ma candidature <ArrowRight className="size-4" />
                    </>
                  )}
                </BrandButton>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Status-lookup dialog ──────────────────────────────────── */}
      <Dialog open={statusOpen} onOpenChange={handleStatusOpenChange}>
        <DialogContent className="max-w-[90%] sm:max-w-md border border-white/10 bg-ink p-6 text-cream shadow-2xl rounded-xl">
          <DialogHeader className="gap-1 text-left">
            <span className="text-[10px] font-bold tracking-widest text-[#e2b85f] uppercase">
              Suivi de candidature
            </span>
            <DialogTitle className="font-display text-2xl font-bold text-cream italic leading-tight">
              Vérifier mon statut
            </DialogTitle>
            <DialogDescription className="text-xs text-[#9a8fb5] leading-relaxed">
              Saisissez l&apos;email ou le téléphone utilisé lors de votre candidature.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStatusCheck} className="mt-2 space-y-3 text-left">
            <div className="flex gap-2">
              <Input
                required
                placeholder="Email ou téléphone"
                value={statusContact}
                onChange={(e) => {
                  setStatusContact(e.target.value);
                  setStatusError(null);
                }}
                className="h-11 flex-1 rounded-xl border-white/15 bg-white/5 px-4 text-sm text-cream placeholder:text-white/30 focus-visible:border-[#e2b85f] focus-visible:ring-[#e2b85f]/30 focus-visible:ring-3 transition-all"
              />
              <BrandButton
                type="submit"
                disabled={statusLoading}
                variant="gold"
                className="h-11 shrink-0 px-4 text-sm font-extrabold"
              >
                {statusLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
              </BrandButton>
            </div>

            {statusError && (
              <div className="flex items-start gap-2 rounded-xl border border-[#ff8a8a]/30 bg-[#ff8a8a]/10 p-3 text-xs font-semibold text-[#ffb3b3]">
                <AlertCircle className="size-4 shrink-0" />
                {statusError}
              </div>
            )}
          </form>

          {/* Results */}
          {statusResults !== null && (
            <div className="mt-2 space-y-2.5">
              {statusResults.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center">
                  <Inbox className="size-8 text-[#9a8fb5]" />
                  <p className="text-sm font-semibold text-cream">Aucune candidature trouvée</p>
                  <p className="text-xs text-[#9a8fb5]">
                    Vérifiez la saisie, ou postulez à un ministère ci-dessus.
                  </p>
                </div>
              ) : (
                statusResults.map((item, idx) => (
                  <div
                    key={`${item.ministry}-${idx}`}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-cream">
                          {item.ministry ?? "Ministère"}
                        </p>
                        {item.created_at && (
                          <p className="text-[11px] text-[#9a8fb5]">
                            Soumise le{" "}
                            {new Date(item.created_at).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                      <StatusPill status={item.status} />
                    </div>
                    {item.decision_note && (
                      <p className="mt-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-relaxed text-[#cfc6e0]">
                        <span className="font-bold text-[#e2b85f]">Message : </span>
                        {item.decision_note}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Panel shown inside the join dialog when the candidate already applied. */
function AlreadyAppliedPanel({
  result,
  onCheckAll,
  onClose,
}: {
  result: SubmitResult;
  onCheckAll: () => void;
  onClose: () => void;
}) {
  const meta = STATUS_META[result.status];
  return (
    <div className="text-center">
      <DialogHeader className="gap-1">
        <DialogTitle className="sr-only">Candidature existante</DialogTitle>
      </DialogHeader>
      <div
        className={`mx-auto flex size-14 items-center justify-center rounded-2xl ${meta.bg} ${meta.text}`}
      >
        <meta.Icon className="size-7" />
      </div>
      <h3 className="mt-4 font-display text-xl font-bold text-cream italic">
        Vous avez déjà postulé
      </h3>
      <div className="mt-3 flex justify-center">
        <StatusPill status={result.status} />
      </div>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-[#bcb2d1]">
        {result.message}
      </p>
      <div className="mt-6 flex flex-col gap-2.5">
        <BrandButton variant="gold" size="full" className="h-11 text-sm font-extrabold" onClick={onCheckAll}>
          Voir toutes mes candidatures
        </BrandButton>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer text-xs font-bold text-[#9a8fb5] transition hover:text-cream"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
