"use client";

import { useState } from "react";
import { Loader2, Check, Send } from "lucide-react";

import { BrandButton } from "@/components/ui/brand-button";

const FIELD =
  "w-full rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-3 text-[15px] text-indigo outline-none transition focus:border-gold";
const LABEL =
  "text-[12px] font-bold tracking-wide text-body-strong uppercase";

export function ContactForm({ subjects }: { subjects: string[] }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: wire to a real endpoint / server action.
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1300);
  };

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
          Merci de nous avoir écrit ! Un membre de l&apos;équipe te répondra très
          bientôt.
        </p>
        <button
          onClick={() => setSent(false)}
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
      className="flex-1 rounded-[26px] border border-[rgba(40,25,80,0.08)] bg-white p-[clamp(24px,4vw,40px)] shadow-[0_24px_60px_rgba(22,15,51,0.1)]"
    >
      <h2 className="font-display text-[26px] font-semibold text-indigo italic">
        Écris-nous
      </h2>
      <p className="mt-1 mb-6 text-[14px] text-body">
        Remplis ce formulaire, nous revenons vers toi rapidement.
      </p>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Nom complet</span>
            <input name="name" required placeholder="Jean Koffi" className={FIELD} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>E-mail</span>
            <input
              name="email"
              type="email"
              required
              placeholder="jean@email.com"
              className={FIELD}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Sujet</span>
          <select name="subject" required defaultValue="" className={FIELD}>
            <option value="" disabled>
              Choisis un sujet…
            </option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Message</span>
          <textarea
            name="message"
            required
            rows={5}
            placeholder="Partage ta demande…"
            className={`${FIELD} resize-none leading-relaxed`}
          />
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
