"use client";

import { useState } from "react";
import { Loader2, Check, Send, AlertCircle } from "lucide-react";

import { BrandButton } from "@/components/ui/brand-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/app/admins/(panel)/_components/searchable-select";
import { submitContactMessage, ApiValidationError } from "@/lib/public-api";

const FIELD =
  "h-11 w-full rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-3 text-[15px] text-indigo outline-none transition focus:border-gold";
const LABEL =
  "text-[12px] font-bold tracking-wide text-body-strong uppercase";

export function ContactForm({ subjects }: { subjects: string[] }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setApiError(null);
    setErrors({});
    try {
      const res = await submitContactMessage({
        name: formData.name,
        email: formData.email,
        phone: formData.phone.trim() || undefined,
        subject: formData.subject,
        message: formData.message,
      });
      setSuccessMessage(res.message);
      setSent(true);
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setErrors(err.errors);
      } else {
        setApiError((err as Error).message || "Une erreur est survenue.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    });
    setSent(false);
    setSuccessMessage(null);
    setApiError(null);
    setErrors({});
  };

  const searchableSubjects = subjects.map((s, idx) => ({
    value: idx,
    label: s,
  }));

  const selectedOption = searchableSubjects.find((o) => o.label === formData.subject) ?? null;

  if (sent) {
    return (
      <div className="flex min-h-[420px] flex-1 animate-fade-up flex-col items-center justify-center rounded-[26px] border border-[rgba(40,25,80,0.08)] bg-white p-10 text-center shadow-[0_24px_60px_rgba(22,15,51,0.1)]">
        <div className="flex size-[72px] items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-dark text-indigo">
          <Check className="size-9" />
        </div>
        <h3 className="mt-5 font-display text-[28px] font-semibold text-indigo italic">
          Message envoyé
        </h3>
        <p className="mt-2 max-w-[320px] text-[15px] leading-relaxed text-body">
          {successMessage || "Merci de nous avoir écrit ! Un membre de l'équipe te répondra très bientôt."}
        </p>
        <button
          onClick={handleReset}
          className="mt-6 cursor-pointer rounded-xl border border-indigo-mid/25 px-5 py-2.5 text-sm font-semibold text-indigo-mid transition hover:border-gold"
        >
          Envoyer un autre message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex-[1_1_380px] rounded-[26px] border border-[rgba(40,25,80,0.08)] bg-white p-[clamp(24px,4vw,40px)] shadow-[0_24px_60px_rgba(22,15,51,0.1)]"
    >
      <h2 className="font-display text-[26px] font-semibold text-indigo italic">
        Écris-nous
      </h2>
      <p className="mt-1 mb-6 text-[14px] text-body">
        Remplis ce formulaire, nous revenons vers toi rapidement.
      </p>

      {apiError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-live/5 border border-live/20 p-3 text-xs text-live">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <p className="font-semibold">{apiError}</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Nom complet</span>
            <Input
              name="name"
              required
              placeholder="Jean Koffi"
              className={FIELD}
              value={formData.name}
              onChange={handleChange}
            />
            {errors.name && (
              <span className="text-[11px] font-bold text-live mt-0.5">{errors.name[0]}</span>
            )}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>E-mail</span>
            <Input
              name="email"
              type="email"
              required
              placeholder="jean@email.com"
              className={FIELD}
              value={formData.email}
              onChange={handleChange}
            />
            {errors.email && (
              <span className="text-[11px] font-bold text-live mt-0.5">{errors.email[0]}</span>
            )}
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Téléphone <span className="text-[10px] font-normal normal-case text-faint">(Optionnel)</span></span>
            <Input
              name="phone"
              placeholder="+225 07 08 09 10"
              className={FIELD}
              value={formData.phone}
              onChange={handleChange}
            />
            {errors.phone && (
              <span className="text-[11px] font-bold text-live mt-0.5">{errors.phone[0]}</span>
            )}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Sujet</span>
            <SearchableSelect
              options={searchableSubjects}
              value={selectedOption ? selectedOption.value : null}
              onChange={(val) => {
                const matched = searchableSubjects.find((o) => o.value === val);
                setFormData((prev) => ({ ...prev, subject: matched ? matched.label : "" }));
                if (errors.subject) {
                  setErrors((prev) => {
                    const copy = { ...prev };
                    delete copy.subject;
                    return copy;
                  });
                }
              }}
              placeholder="Choisis un sujet…"
              clearable={false}
            />
            {errors.subject && (
              <span className="text-[11px] font-bold text-live mt-0.5">{errors.subject[0]}</span>
            )}
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Message</span>
          <Textarea
            name="message"
            required
            rows={5}
            placeholder="Partage ta demande…"
            className="w-full rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-3 text-[15px] text-indigo outline-none transition focus:border-gold min-h-[120px] resize-none leading-relaxed"
            value={formData.message}
            onChange={handleChange}
          />
          {errors.message && (
            <span className="text-[11px] font-bold text-live mt-0.5">{errors.message[0]}</span>
          )}
        </label>

        <BrandButton
          type="submit"
          disabled={loading}
          variant="gold"
          size="full"
          className="mt-1"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Envoi en cours…
            </>
          ) : (
            <>
              Envoyer le message <Send className="size-4" />
            </>
          )}
        </BrandButton>
      </div>
    </form>
  );
}
