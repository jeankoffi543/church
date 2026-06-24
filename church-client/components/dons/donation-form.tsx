"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Check, Loader2, ShieldCheck, XCircle, User, Mail, Phone, AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatFcfa, formatNumber, type DonationPurpose } from "@/lib/data";
import { initializeDonation, getDonationStatus } from "@/lib/donations";

const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";
const POLL_INTERVAL = 2500;
const POLL_MAX = 40; // ~100s of polling before giving up
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

type Phase = "form" | "verifying" | "success" | "failed";

export function DonationForm({
  purposes,
  presets,
  methods,
}: {
  purposes: DonationPurpose[];
  presets: number[];
  methods: string[];
}) {
  const [purpose, setPurpose] = useState(purposes[0]?.key ?? "dime");
  const [freq, setFreq] = useState<"unique" | "mensuel">("unique");
  const [amount, setAmount] = useState(presets[1] ?? presets[0] ?? 5000);
  const [custom, setCustom] = useState("");

  // Donor identity (Paystack requires an email).
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Transaction flow.
  const [phase, setPhase] = useState<Phase>("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const cancelPoll = useRef(false);

  useEffect(() => () => { cancelPoll.current = true; }, []);

  const summary =
    "Vous donnez " +
    formatFcfa(amount) +
    (freq === "mensuel" ? " chaque mois" : ", une seule fois");

  const purposeLabel = purposes.find((p) => p.key === purpose)?.label ?? purpose;

  /** Poll the backend until the webhook confirms the payment. */
  const pollStatus = async (reference: string) => {
    cancelPoll.current = false;
    for (let i = 0; i < POLL_MAX; i++) {
      if (cancelPoll.current) return;
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      if (cancelPoll.current) return;
      try {
        const { status } = await getDonationStatus(reference);
        if (status === "success") return setPhase("success");
        if (status === "failed") return setPhase("failed");
      } catch {
        /* transient — keep polling */
      }
    }
    // No confirmation within the window → let the donor know it's still pending.
    setPhase("failed");
    setError("Paiement non confirmé pour l’instant. Vous recevrez votre reçu par e-mail dès validation.");
  };

  const handleDonate = async () => {
    setError(null);
    if (amount < 100) return setError("Le montant minimum est de 100 FCFA.");
    if (!name.trim()) return setError("Veuillez indiquer votre nom.");
    if (!isEmail(email)) return setError("Veuillez saisir un e-mail valide (pour votre reçu).");
    if (!scriptReady || !window.PaystackPop) return setError("Le module de paiement n’est pas encore prêt, réessayez.");

    setBusy(true);
    try {
      const init = await initializeDonation({
        donor_name: name.trim(),
        donor_email: email.trim(),
        donor_phone: phone.trim() || undefined,
        purpose_key: purpose,
        amount,
        frequency: freq,
      });

      const key = init.public_key || PAYSTACK_PUBLIC_KEY;
      if (!key) {
        setError("Clé Paystack non configurée. Contactez l’administrateur.");
        setBusy(false);
        return;
      }

      window.PaystackPop.setup({
        key,
        email: init.email,
        amount: init.amount * 100, // XOF has no subunit → Paystack still expects ×100
        currency: init.currency,
        ref: init.reference,
        metadata: { purpose: purpose, frequency: freq },
        callback: () => {
          setPhase("verifying");
          void pollStatus(init.reference);
        },
        onClose: () => {
          setBusy(false);
        },
      }).openIframe();
    } catch (e) {
      setError((e as Error).message || "Une erreur est survenue.");
      setBusy(false);
    }
  };

  const restart = () => {
    cancelPoll.current = true;
    setPhase("form");
    setBusy(false);
    setError(null);
  };

  return (
    <div className="flex-[1_1_380px] rounded-[26px] border border-[rgba(40,25,80,0.08)] bg-white p-[clamp(28px,4vw,40px)] shadow-[0_24px_60px_rgba(22,15,51,0.1)]">
      <span className="text-[13px] font-bold tracking-wider text-faint uppercase">
        Mon don
      </span>

      <Script
        src="https://js.paystack.co/v1/inline.js"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onLoad={() => setScriptReady(true)}
      />

      {phase !== "form" ? (
        <StatusPanel phase={phase} amount={amount} purposeLabel={purposeLabel} error={error} onRestart={restart} />
      ) : (
      <>
      {/* Purpose */}
      <div className="my-3.5 mb-[22px] flex flex-wrap gap-2">
        {purposes.map((p) => (
          <button
            key={p.key}
            onClick={() => setPurpose(p.key)}
            className={cn(
              "relative cursor-pointer rounded-[10px] border bg-cream px-3.5 py-2 text-[13px] font-semibold transition",
              purpose === p.key
                ? "border-gold-dark text-indigo"
                : "border-[rgba(40,25,80,0.12)] text-body-strong hover:border-gold"
            )}
          >
            {p.label}
            {purpose === p.key && (
              <span className="absolute inset-0 rounded-[10px] border-2 border-gold-dark" />
            )}
          </button>
        ))}
      </div>

      {/* Frequency */}
      <div className="mb-[22px] flex rounded-xl border border-[rgba(40,25,80,0.1)] bg-cream p-1">
        {(["unique", "mensuel"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFreq(f)}
            className={cn(
              "relative flex-1 cursor-pointer rounded-[9px] py-[11px] text-sm font-bold text-indigo transition",
              freq === f && "bg-white shadow-[0_2px_8px_rgba(22,15,51,0.1)]"
            )}
          >
            {f === "unique" ? "Une fois" : "Chaque mois"}
          </button>
        ))}
      </div>

      {/* Presets */}
      <div className="mb-3.5 grid grid-cols-2 gap-2.5">
        {presets.map((a) => {
          const active = !custom && amount === a;
          return (
            <button
              key={a}
              onClick={() => {
                setAmount(a);
                setCustom("");
              }}
              className={cn(
                "relative cursor-pointer rounded-xl border bg-cream p-4 font-display text-[22px] font-bold text-indigo transition",
                active
                  ? "border-gold-dark"
                  : "border-[rgba(40,25,80,0.12)] hover:border-gold"
              )}
            >
              {formatNumber(a)}{" "}
              <span className="font-sans text-xs font-semibold text-faint">
                FCFA
              </span>
              {active && (
                <span className="absolute inset-0 rounded-xl border-2 border-gold-dark bg-gold/10" />
              )}
            </button>
          );
        })}
      </div>

      {/* Custom */}
      <input
        type="number"
        value={custom}
        onChange={(e) => {
          setCustom(e.target.value);
          setAmount(Number(e.target.value) || 0);
        }}
        placeholder="Autre montant (FCFA)"
        className="mb-[18px] w-full rounded-xl border border-[rgba(40,25,80,0.12)] bg-cream p-3.5 text-[15px] text-indigo outline-none placeholder:text-faint"
      />

      {/* Donor identity (needed for the receipt) */}
      <div className="mb-[18px] flex flex-col gap-2.5">
        <DonorInput icon={<User className="size-4" />} value={name} onChange={setName} placeholder="Nom complet *" />
        <DonorInput icon={<Mail className="size-4" />} type="email" value={email} onChange={setEmail} placeholder="Adresse e-mail * (reçu)" />
        <DonorInput icon={<Phone className="size-4" />} type="tel" value={phone} onChange={setPhone} placeholder="Téléphone (optionnel)" />
      </div>

      {error && (
        <div className="mb-3.5 flex items-start gap-2 rounded-xl border border-live/20 bg-live/5 px-3.5 py-2.5 text-[13px] font-semibold text-live">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
        </div>
      )}

      {/* Pay */}
      <button
        type="button"
        onClick={handleDonate}
        disabled={busy}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-gradient-to-br from-gold to-gold-dark py-[17px] text-base font-extrabold text-indigo shadow-[0_12px_30px_rgba(200,144,46,0.3)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <><Loader2 className="size-5 animate-spin" /> Ouverture du paiement…</> : <>Donner {formatFcfa(amount)}</>}
      </button>
      <div className="mt-3 text-center text-xs text-faint">{summary}</div>

      {/* Methods */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 border-t border-[rgba(40,25,80,0.08)] pt-[18px]">
        <span className="mr-1 text-[11px] font-semibold text-faint">
          🔒 Sécurisé via
        </span>
        {methods.map((m) => (
          <span
            key={m}
            className="rounded-md bg-lilac px-[11px] py-[5px] text-[11px] font-bold text-body-soft"
          >
            {m}
          </span>
        ))}
      </div>
      </>
      )}
    </div>
  );
}

/* ── Donor input with leading icon ───────────────────────────────── */
function DonorInput({
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-[rgba(40,25,80,0.12)] bg-cream px-3.5 py-3 text-faint focus-within:border-gold">
      {icon}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[15px] text-indigo outline-none placeholder:text-faint"
      />
    </div>
  );
}

/* ── Verifying / success / failed panel ──────────────────────────── */
function StatusPanel({
  phase,
  amount,
  purposeLabel,
  error,
  onRestart,
}: {
  phase: Phase;
  amount: number;
  purposeLabel: string;
  error: string | null;
  onRestart: () => void;
}) {
  if (phase === "verifying") {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <span className="relative flex size-16 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-gold/30" />
          <span className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-dark text-indigo">
            <ShieldCheck className="size-7" />
          </span>
        </span>
        <Loader2 className="size-5 animate-spin text-gold-dark" />
        <div>
          <p className="font-display text-xl font-bold text-indigo italic">Validation en cours…</p>
          <p className="mt-1 max-w-xs text-sm text-body">
            Nous confirmons votre paiement de <strong>{formatFcfa(amount)}</strong> auprès de la banque. Un instant.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-online/15 text-online">
          <Check className="size-8" strokeWidth={3} />
        </span>
        <div>
          <p className="font-display text-2xl font-bold text-indigo italic">Merci infiniment 🙏</p>
          <p className="mt-1 max-w-xs text-sm text-body">
            Votre don de <strong>{formatFcfa(amount)}</strong> ({purposeLabel}) est confirmé. Votre reçu vous a été envoyé par e-mail.
          </p>
        </div>
        <button
          type="button"
          onClick={onRestart}
          className="mt-2 cursor-pointer rounded-xl bg-gradient-to-br from-gold to-gold-dark px-6 py-2.5 text-sm font-bold text-indigo transition hover:brightness-105"
        >
          Faire un autre don
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-live/10 text-live">
        <XCircle className="size-8" />
      </span>
      <div>
        <p className="font-display text-2xl font-bold text-indigo italic">Paiement en attente</p>
        <p className="mt-1 max-w-xs text-sm text-body">{error ?? "La transaction n’a pas pu être confirmée."}</p>
      </div>
      <button
        type="button"
        onClick={onRestart}
        className="mt-2 cursor-pointer rounded-xl border border-[rgba(40,25,80,0.15)] px-6 py-2.5 text-sm font-bold text-indigo transition hover:bg-cream"
      >
        Réessayer
      </button>
    </div>
  );
}

export type DonationPitchContent = {
  eyebrow: string;
  title: string;
  quote: string;
  reference: string;
  points: string[];
};

export function DonationPitch({ pitch }: { pitch: DonationPitchContent }) {
  return (
    <div className="relative flex flex-[1_1_360px] flex-col justify-center overflow-hidden rounded-[26px] bg-gradient-to-br from-indigo-mid to-ink p-[clamp(36px,4.5vw,54px)] text-white">
      <div className="absolute -top-[50px] -right-[50px] size-[200px] rounded-full bg-[radial-gradient(circle,rgba(226,184,95,0.28),transparent_70%)]" />
      <span className="mb-4 text-xs font-bold tracking-[0.2em] text-gold uppercase">
        {pitch.eyebrow}
      </span>
      <h1 className="mb-[18px] font-display text-[clamp(34px,4.4vw,52px)] leading-[1.04] font-semibold italic">
        {pitch.title}
      </h1>
      <p className="mb-2 font-display text-xl leading-snug text-white/80 italic">
        {pitch.quote}
      </p>
      <span className="mb-[30px] text-[12.5px] font-bold tracking-wider text-gold uppercase">
        {pitch.reference}
      </span>
      <div className="flex flex-col gap-3.5">
        {pitch.points.map((p) => (
          <div key={p} className="flex items-center gap-3">
            <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold">
              <Check className="size-3.5" />
            </span>
            <span className="text-sm text-white/80">{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
