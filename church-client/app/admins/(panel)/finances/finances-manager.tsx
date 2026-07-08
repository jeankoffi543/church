"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Search, Download, Wallet, HandCoins, PiggyBank, TrendingUp, Loader2, RefreshCw, ShieldCheck, ShieldX, Webhook, ListChecks, RotateCw, Landmark, Smartphone } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatFcfa } from "@/lib/data";
import {
  exportDonationsCsv,
  syncDonations,
  replayWebhookEvent,
  getAdminDonations,
  getAdminWebhookEvents,
  getGivingStats,
  type AdminDonation,
  type AdminWebhookEvent,
  type DonationStatus,
  type GivingStats,
} from "@/lib/admin-api";
import { PageShell, PageHeader } from "@/components/admin/data/page-shell";
import { DataTable } from "@/components/admin/data/data-table";
import { useDataTable, type Column } from "@/components/admin/data/use-data-table";
import { Button } from "@/components/admin/ui/button";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";
import { KpiCard as SharedKpiCard } from "@/components/admin/data/kpi-card";
import { PeriodPicker, periodPresets, type Period } from "@/components/admin/data/period-picker";
import { DonutChart } from "@/components/admin/charts/donut-chart";
import { GroupedBarChart } from "@/components/admin/charts/grouped-bar-chart";
import { CHANNEL_COLORS, CHANNEL_LABELS, colorForNature, labelForNature } from "@/components/admin/charts/palette";

const PURPOSE_LABELS: Record<string, string> = {
  dime: "Dîme",
  offrande: "Offrande",
  projet: "Projet Maison de Feu",
  missions: "Missions",
};
const purposeLabel = (key: string) => PURPOSE_LABELS[key] ?? key;

const STATUS_META: Record<DonationStatus, { label: string; className: string }> = {
  success: { label: "Réussi", className: "bg-online/10 text-online" },
  pending: { label: "En attente", className: "bg-gold/15 text-gold-dark" },
  failed: { label: "Échoué", className: "bg-live/10 text-live" },
};
const HOOK_STATUS_META: Record<string, string> = {
  processed: "bg-online/10 text-online",
  ignored: "bg-indigo/5 text-indigo",
  received: "bg-gold/15 text-gold-dark",
  invalid: "bg-live/10 text-live",
  failed: "bg-live/10 text-live",
};

const uniq = (arr: string[]) => [...new Set(arr.filter(Boolean))];

