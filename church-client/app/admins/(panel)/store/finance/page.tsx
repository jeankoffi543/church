"use client";

import React, { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const FINANCE_KPIS = [
  {
    label: "Revenu (6 mois)",
    value: "3 007k",
    bg: "bg-gradient-to-br from-[#3a2a6e] to-[#160f33]",
    textColor: "text-white",
    labelColor: "text-white/70",
    trend: "+22%",
    trendColor: "text-[#e2b85f]",
    trendBg: "bg-[rgba(226,184,95,0.18)]",
  },
  {
    label: "Commandes",
    value: "318",
    bg: "bg-white",
    textColor: "text-[#211648]",
    labelColor: "text-[#9a93ad]",
    trend: "+14%",
    trendColor: "text-[#1f8a5b]",
    trendBg: "bg-[rgba(31,138,91,0.12)]",
  },
  {
    label: "Panier moyen",
    value: "18 500",
    bg: "bg-white",
    textColor: "text-[#211648]",
    labelColor: "text-[#9a93ad]",
    trend: "+6%",
    trendColor: "text-[#1f8a5b]",
    trendBg: "bg-[rgba(31,138,91,0.12)]",
  },
  {
    label: "Taux de conversion",
    value: "4,8%",
    bg: "bg-white",
    textColor: "text-[#211648]",
    labelColor: "text-[#9a93ad]",
    trend: "+0,7pt",
    trendColor: "text-[#1f8a5b]",
    trendBg: "bg-[rgba(31,138,91,0.12)]",
  },
];

const REVENUE_DATA = [
  { month: "Jan", value: 340000, label: "340k" },
  { month: "Fév", value: 410000, label: "410k" },
  { month: "Mar", value: 385000, label: "385k" },
  { month: "Avr", value: 520000, label: "520k" },
  { month: "Mai", value: 610000, label: "610k" },
  { month: "Juin", value: 742000, label: "742k" },
];

const CATEGORY_BREAKDOWN = [
  { name: "Livres", pct: 42, fill: "from-[#e2b85f] to-[#c8902e]" },
  { name: "Vêtements", pct: 28, fill: "from-[#5a4a92] to-[#3a2a6e]" },
  { name: "Musique", pct: 16, fill: "from-[#7a4fd6] to-[#5a2fb0]" },
  { name: "Accessoires", pct: 10, fill: "from-[#2a9d8f] to-[#1f8a5b]" },
  { name: "Onction", pct: 4, fill: "from-[#d98a5b] to-[#c86a3e]" },
];

const TRANSACTIONS = [
  { id: "MFM-2041", method: "Orange Money", date: "28 juin 2026", amount: "34 000 FCFA", short: "OM", iconBg: "bg-[#f57c00]" },
  { id: "MFM-2040", method: "Wave", date: "28 juin 2026", amount: "18 000 FCFA", short: "W", iconBg: "bg-[#1dc4ff]" },
  { id: "MFM-2039", method: "Carte bancaire", date: "27 juin 2026", amount: "13 000 FCFA", short: "💳", iconBg: "bg-[#3a2a6e]" },
  { id: "MFM-2038", method: "MTN Money", date: "26 juin 2026", amount: "13 500 FCFA", short: "MTN", iconBg: "bg-[#f5b400]" },
  { id: "MFM-2037", method: "Orange Money", date: "25 juin 2026", amount: "36 000 FCFA", short: "OM", iconBg: "bg-[#f57c00]" },
];

const TOP_PRODUCTS = [
  { rank: 1, name: "Bible d'étude « Maison du Feu »", image: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=200&q=80&auto=format&fit=crop", sales: 155, revenue: "3 875k" },
  { rank: 2, name: "Album Louange « Feu du Ciel »", image: "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=200&q=80&auto=format&fit=crop", sales: 155, revenue: "1 240k" },
  { rank: 3, name: "T-shirt « Génération Feu »", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&q=80&auto=format&fit=crop", sales: 108, revenue: "972k" },
  { rank: 4, name: "Mug « Grâce chaque matin »", image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=200&q=80&auto=format&fit=crop", sales: 83, revenue: "415k" },
];

export default function AdminStoreFinancePage() {
  const maxRevenue = Math.max(...REVENUE_DATA.map((d) => d.value));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-widest text-[#c8902e] uppercase">
            Pilotage
          </span>
          <h1 className="font-display text-4xl font-semibold italic text-[#211648] mt-1.5">
            Finance
          </h1>
        </div>
        <button
          onClick={() => alert("Rapport exporté (simulé)")}
          className="rounded-xl border border-[rgba(40,25,80,0.14)] bg-white px-5 py-3 text-sm font-bold text-[#3a2a6e] hover:border-[#c8902e] transition select-none cursor-pointer"
        >
          ⬇ Exporter le rapport
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {FINANCE_KPIS.map((k, i) => (
          <div
            key={i}
            className={cn(
              "rounded-2xl border border-[rgba(40,25,80,0.07)] p-[22px]",
              k.bg,
              k.textColor
            )}
          >
            <div className={cn("text-[12.5px] font-semibold mb-2", k.labelColor)}>
              {k.label}
            </div>
            <div className="font-display text-3xl font-bold leading-none mb-2">
              {k.value}
            </div>
            <span
              className={cn(
                "inline-block rounded-md px-[9px] py-1 text-xs font-bold",
                k.trendColor,
                k.trendBg
              )}
            >
              {k.trend}
            </span>
          </div>
        ))}
      </div>

      {/* Monthly Revenues and Category Breakdown */}
      <div className="flex flex-col gap-[18px] lg:flex-row">
        {/* Bar chart */}
        <div className="flex-[2] rounded-3xl border border-[rgba(40,25,80,0.07)] bg-white p-6 shadow-[0_1px_3px_rgba(22,15,51,0.05)]">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-semibold italic text-[#211648]">
              Revenus mensuels
            </h2>
            <span className="text-[12.5px] text-[#9a93ad] font-semibold">
              6 derniers mois · FCFA
            </span>
          </div>
          <div className="flex items-end justify-between gap-3 h-[220px] pt-2.5">
            {REVENUE_DATA.map((d, i) => {
              const pct = (d.value / maxRevenue) * 100;
              const isLast = i === REVENUE_DATA.length - 1;
              return (
                <div
                  key={d.month}
                  className="flex flex-1 flex-col items-center gap-2 h-full justify-end"
                >
                  <span className="text-[11px] font-bold text-[#3a2a6e]">
                    {d.label}
                  </span>
                  <div
                    style={{ height: `${pct}%` }}
                    className={cn(
                      "w-full max-w-[44px] rounded-t-lg transition-[height] duration-500",
                      isLast
                        ? "bg-gradient-to-t from-[#c8902e] to-[#e2b85f]"
                        : "bg-gradient-to-t from-[#3a2a6e] to-[#5a4a92]"
                    )}
                  />
                  <span className="text-[11px] text-[#9a93ad] font-semibold">
                    {d.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Categories breakdown */}
        <div className="flex-1 rounded-3xl border border-[rgba(40,25,80,0.07)] bg-white p-6 shadow-[0_1px_3px_rgba(22,15,51,0.05)]">
          <h2 className="font-display text-xl font-semibold italic text-[#211648] mb-[18px]">
            Par catégorie
          </h2>
          <div className="flex flex-col gap-4">
            {CATEGORY_BREAKDOWN.map((c) => (
              <div key={c.name} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-[#211648] font-bold">{c.name}</span>
                  <span className="text-[#6f6a85]">{c.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#f0eaf6] overflow-hidden">
                  <div
                    style={{ width: `${c.pct}%` }}
                    className={cn("h-full rounded-full bg-gradient-to-r", c.fill)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions and Top Sellers */}
      <div className="flex flex-col gap-[18px] lg:flex-row">
        {/* Latest Transactions */}
        <div className="flex-1 rounded-3xl border border-[rgba(40,25,80,0.07)] bg-white p-6 shadow-[0_1px_3px_rgba(22,15,51,0.05)]">
          <h2 className="font-display text-xl font-semibold italic text-[#211648] mb-4">
            Dernières transactions
          </h2>
          <div className="flex flex-col divide-y divide-[rgba(40,25,80,0.06)]">
            {TRANSACTIONS.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-[14px] py-3.5 first:pt-0 last:pb-0"
              >
                <div
                  className={cn(
                    "flex size-[38px] shrink-0 items-center justify-center rounded-xl text-white text-xs font-extrabold",
                    t.iconBg
                  )}
                >
                  {t.short}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-bold text-[#211648]">
                    {t.id}
                  </div>
                  <div className="text-xs text-[#9a93ad] truncate">
                    {t.method} · {t.date}
                  </div>
                </div>
                <span className="text-[14.5px] font-extrabold text-[#1f8a5b]">
                  +{t.amount}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Best sellers */}
        <div className="flex-1 rounded-3xl border border-[rgba(40,25,80,0.07)] bg-white p-6 shadow-[0_1px_3px_rgba(22,15,51,0.05)]">
          <h2 className="font-display text-xl font-semibold italic text-[#211648] mb-4">
            Meilleures ventes
          </h2>
          <div className="flex flex-col gap-[14px]">
            {TOP_PRODUCTS.map((p) => (
              <div key={p.rank} className="flex items-center gap-3">
                <span className="font-display text-[22px] font-bold italic text-[#c8902e] w-[26px]">
                  {p.rank}
                </span>
                <div className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-[#f0eaf6]">
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-bold text-[#211648] truncate">
                    {p.name}
                  </div>
                  <div className="text-xs text-[#9a93ad]">
                    {p.sales} ventes
                  </div>
                </div>
                <span className="text-[13.5px] font-bold text-[#211648]">
                  {p.revenue}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
