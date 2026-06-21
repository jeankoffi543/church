"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatFcfa, formatNumber, type DonationPurpose } from "@/lib/data";

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

  const summary =
    "Vous donnez " +
    formatFcfa(amount) +
    (freq === "mensuel" ? " chaque mois" : ", une seule fois");

  return (
    <div className="flex-[1_1_380px] rounded-[26px] border border-[rgba(40,25,80,0.08)] bg-white p-[clamp(28px,4vw,40px)] shadow-[0_24px_60px_rgba(22,15,51,0.1)]">
      <span className="text-[13px] font-bold tracking-wider text-faint uppercase">
        Mon don
      </span>

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
        className="mb-[22px] w-full rounded-xl border border-[rgba(40,25,80,0.12)] bg-cream p-3.5 text-[15px] text-indigo outline-none placeholder:text-faint"
      />

      {/* Pay */}
      <button className="w-full cursor-pointer rounded-[14px] bg-gradient-to-br from-gold to-gold-dark py-[17px] text-base font-extrabold text-indigo shadow-[0_12px_30px_rgba(200,144,46,0.3)] transition hover:-translate-y-0.5 hover:brightness-105">
        Donner {formatFcfa(amount)}
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
    </div>
  );
}

export function DonationPitch() {
  const points = [
    "Transactions chiffrées & 100% sécurisées",
    "Reçu envoyé automatiquement par e-mail",
    "Gestion transparente, rapport annuel public",
  ];
  return (
    <div className="relative flex flex-[1_1_360px] flex-col justify-center overflow-hidden rounded-[26px] bg-gradient-to-br from-indigo-mid to-ink p-[clamp(36px,4.5vw,54px)] text-white">
      <div className="absolute -top-[50px] -right-[50px] size-[200px] rounded-full bg-[radial-gradient(circle,rgba(226,184,95,0.28),transparent_70%)]" />
      <span className="mb-4 text-xs font-bold tracking-[0.2em] text-gold uppercase">
        Générosité
      </span>
      <h1 className="mb-[18px] font-display text-[clamp(34px,4.4vw,52px)] leading-[1.04] font-semibold italic">
        Semer pour la moisson
      </h1>
      <p className="mb-2 font-display text-xl leading-snug text-white/80 italic">
        « Que chacun donne comme il l&apos;a résolu dans son cœur, avec joie. »
      </p>
      <span className="mb-[30px] text-[12.5px] font-bold tracking-wider text-gold uppercase">
        2 Corinthiens 9.7
      </span>
      <div className="flex flex-col gap-3.5">
        {points.map((p) => (
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