export function FinancesManager({
  initialDonations,
  initialWebhooks,
}: {
  initialDonations: AdminDonation[];
  initialWebhooks: AdminWebhookEvent[];
}) {
  const [tab, setTab] = useState<"donations" | "webhooks">("donations");
  const [donations, setDonations] = useState(initialDonations);
  const [webhooks, setWebhooks] = useState(initialWebhooks);
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<Status>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | DonationStatus>("");
  const [purpose, setPurpose] = useState("");
  const [period, setPeriod] = useState<Period>(() => periodPresets()[2]); // "Ce mois"
  const [exporting, setExporting] = useState(false);

  const purposes = useMemo(() => uniq(donations.map((d) => d.purpose_key)), [donations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return donations.filter((d) => {
      const matchesSearch = !q || [d.reference, d.donor_name, d.donor_email].some((v) => v?.toLowerCase().includes(q));
      const matchesStatus = !status || d.status === status;
      const matchesPurpose = !purpose || d.purpose_key === purpose;
      const day = d.created_at?.slice(0, 10) ?? "";
      const matchesPeriod = (!period.from || day >= period.from) && (!period.to || day <= period.to);
      return matchesSearch && matchesStatus && matchesPurpose && matchesPeriod;
    });
  }, [donations, search, status, purpose, period]);

  // Combined generosity KPI (online + in-person culte collections) for the period.
  const [givingStats, setGivingStats] = useState<GivingStats | null>(null);
  const [givingLoading, setGivingLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Deferred a tick so the loading flag isn't set synchronously within the
    // effect body (react-hooks/set-state-in-effect) — mirrors useServerList's
    // debounce mechanism, just without an actual delay.
    const timer = setTimeout(() => {
      setGivingLoading(true);
      getGivingStats(period.from, period.to)
        .then((data) => {
          if (!cancelled) setGivingStats(data);
        })
        .catch(() => {
          if (!cancelled) setGivingStats(null);
        })
        .finally(() => {
          if (!cancelled) setGivingLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [period]);

  const kpis = useMemo(() => {
    const success = filtered.filter((d) => d.status === "success");
    const sum = (key: string) => success.filter((d) => d.purpose_key === key).reduce((a, d) => a + d.amount, 0);
    return {
      total: success.reduce((a, d) => a + d.amount, 0),
      dime: sum("dime"),
      offrande: sum("offrande"),
      successRate: filtered.length > 0 ? Math.round((success.length / filtered.length) * 1000) / 10 : 0,
      successCount: success.length,
    };
  }, [filtered]);

  const donationColumns: Column<AdminDonation>[] = [
    { id: "reference", header: "Référence", className: "font-mono text-xs font-semibold text-faint", cell: (d) => d.reference },
    {
      id: "donor",
      header: "Donateur",
      cell: (d) => (
        <div>
          <p className="font-semibold">{d.donor_name}</p>
          <p className="text-xs text-faint">{d.donor_email}</p>
        </div>
      ),
    },
    {
      id: "purpose",
      header: "Affectation",
      cell: (d) => <span className="rounded-md border border-gold/20 bg-gold/10 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-gold-dark">{purposeLabel(d.purpose_key)}</span>,
    },
    { id: "amount", header: "Montant", align: "right", className: "font-bold whitespace-nowrap", cell: (d) => formatFcfa(d.amount) },
    { id: "date", header: "Date", className: "font-mono text-xs whitespace-nowrap text-faint", cell: (d) => d.date_label },
    {
      id: "status",
      header: "Statut",
      cell: (d) => <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap", STATUS_META[d.status].className)}>{STATUS_META[d.status].label}</span>,
    },
  ];

  const webhookColumns: Column<AdminWebhookEvent>[] = [
    { id: "date", header: "Reçu le", className: "font-mono text-xs whitespace-nowrap text-faint", cell: (h) => h.date_label },
    { id: "event", header: "Événement", className: "font-semibold whitespace-nowrap", cell: (h) => h.event ?? "—" },
    { id: "reference", header: "Référence", className: "font-mono text-xs text-faint", cell: (h) => h.reference ?? "—" },
    {
      id: "signature",
      header: "Signature",
      cell: (h) =>
        h.signature_valid ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-bold text-online"><ShieldCheck className="size-3.5" /> Valide</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[12px] font-bold text-live"><ShieldX className="size-3.5" /> Invalide</span>
        ),
    },
    {
      id: "hstatus",
      header: "Traitement",
      cell: (h) => <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap", HOOK_STATUS_META[h.status] ?? "bg-indigo/5 text-indigo")}>{h.status}</span>,
    },
    {
      id: "action",
      header: "Action",
      align: "right",
      cell: (h) => (
        <button
          onClick={() => replay(h)}
          disabled={busyId === h.id}
          title="Rejouer ce webhook"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[rgba(40,25,80,0.12)] px-3 py-1.5 text-[12px] font-bold text-indigo transition hover:border-gold hover:text-gold-dark disabled:opacity-50"
        >
          {busyId === h.id ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Rejouer
        </button>
      ),
    },
  ];

  const dTable = useDataTable({ rows: filtered, columns: donationColumns });
  const wTable = useDataTable({ rows: webhooks, columns: webhookColumns });

  const resetPage =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      dTable.setPage(1);
    };

  const refresh = async () => {
    const [d, w] = await Promise.all([getAdminDonations(), getAdminWebhookEvents()]);
    setDonations(d);
    setWebhooks(w);
  };

  const handleSync = () => {
    setSyncing(true);
    setToast(null);
    startTransition(async () => {
      try {
        const { checked, reconciled } = await syncDonations();
        await refresh();
        setToast({ type: "success", message: `${checked} don(s) en attente vérifié(s) · ${reconciled} réconcilié(s) avec Paystack.` });
      } catch (e) {
        setToast({ type: "error", message: (e as Error).message || "Synchronisation impossible." });
      } finally {
        setSyncing(false);
      }
    });
  };

  const replay = (hook: AdminWebhookEvent) => {
    setBusyId(hook.id);
    setToast(null);
    startTransition(async () => {
      try {
        const res = await replayWebhookEvent(hook.id);
        setWebhooks((prev) => prev.map((h) => (h.id === res.data.id ? res.data : h)));
        await refresh();
        setToast({ type: "success", message: `Webhook ${hook.reference ?? hook.id} rejoué (${res.data.status}).` });
      } catch (e) {
        setToast({ type: "error", message: (e as Error).message || "Rejeu impossible." });
      } finally {
        setBusyId(null);
      }
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      if (purpose) params.purpose_key = purpose;
      if (period.from) params.from = period.from;
      if (period.to) params.to = period.to;
      if (search.trim()) params.search = search.trim();
      const csv = await exportDonationsCsv(params);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `journal-dons-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Finances"
        title="Livre de caisse"
        subtitle="Suivi des dons, réconciliation Paystack et journal des webhooks."
        actions={
          <>
            <Button loading={syncing} icon={<RotateCw className="size-4" />} onClick={handleSync} title="Récupérer les transactions manquées depuis Paystack">
              Synchroniser Paystack
            </Button>
            {tab === "donations" && (
              <Button variant="secondary" loading={exporting} icon={<Download className="size-4" />} onClick={handleExport}>
                Exporter (CSV)
              </Button>
            )}
          </>
        }
      />

      <StatusBanner status={toast} className="mb-6" />

      {/* Tabs */}
      <div className="mb-6 inline-flex rounded-xl border border-[rgba(40,25,80,0.1)] bg-white p-1">
        <TabButton active={tab === "donations"} onClick={() => setTab("donations")} icon={<ListChecks className="size-4" />} label="Dons" />
        <TabButton active={tab === "webhooks"} onClick={() => setTab("webhooks")} icon={<Webhook className="size-4" />} label={`Webhooks (${webhooks.length})`} />
      </div>

      {tab === "donations" ? (
        <>
          {/* Générosité combinée — dons en ligne + collecte en espèces des cultes */}
          <div className="mb-7 rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white p-5 shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-indigo italic">Générosité combinée</h2>
                <p className="text-xs text-body">Dons en ligne + collecte en espèces des cultes, sur la période.</p>
              </div>
              <PeriodPicker value={period} onChange={setPeriod} />
            </div>

            {givingLoading && !givingStats ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-faint">Chargement…</div>
            ) : givingStats ? (
              <>
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <SharedKpiCard label="Total combiné" value={formatFcfa(givingStats.total)} icon={Wallet} />
                  <SharedKpiCard label="En ligne" value={formatFcfa(givingStats.by_channel.en_ligne)} icon={Smartphone} />
                  <SharedKpiCard label="Espèces (culte)" value={formatFcfa(givingStats.by_channel.especes)} icon={Landmark} />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-3 text-[13px] font-bold text-body-strong">Répartition par nature</h3>
                    <DonutChart
                      data={Object.entries(givingStats.by_nature).map(([nature, v]) => ({
                        key: nature,
                        label: labelForNature(nature),
                        value: v.total,
                        color: colorForNature(nature),
                      }))}
                      formatValue={formatFcfa}
                    />
                  </div>
                  <div>
                    <h3 className="mb-3 text-[13px] font-bold text-body-strong">En ligne vs espèces, par nature</h3>
                    <GroupedBarChart
                      data={Object.entries(givingStats.by_nature).map(([nature, v]) => ({
                        label: labelForNature(nature),
                        en_ligne: v.en_ligne,
                        especes: v.especes,
                      }))}
                      series={[
                        { key: "en_ligne", label: CHANNEL_LABELS.en_ligne, color: CHANNEL_COLORS.en_ligne },
                        { key: "especes", label: CHANNEL_LABELS.especes, color: CHANNEL_COLORS.especes },
                      ]}
                      formatValue={formatFcfa}
                      height={220}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-[100px] items-center justify-center text-sm text-faint">
                Impossible de charger les statistiques combinées.
              </div>
            )}
          </div>

          {/* Ledger KPI cards (online donations only — see combined card above for the full picture) */}
          <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon={<Wallet className="size-5" />} label="Total récolté (en ligne)" value={formatFcfa(kpis.total)} highlight />
            <KpiCard icon={<HandCoins className="size-5" />} label="Dîmes (en ligne)" value={formatFcfa(kpis.dime)} />
            <KpiCard icon={<PiggyBank className="size-5" />} label="Offrandes (en ligne)" value={formatFcfa(kpis.offrande)} />
            <KpiCard icon={<TrendingUp className="size-5" />} label="Taux de réussite" value={`${kpis.successRate}%`} sub={`${kpis.successCount} / ${filtered.length} transactions`} />
          </div>

          {/* Filters */}
          <div className="mb-5 flex flex-wrap items-center gap-2.5">
            <div className="flex min-w-[220px] flex-1 items-center gap-2.5 rounded-xl border border-[rgba(40,25,80,0.1)] bg-white px-3.5 py-2.5">
              <Search className="size-4 text-faint" />
              <input value={search} onChange={(e) => resetPage(setSearch)(e.target.value)} placeholder="Réf., donateur, e-mail…" className="w-full text-[14px] text-indigo outline-none placeholder:text-faint" />
            </div>
            <Select value={status} onChange={(v) => resetPage(setStatus)(v as "" | DonationStatus)} options={[["", "Tous statuts"], ["success", "Réussi"], ["pending", "En attente"], ["failed", "Échoué"]]} />
            <Select value={purpose} onChange={resetPage(setPurpose)} options={[["", "Toutes affectations"], ...purposes.map((p) => [p, purposeLabel(p)] as [string, string])]} />
          </div>

          <DataTable
            columns={donationColumns}
            rows={dTable.view}
            getKey={(d) => d.id}
            sortBy={dTable.sortBy}
            sortDir={dTable.sortDir}
            onSort={dTable.toggleSort}
            emptyLabel="Aucun don ne correspond à ces filtres."
            pagination={{
              page: dTable.page,
              pageCount: dTable.pageCount,
              total: dTable.total,
              perPage: dTable.perPage,
              onPageChange: dTable.setPage,
              onPerPageChange: (n) => {
                dTable.setPerPage(n);
                dTable.setPage(1);
              },
              itemLabel: "dons",
            }}
          />
        </>
      ) : (
        <DataTable
          columns={webhookColumns}
          rows={wTable.view}
          getKey={(h) => h.id}
          sortBy={wTable.sortBy}
          sortDir={wTable.sortDir}
          onSort={wTable.toggleSort}
          emptyLabel="Aucun webhook reçu pour l’instant."
          pagination={{
            page: wTable.page,
            pageCount: wTable.pageCount,
            total: wTable.total,
            perPage: wTable.perPage,
            onPageChange: wTable.setPage,
            onPerPageChange: (n) => {
              wTable.setPerPage(n);
              wTable.setPage(1);
            },
            itemLabel: "webhooks",
          }}
        />
      )}
    </PageShell>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-bold transition",
        active ? "bg-gradient-to-br from-gold to-gold-dark text-indigo shadow-sm" : "text-body hover:text-indigo",
      )}
    >
      {icon} {label}
    </button>
  );
}

function KpiCard({ icon, label, value, sub, highlight = false }: { icon: React.ReactNode; label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border p-5 shadow-sm", highlight ? "border-transparent bg-gradient-to-br from-indigo-mid to-ink text-white" : "border-[rgba(40,25,80,0.08)] bg-white")}>
      <div className={cn("mb-3 flex size-9 items-center justify-center rounded-xl", highlight ? "bg-white/15 text-gold" : "bg-gold/10 text-gold-dark")}>{icon}</div>
      <p className={cn("text-[11px] font-bold tracking-wider uppercase", highlight ? "text-white/55" : "text-faint")}>{label}</p>
      <p className={cn("mt-1 font-display text-[24px] font-bold", highlight ? "text-white" : "text-indigo")}>{value}</p>
      {sub && <p className={cn("mt-0.5 text-[11px]", highlight ? "text-white/50" : "text-faint")}>{sub}</p>}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="cursor-pointer rounded-xl border border-[rgba(40,25,80,0.12)] bg-white px-3 py-2.5 text-[13px] font-semibold text-indigo outline-none transition hover:border-gold focus:border-gold">
      {options.map(([val, label]) => (
        <option key={val} value={val}>
          {label}
        </option>
      ))}
    </select>
  );
}
