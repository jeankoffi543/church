"use client";

import { useState, useTransition } from "react";
import { Boxes, Church, Flame, HeartHandshake, Layers, UserRound, Wallet } from "lucide-react";

import type { DashboardSummary } from "@/lib/admin-api";
import { getAdminDashboardSummary } from "@/lib/admin-api";
import { formatFcfa, formatNumber } from "@/lib/data";
import { PageShell, PageHeader } from "@/components/admin/data/page-shell";
import { KpiCard } from "@/components/admin/data/kpi-card";
import { PeriodPicker, type Period } from "@/components/admin/data/period-picker";
import { DonutChart } from "@/components/admin/charts/donut-chart";
import { TrendLineChart } from "@/components/admin/charts/trend-line-chart";
import { CATEGORICAL_COLORS, colorForNature, labelForNature } from "@/components/admin/charts/palette";

export function DashboardView({
  initialSummary,
  initialPeriod,
}: {
  initialSummary: DashboardSummary | null;
  initialPeriod: Period;
}) {
  const [period, setPeriod] = useState(initialPeriod);
  const [summary, setSummary] = useState(initialSummary);
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (next: Period) => {
    setPeriod(next);
    startTransition(async () => {
      const result = await getAdminDashboardSummary(next.from, next.to).catch(() => null);
      setSummary(result);
    });
  };

  const hasAnySection = summary && Object.keys(summary).length > 0;

  return (
    <PageShell className="max-w-[1180px]">
      <PageHeader
        eyebrow="Backoffice"
        title="Tableau de bord"
        subtitle="Vue d'ensemble de l'activité de la Maison, tous modules confondus."
        actions={<PeriodPicker value={period} onChange={handlePeriodChange} />}
      />

      {!summary && (
        <div className="rounded-[18px] border border-dashed border-[rgba(40,25,80,0.15)] bg-white/60 p-8 text-center text-sm text-body">
          Impossible de charger le tableau de bord pour le moment.
        </div>
      )}

      {summary && !hasAnySection && (
        <div className="rounded-[18px] border border-dashed border-[rgba(40,25,80,0.15)] bg-white/60 p-8 text-center text-sm text-body">
          Aucun module accessible avec ton profil actuel.
        </div>
      )}

      {summary && hasAnySection && (
        <div className={isPending ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            {summary.members && (
              <KpiCard label="Fidèles actifs" value={formatNumber(summary.members.active)} icon={UserRound} />
            )}
            {summary.services && (
              <KpiCard label="Cultes sur la période" value={formatNumber(summary.services.count_in_period)} icon={Church} />
            )}
            {summary.giving && (
              <KpiCard label="Générosité combinée" value={formatFcfa(summary.giving.total)} icon={Wallet} />
            )}
            {summary.evangelism && (
              <KpiCard label="Nouvelles âmes" value={formatNumber(summary.evangelism.new_converts_in_period)} icon={Flame} />
            )}
            {summary.followups && (
              <KpiCard label="Suivis ouverts" value={formatNumber(summary.followups.open_count)} icon={HeartHandshake} />
            )}
            {summary.resources && (
              <KpiCard label="Réservations à venir" value={formatNumber(summary.resources.upcoming_bookings)} icon={Boxes} />
            )}
            {summary.teams && (
              <KpiCard
                label="Cultes planifiés"
                value={`${summary.teams.services_planned} / ${summary.teams.services_total}`}
                icon={Layers}
              />
            )}
          </div>

          {(summary.attendance_trend || summary.giving) && (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {summary.attendance_trend && (
                <div className="rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white p-5 shadow-[0_1px_3px_rgba(22,15,51,0.05)]">
                  <h3 className="mb-3 text-[13px] font-bold text-body-strong">Présences par culte</h3>
                  {summary.attendance_trend.length === 0 ? (
                    <div className="flex h-[220px] items-center justify-center text-sm text-faint">Aucun culte sur cette période.</div>
                  ) : (
                    <TrendLineChart
                      data={summary.attendance_trend.map((p) => ({ label: p.date, count: p.count }))}
                      series={[{ key: "count", label: "Présences", color: CATEGORICAL_COLORS[0] }]}
                      formatValue={formatNumber}
                      height={240}
                    />
                  )}
                </div>
              )}

              {summary.giving && (
                <div className="rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white p-5 shadow-[0_1px_3px_rgba(22,15,51,0.05)]">
                  <h3 className="mb-3 text-[13px] font-bold text-body-strong">Générosité par nature</h3>
                  <DonutChart
                    data={Object.entries(summary.giving.by_nature).map(([nature, total]) => ({
                      key: nature,
                      label: labelForNature(nature),
                      value: total,
                      color: colorForNature(nature),
                    }))}
                    formatValue={formatFcfa}
                    height={200}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
