"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const KPI_STYLES = [
  {
    bg: "bg-gradient-to-br from-[#3a2a6e] to-[#160f33]",
    textColor: "text-white",
    labelColor: "text-white/70",
    trendColor: "text-[#e2b85f]",
    trendBg: "bg-[rgba(226,184,95,0.18)]",
  },
  {
    bg: "bg-white",
    textColor: "text-[#211648]",
    labelColor: "text-[#9a93ad]",
    trendColor: "text-[#1f8a5b]",
    trendBg: "bg-[rgba(31,138,91,0.12)]",
  },
  {
    bg: "bg-white",
    textColor: "text-[#211648]",
    labelColor: "text-[#9a93ad]",
    trendColor: "text-[#1f8a5b]",
    trendBg: "bg-[rgba(31,138,91,0.12)]",
  },
  {
    bg: "bg-white",
    textColor: "text-[#211648]",
    labelColor: "text-[#9a93ad]",
    trendColor: "text-[#1f8a5b]",
    trendBg: "bg-[rgba(31,138,91,0.12)]",
  },
];

type KpiCard = { label: string; value: string | number; bg: string; textColor: string; labelColor: string; trend?: string; trendColor: string; trendBg: string };
type RevenueBar = { month: string; value: number; label: string };
type CategoryBar = { name: string; pct: number; fill: string };
type TransactionRow = { id: number | string; method: string; date: string; amount: number; short: string; iconBg: string };
type TopProductRow = { rank: number; name: string; image?: string; sales: number; revenue: number };

export default function AdminStoreFinancePage() {
  const [kpis, setKpis] = useState<KpiCard[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueBar[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBar[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductRow[]>([]);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const { getAdminStoreAnalytics } = await import("@/lib/admin-api");
        const data = await getAdminStoreAnalytics();
        if (data) {
          if (data.kpis && data.kpis.length > 0) {
            const mappedKpis = data.kpis.map((k, idx: number) => {
              const style = KPI_STYLES[idx] || KPI_STYLES[0];
              return {
                label: k.label,
                value: k.value,
                bg: style.bg,
                textColor: style.textColor,
                labelColor: style.labelColor,
                trend: k.trend,
                trendColor: style.trendColor,
                trendBg: style.trendBg,
              };
            });
            setKpis(mappedKpis);
          }
          if (data.revenue_by_month && data.revenue_by_month.length > 0) {
            const mappedRevenue = data.revenue_by_month.map((r) => {
              const valInK = Math.round(r.value / 1000);
              return {
                month: r.month,
                value: r.value,
                label: `${valInK}k`
              };
            });
            setRevenueData(mappedRevenue);
          }
          if (data.category_breakdown && data.category_breakdown.length > 0) {
            const fills = [
              "from-[#e2b85f] to-[#c8902e]",
              "from-[#5a4a92] to-[#3a2a6e]",
              "from-[#7a4fd6] to-[#5a2fb0]",
              "from-[#2a9d8f] to-[#1f8a5b]",
              "from-[#d98a5b] to-[#c86a3e]"
            ];
            const mappedCategories = data.category_breakdown.map((c, idx: number) => {
              return {
                name: c.name,
                pct: c.pct,
                fill: fills[idx % fills.length]
              };
            });
            setCategoryBreakdown(mappedCategories);
          }
          if (data.recent_transactions && data.recent_transactions.length > 0) {
            const mappedTransactions = data.recent_transactions.map((t) => {
              const bgMap: Record<string, string> = {
                "OM": "bg-[#f57c00]",
                "W": "bg-[#1dc4ff]",
                "MTN": "bg-[#f5b400]",
                "💳": "bg-[#3a2a6e]"
              };
              return {
                id: t.id,
                method: t.method,
                date: t.date,
                amount: t.amount,
                short: t.short,
                iconBg: bgMap[t.short] || "bg-[#3a2a6e]"
              };
            });
            setTransactions(mappedTransactions);
          }
          if (data.top_products && data.top_products.length > 0) {
            const mappedTop = data.top_products.map((p) => {
              return {
                rank: p.rank,
                name: p.name,
                image: p.image,
                sales: p.sales,
                revenue: p.revenue
              };
            });
            setTopProducts(mappedTop);
          }
        }
      } catch (err) {
        console.error("Error loading analytics:", err);
      }
    };
    loadAnalytics();
  }, []);

  const handleExport = async () => {
    try {
      const { exportAdminStoreAnalyticsCsv } = await import("@/lib/admin-api");
      const csv = await exportAdminStoreAnalyticsCsv();
      if (csv) {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `rapport_finance_boutique_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      alert((err as Error).message || "Erreur lors de l'exportation");
    }
  };

  const maxRevenue = Math.max(...revenueData.map((d) => d.value), 1);

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
          onClick={handleExport}
          className="rounded-xl border border-[rgba(40,25,80,0.14)] bg-white px-5 py-3 text-sm font-bold text-[#3a2a6e] hover:border-[#c8902e] transition select-none cursor-pointer"
        >
          ⬇ Exporter le rapport
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {kpis.map((k, i) => (
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
            {revenueData.map((d, i) => {
              const pct = (d.value / maxRevenue) * 100;
              const isLast = i === revenueData.length - 1;
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
            {categoryBreakdown.map((c) => (
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
            {transactions.map((t) => (
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
            {topProducts.map((p) => (
              <div key={p.rank} className="flex items-center gap-3">
                <span className="font-display text-[22px] font-bold italic text-[#c8902e] w-[26px]">
                  {p.rank}
                </span>
                <div className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-[#f0eaf6]">
                  <Image
                    src={p.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"}
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
