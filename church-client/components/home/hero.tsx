"use client";

import { useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { IMG } from "@/lib/data";
import type { HeroContent } from "@/lib/api";
import { BrandButton } from "@/components/ui/brand-button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { LiveDot } from "@/components/ui/live-dot";

type HeroVariant = 1 | 2 | 3;

const VARIANTS: { id: HeroVariant; label: string }[] = [
  { id: 1, label: "Immersif" },
  { id: 2, label: "Scindé" },
  { id: 3, label: "Éditorial" },
];

export function Hero({ content }: { content: HeroContent }) {
  const [variant, setVariant] = useState<HeroVariant>(1);

  return (
    <div className="relative">
      {/* Variant switcher */}
      <div className="absolute top-[18px] left-1/2 z-25 flex -translate-x-1/2 gap-0.5 rounded-full border border-white/15 bg-ink/55 p-[5px] backdrop-blur-sm">
        {VARIANTS.map((v) => (
          <button
            key={v.id}
            onClick={() => setVariant(v.id)}
            className="relative rounded-full px-[15px] py-[7px] text-[11.5px] font-bold tracking-wide text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]"
          >
            {variant === v.id && (
              <span className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-gold to-gold-dark" />
            )}
            {v.label}
          </button>
        ))}
      </div>

      {variant === 1 && <HeroImmersif content={content} />}
      {variant === 2 && <HeroSplit content={content} />}
      {variant === 3 && <HeroEditorial content={content} />}
    </div>
  );
}

function HeroCtas({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <div className="flex flex-wrap gap-3.5">
      <BrandButton asChild variant="gold">
        <Link href="/eglise">Nous rejoindre</Link>
      </BrandButton>
      <BrandButton asChild variant={tone === "light" ? "ghostLight" : "outline"}>
        <Link href="/live">
          <LiveDot className="size-2 text-live" />
          Culte en direct
        </Link>
      </BrandButton>
    </div>
  );
}

/* ── V1 · Immersif ────────────────────────────────────────── */
function HeroImmersif({ content }: { content: HeroContent }) {
  return (
    <section
      className="flex min-h-[90vh] items-center justify-center bg-cover bg-center px-6 pt-[130px] pb-20 text-center text-white"
      style={{
        backgroundImage: `linear-gradient(180deg,rgba(22,15,51,.5),rgba(22,15,51,.92)),url('${IMG.heroImmersif}')`,
      }}
    >
      <div className="max-w-[800px] animate-fade-up">
        <Eyebrow className="mb-[22px] tracking-[0.29em] text-gold">
          {content.eyebrow}
        </Eyebrow>
        <h1 className="mb-5 font-display text-[clamp(46px,7.4vw,92px)] leading-none font-semibold tracking-[-0.5px] italic">
          {content.title}
        </h1>
        <p className="mx-auto mb-[34px] max-w-[580px] text-[clamp(16px,2.1vw,20px)] leading-relaxed text-white/85">
          {content.description}
        </p>
        <div className="flex flex-wrap justify-center gap-3.5">
          <HeroCtas />
        </div>

        {/* Service times */}
        <div className="mt-12 inline-flex flex-wrap justify-center overflow-hidden rounded-[18px] border border-white/15 bg-white/[0.07] backdrop-blur-sm">
          {content.serviceTimes.map((s, i) => (
            <div
              key={s.day}
              className={cn(
                "px-[30px] py-4 text-center",
                i < content.serviceTimes.length - 1 && "border-r border-white/15"
              )}
            >
              <div className="text-[10px] font-bold tracking-[0.2em] text-gold">
                {s.day}
              </div>
              <div className="my-0.5 font-display text-[30px] font-semibold">
                {s.time}
              </div>
              <div className="text-xs text-white/60">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── V2 · Scindé ──────────────────────────────────────────── */
function HeroSplit({ content }: { content: HeroContent }) {
  return (
    <section className="flex min-h-[90vh] flex-wrap">
      <div className="flex flex-[1_1_440px] items-center bg-gradient-to-b from-indigo-mid to-ink p-[clamp(48px,6vw,90px)] text-white">
        <div className="max-w-[540px] animate-fade-up">
          <Eyebrow className="mb-5 text-gold">Église MFM Ficgayo</Eyebrow>
          <h1 className="mb-5 font-display text-[clamp(44px,5.6vw,78px)] leading-[1.02] font-semibold tracking-[-0.5px] italic">
            {content.title}
          </h1>
          <p className="mb-[30px] max-w-[460px] text-lg leading-relaxed text-white/80">
            {content.description}
          </p>
          <div className="mb-[34px]">
            <HeroCtas />
          </div>
          <div className="flex flex-wrap gap-[26px] border-t border-white/15 pt-6">
            {content.serviceTimes.map((s) => (
              <div key={s.day}>
                <div className="text-[10px] font-bold tracking-[0.2em] text-gold">
                  {s.day}
                </div>
                <div className="font-display text-[26px] font-semibold">
                  {s.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div
        className="relative min-h-[380px] flex-[1_1_440px] bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(120deg,rgba(33,22,72,.28),rgba(33,22,72,.04)),url('${IMG.heroSplit}')`,
        }}
      >
        <div className="absolute right-6 bottom-6 left-6 max-w-[320px] rounded-[18px] bg-cream/95 px-6 py-[22px] shadow-[0_24px_60px_rgba(22,15,51,0.34)]">
          <p className="mb-2 font-display text-[21px] leading-snug text-indigo italic">
            « Que la paix de Christ règne dans vos cœurs. »
          </p>
          <span className="text-xs font-bold tracking-[0.12em] text-gold-dark uppercase">
            Colossiens 3.15
          </span>
        </div>
      </div>
    </section>
  );
}

/* ── V3 · Éditorial ───────────────────────────────────────── */
function HeroEditorial({ content }: { content: HeroContent }) {
  return (
    <section className="bg-cream px-6 pt-[clamp(120px,13vw,160px)] pb-[70px]">
      <div className="mx-auto flex max-w-[1140px] flex-wrap items-center gap-[clamp(36px,5vw,64px)]">
        <div className="flex-[1_1_420px] animate-fade-up">
          <Eyebrow className="mb-[22px]">{content.eyebrow}</Eyebrow>
          <h1 className="mb-[22px] font-display text-[clamp(48px,6.6vw,92px)] leading-[0.98] font-semibold tracking-[-0.6px] text-indigo italic">
            {content.title}
          </h1>
          <p className="mb-8 max-w-[460px] text-[19px] leading-relaxed text-body-soft">
            {content.description}
          </p>
          <div className="mb-9">
            <div className="flex flex-wrap gap-3.5">
              <BrandButton asChild variant="dark">
                <Link href="/eglise">Nous rejoindre</Link>
              </BrandButton>
              <BrandButton asChild variant="outline">
                <Link href="/live">
                  <LiveDot className="size-2 text-live" />
                  Culte en direct
                </Link>
              </BrandButton>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-7 gap-y-2 text-sm text-body-soft">
            {content.serviceTimes.map((s) => (
              <span key={s.day}>
                <strong className="text-indigo">{s.day.slice(0, 3)}.</strong>{" "}
                {s.time} · {s.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-[1_1_360px] justify-center">
          <div className="relative w-[min(100%,420px)]">
            <div className="absolute inset-[18px_-18px_-18px_18px] rounded-[20px] border-2 border-gold-dark" />
            <div
              className="relative aspect-[4/5] rounded-[20px] bg-cover bg-center shadow-[0_30px_70px_rgba(22,15,51,0.2)]"
              style={{
                backgroundImage: `linear-gradient(180deg,rgba(33,22,72,.1),rgba(33,22,72,.45)),url('${IMG.heroEditorial}')`,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
