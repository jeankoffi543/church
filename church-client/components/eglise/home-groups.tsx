"use client";

import { useState } from "react";
import {
  ArrowRight,
  MapPin,
  Clock,
  Check,
  X,
  Loader2,
  Compass,
  CheckCircle,
  AlertCircle,
  XCircle,
  Search,
  ClipboardCheck,
  Inbox,
} from "lucide-react";

import { type HomeGroup } from "@/lib/data";
import { submitHomeGroupApplication, verifyHomeGroupApplication, checkHomeGroupApplicationStatus, type HomeGroupApplicationStatusItem } from "@/lib/api";
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

type Selection = HomeGroup | "general" | null;

export function HomeGroups({ groups = [] }: { groups?: HomeGroup[] }) {
  const [selection, setSelection] = useState<Selection>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formMotivation, setFormMotivation] = useState("");
  const [formGroupId, setFormGroupId] = useState<number | "">("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formStatusMsg, setFormStatusMsg] = useState<{
    status: "pending" | "approved" | "rejected";
    groupName: string;
    message: string;
  } | null>(null);

  // Verification states (deprecated bottom layout but kept for compatibility)
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyPhone, setVerifyPhone] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    status: "pending" | "approved" | "rejected" | "not_found";
    homeGroupName?: string;
    message?: string;
  } | null>(null);

  // Status-lookup dialog
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusContact, setStatusContact] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusResults, setStatusResults] = useState<HomeGroupApplicationStatusItem[] | null>(null);

  const open = selection !== null;
  const group = selection && selection !== "general" ? selection : null;

  const handleSelectGroup = (g: Selection) => {
    setSelection(g);
    setFormErrors({});
    setFormStatusMsg(null);
    if (g && g !== "general") {
      setFormGroupId(g.id || "");
    } else {
      setFormGroupId("");
    }
  };

  const onOpenChange = (next: boolean) => {
    if (!next) handleSelectGroup(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setFormStatusMsg(null);

    const targetGroupId = group ? group.id : formGroupId;
    if (!targetGroupId) {
      setFormErrors({ home_group_id: "Veuillez choisir un groupe de maison." });
      return;
    }

    setLoading(true);

    const res = await submitHomeGroupApplication({
      name: formName,
      email: formEmail,
      phone: formPhone,
      home_group_id: Number(targetGroupId),
      motivation: formMotivation,
    });

    setLoading(false);

    if (res.success) {
      const label = group ? `la ${group.name}` : "un groupe de maison";
      setSelection(null);
      setToast(
        `Merci ! Ta demande pour rejoindre ${label} a bien été reçue. Un responsable te contactera très vite.`
      );
      // Reset form fields
      setFormName("");
      setFormEmail("");
      setFormPhone("");
      setFormMotivation("");
      setFormGroupId("");
      setTimeout(() => setToast(null), 4500);
    } else {
      if (res.status === "approved" || res.status === "pending") {
        setFormStatusMsg({
          status: res.status,
          groupName: res.home_group_name || "",
          message: res.message,
        });
      } else {
        setFormErrors({ general: res.message });
      }
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyResult(null);

    const res = await verifyHomeGroupApplication({
      email: verifyEmail,
      phone: verifyPhone,
    });

    setVerifyLoading(false);

    if (res.success) {
      setVerifyResult({
        status: res.status,
        homeGroupName: res.home_group_name,
      });
    } else {
      setVerifyResult({
        status: res.status || "not_found",
        message: res.message,
      });
    }
  };

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
      const results = await checkHomeGroupApplicationStatus(contact);
      setStatusResults(results);
    } catch (err) {
      setStatusError((err as Error).message || "Impossible de vérifier le statut.");
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <>
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

      <div className="flex flex-wrap gap-[22px]">
        {/* List */}
        <div className="flex flex-[1_1_360px] flex-col gap-3">
          {groups.map((g) => (
            <button
              key={g.name}
              onClick={() => handleSelectGroup(g)}
              className="flex cursor-pointer items-center justify-between gap-4 rounded-[14px] border border-[rgba(40,25,80,0.08)] border-l-4 border-l-gold-dark bg-white px-5 py-[18px] text-left transition-all duration-200 hover:translate-x-[3px] hover:shadow-[0_12px_30px_rgba(22,15,51,0.1)]"
            >
              <div>
                <h3 className="mb-[5px] text-base font-bold text-indigo">
                  {g.name}
                </h3>
                <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[13px] text-body">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" /> {g.area}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" /> {g.when}
                  </span>
                </div>
                <div className="mt-1 text-[12.5px] text-faint">
                  Responsable · {g.leader || "Non assigné"}
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-[13px] font-bold text-indigo-mid">
                Rejoindre <ArrowRight className="size-3.5" />
              </span>
            </button>
          ))}
        </div>

        {/* Map */}
        <div className="relative min-h-[440px] flex-[1_1_360px] overflow-hidden rounded-[20px] border border-[rgba(40,25,80,0.1)] bg-gradient-to-b from-lilac-200 to-lilac-300">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(58,42,110,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(58,42,110,.06) 1px,transparent 1px)",
              backgroundSize: "38px 38px",
            }}
          />
          <div className="absolute top-4 left-4 flex items-center gap-1 rounded-[10px] bg-white/90 px-3.5 py-2 text-[12.5px] font-bold text-indigo shadow-[0_4px_14px_rgba(22,15,51,0.1)]">
            <MapPin className="size-3.5 text-gold-dark" /> Abidjan · Yopougon &
            environs
          </div>
          {groups.map((g) => (
            <button
              key={g.name}
              onClick={() => handleSelectGroup(g)}
              aria-label={`Rejoindre ${g.name}`}
              className="absolute -translate-x-1/2 -translate-y-full cursor-pointer transition-transform hover:scale-125"
              style={{ top: g.top, left: g.left }}
            >
              <span className="block size-[26px] rotate-[-45deg] rounded-[50%_50%_50%_0] border-2 border-white bg-gradient-to-br from-gold to-gold-dark shadow-[0_6px_16px_rgba(200,144,46,0.4)]" />
            </button>
          ))}
          <div className="absolute right-4 bottom-4 left-4">
            <button
              onClick={() => handleSelectGroup("general")}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo py-3.5 text-sm font-bold text-white transition hover:bg-indigo-mid"
            >
              <Compass className="size-4" /> Trouver un groupe près de chez moi
            </button>
          </div>
        </div>
      </div>

      {/* ── Status-lookup dialog ──────────────────────────────────── */}
      <Dialog open={statusOpen} onOpenChange={handleStatusOpenChange}>
        <DialogContent className="max-w-[90%] sm:max-w-md border border-white/10 bg-ink p-6 text-cream shadow-2xl rounded-xl">
          <DialogHeader className="gap-1 text-left">
            <span className="text-[10px] font-bold tracking-widest text-gold uppercase">
              Suivi d&apos;inscription
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
                className="h-11 flex-1 rounded-xl border-white/15 bg-white/5 px-4 text-sm text-cream placeholder:text-white/30 focus-visible:border-gold focus-visible:ring-gold/30 focus-visible:ring-3 transition-all"
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
            <div className="mt-2 space-y-2.5 animate-fade-up">
              {statusResults.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center">
                  <Inbox className="size-8 text-[#9a8fb5]" />
                  <p className="text-sm font-semibold text-cream">Aucune demande trouvée</p>
                  <p className="text-xs text-[#9a8fb5]">
                    Vérifiez la saisie, ou postulez à une cellule ci-dessus.
                  </p>
                </div>
              ) : (
                statusResults.map((item, idx) => (
                  <div
                    key={`${item.home_group}-${idx}`}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-cream">
                          {item.home_group ?? "Cellule"}
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
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${
                          item.status === "approved"
                            ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30"
                            : item.status === "pending"
                            ? "bg-[#e2b85f]/15 text-[#e2b85f] ring-[#e2b85f]/30"
                            : "bg-[#ff9a9a]/15 text-[#ff9a9a] ring-[#ff9a9a]/30"
                        }`}
                      >
                        {item.status === "approved" ? (
                          <CheckCircle className="size-3.5 text-emerald-300" />
                        ) : item.status === "pending" ? (
                          <Clock className="size-3.5 text-[#e2b85f]" />
                        ) : (
                          <XCircle className="size-3.5 text-[#ff9a9a]" />
                        )}
                        {item.status === "approved"
                          ? "Approuvée"
                          : item.status === "pending"
                          ? "En attente"
                          : "Non retenue"}
                      </span>
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

      {/* Join dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[90%] rounded-xl border border-white/10 bg-ink p-6 text-cream shadow-2xl sm:max-w-md">
          <DialogHeader className="gap-1 text-left">
            <span className="text-[10px] font-bold tracking-widest text-gold uppercase">
              Groupe de maison
            </span>
            <DialogTitle className="font-display text-2xl leading-tight font-bold text-cream italic">
              {group ? `Rejoindre : ${group.name}` : "Trouver mon groupe"}
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-[#9a8fb5]">
              {group
                ? `${group.area} · ${group.when} · Responsable : ${group.leader || "Non assigné"}.`
                : "Sélectionnez une cellule ou décrivez votre besoin pour être orienté."}
            </DialogDescription>
          </DialogHeader>

          {formStatusMsg && (
            <div className="mt-2 rounded-xl border border-gold/30 bg-gold/5 p-4 text-xs text-cream space-y-1 animate-fade-up">
              <p className="font-bold text-gold flex items-center gap-1.5">
                <AlertCircle className="size-4" /> Statut de votre inscription
              </p>
              <p className="text-[#9a8fb5] leading-relaxed">{formStatusMsg.message}</p>
            </div>
          )}

          {formErrors.general && (
            <div className="mt-2 rounded-xl border border-live/30 bg-live/5 p-4 text-xs text-live flex items-center gap-2 animate-fade-up">
              <AlertCircle className="size-4 shrink-0" />
              <span>{formErrors.general}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-2 space-y-4 text-left">
            <Field label="Nom complet">
              <Input
                required
                placeholder="Ex: Jean Koffi"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (formErrors.name) setFormErrors((p) => ({ ...p, name: "" }));
                }}
                className={DARK_FIELD}
              />
              {formErrors.name && <p className="text-[11px] text-live mt-1">{formErrors.name}</p>}
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Adresse Email">
                <Input
                  type="email"
                  required
                  placeholder="Ex: jean@mail.com"
                  value={formEmail}
                  onChange={(e) => {
                    setFormEmail(e.target.value);
                    if (formErrors.email) setFormErrors((p) => ({ ...p, email: "" }));
                  }}
                  className={DARK_FIELD}
                />
                {formErrors.email && <p className="text-[11px] text-live mt-1">{formErrors.email}</p>}
              </Field>

              <Field label="Téléphone">
                <Input
                  type="tel"
                  required
                  placeholder="Ex: +225 07 00 00 00"
                  value={formPhone}
                  onChange={(e) => {
                    setFormPhone(e.target.value);
                    if (formErrors.phone) setFormErrors((p) => ({ ...p, phone: "" }));
                  }}
                  className={DARK_FIELD}
                />
                {formErrors.phone && <p className="text-[11px] text-live mt-1">{formErrors.phone}</p>}
              </Field>
            </div>

            {/* Group Selection Dropdown if general find was clicked */}
            {selection === "general" && (
              <Field label="Choisir une cellule">
                <select
                  required
                  value={formGroupId}
                  onChange={(e) => {
                    setFormGroupId(e.target.value ? Number(e.target.value) : "");
                    if (formErrors.home_group_id) setFormErrors((p) => ({ ...p, home_group_id: "" }));
                  }}
                  className="w-full h-11 rounded-xl border border-white/15 bg-[#1f1933] px-3 text-sm text-cream focus:border-gold outline-none transition-all"
                >
                  <option value="" disabled className="text-white/30">
                    -- Sélectionner une cellule --
                  </option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id} className="text-cream bg-ink">
                      {g.name} ({g.area})
                    </option>
                  ))}
                </select>
                {formErrors.home_group_id && (
                  <p className="text-[11px] text-live mt-1">{formErrors.home_group_id}</p>
                )}
              </Field>
            )}

            <Field label="Motivation (pourquoi voulez-vous nous rejoindre ?)">
              <Textarea
                required
                rows={3}
                placeholder="Ex: Je souhaite grandir dans ma vie de prière et fraterniser avec les frères de mon quartier…"
                value={formMotivation}
                onChange={(e) => {
                  setFormMotivation(e.target.value);
                  if (formErrors.motivation) setFormErrors((p) => ({ ...p, motivation: "" }));
                }}
                className={`${DARK_FIELD} min-h-20 resize-none`}
              />
              {formErrors.motivation && (
                <p className="text-[11px] text-live mt-1">{formErrors.motivation}</p>
              )}
            </Field>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelection(null);
                  openStatusDialog(formEmail);
                }}
                className="cursor-pointer text-[11px] font-bold text-[#9a8fb5] underline-offset-2 transition hover:text-gold hover:underline"
              >
                Déjà inscrit ? Vérifier mon statut
              </button>
            </div>

            <BrandButton
              type="submit"
              disabled={loading || formStatusMsg?.status === "approved" || formStatusMsg?.status === "pending"}
              variant="gold"
              size="full"
              className="h-12 text-sm font-extrabold"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Envoi en cours…
                </>
              ) : (
                <>
                  Envoyer ma demande <ArrowRight className="size-4" />
                </>
              )}
            </BrandButton>
          </form>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && (
        <div className="fixed right-5 bottom-5 z-[100] w-full max-w-sm px-4 sm:px-0">
          <div className="flex gap-3 rounded-xl border border-gold/30 bg-ink p-4 shadow-[0_12px_40px_rgba(22,15,51,0.5)]">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold">
              <Check className="size-4" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13.5px] font-semibold leading-snug text-cream">
                Demande envoyée
              </p>
              <p className="mt-1 text-xs leading-normal text-[#9a8fb5]">
                {toast}
              </p>
            </div>
            <button
              onClick={() => setToast(null)}
              aria-label="Fermer"
              className="cursor-pointer border-none bg-transparent p-0 text-[#9a8fb5] outline-none transition-colors hover:text-cream"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const DARK_FIELD =
  "h-11 rounded-xl border-white/15 bg-white/5 px-4 text-sm text-cream placeholder:text-white/30 focus-visible:border-gold focus-visible:ring-3 focus-visible:ring-gold/30 transition-all";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold tracking-wider text-[#9a8fb5] uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}
