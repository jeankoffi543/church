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
} from "lucide-react";

import { type HomeGroup } from "@/lib/data";
import { submitHomeGroupApplication, verifyHomeGroupApplication } from "@/lib/api";
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

  // Verification states
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyPhone, setVerifyPhone] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    status: "pending" | "approved" | "rejected" | "not_found";
    homeGroupName?: string;
    message?: string;
  } | null>(null);

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

  return (
    <>
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
                  Responsable · {g.leader}
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

      {/* Verify Application Status Section */}
      <div className="mt-12 rounded-[22px] border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-[0_4px_20px_rgba(22,15,51,0.03)] md:p-8 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 space-y-2">
            <span className="text-[10px] font-bold tracking-widest text-gold-dark uppercase">
              Suivi d&apos;inscription
            </span>
            <h3 className="font-display text-xl font-bold text-indigo italic">
              Vérifier le statut de mon groupe
            </h3>
            <p className="text-xs text-body leading-relaxed">
              Saisissez l&apos;adresse email et le téléphone utilisés lors de votre demande d&apos;inscription pour connaître son état de traitement.
            </p>
          </div>

          <form onSubmit={handleVerify} className="w-full md:w-auto flex-1 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-3">
              <Input
                type="email"
                required
                placeholder="Email (ex: jean@mail.com)"
                value={verifyEmail}
                onChange={(e) => setVerifyEmail(e.target.value)}
                className="h-11 rounded-xl border-[rgba(40,25,80,0.12)] bg-[#faf8f4] text-indigo text-xs"
              />
              <Input
                type="text"
                required
                placeholder="Téléphone (ex: +225...)"
                value={verifyPhone}
                onChange={(e) => setVerifyPhone(e.target.value)}
                className="h-11 rounded-xl border-[rgba(40,25,80,0.12)] bg-[#faf8f4] text-indigo text-xs"
              />
            </div>
            <BrandButton
              type="submit"
              disabled={verifyLoading}
              variant="dark"
              className="h-11 px-6 font-bold shrink-0 self-end sm:self-auto w-full sm:w-auto"
            >
              {verifyLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Vérifier <Search className="size-4 ml-1.5" />
                </>
              )}
            </BrandButton>
          </form>
        </div>

        {/* Verification result display */}
        {verifyResult && (
          <div className="mt-6 border-t border-[rgba(40,25,80,0.06)] pt-6 flex items-start gap-4 animate-fade-up">
            {verifyResult.status === "approved" && (
              <>
                <div className="flex size-10 items-center justify-center rounded-xl bg-online/15 text-online shrink-0">
                  <CheckCircle className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-indigo">Demande Approuvée !</p>
                  <p className="text-xs text-body leading-relaxed">
                    Félicitations ! Vous êtes officiellement inscrit dans le groupe de maison <span className="font-bold text-indigo">{verifyResult.homeGroupName}</span>. Le responsable vous contactera sous peu.
                  </p>
                </div>
              </>
            )}

            {verifyResult.status === "pending" && (
              <>
                <div className="flex size-10 items-center justify-center rounded-xl bg-gold/15 text-gold-dark shrink-0">
                  <Clock className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-indigo">Demande en cours d&apos;examen</p>
                  <p className="text-xs text-body leading-relaxed">
                    Votre candidature pour rejoindre le groupe de maison <span className="font-bold text-indigo">{verifyResult.homeGroupName}</span> est en attente de validation par le leader de cellule. Merci pour votre patience.
                  </p>
                </div>
              </>
            )}

            {verifyResult.status === "rejected" && (
              <>
                <div className="flex size-10 items-center justify-center rounded-xl bg-live/15 text-live shrink-0">
                  <XCircle className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-indigo">Demande non retenue</p>
                  <p className="text-xs text-body leading-relaxed">
                    Votre demande d&apos;adhésion au groupe de maison <span className="font-bold text-indigo">{verifyResult.homeGroupName}</span> a été rejetée ou archivée. Vous pouvez contacter l&apos;administration pour plus de détails.
                  </p>
                </div>
              </>
            )}

            {verifyResult.status === "not_found" && (
              <>
                <div className="flex size-10 items-center justify-center rounded-xl bg-[rgba(40,25,80,0.06)] text-faint shrink-0">
                  <AlertCircle className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-indigo">Aucune inscription trouvée</p>
                  <p className="text-xs text-body leading-relaxed">
                    {verifyResult.message || "Aucune demande de cellule de maison en cours ou validée n'a été trouvée pour ce couple email et téléphone."}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

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
                ? `${group.area} · ${group.when} · Responsable ${group.leader}.`
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
