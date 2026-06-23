"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Download, Wallet, HandCoins, PiggyBank, TrendingUp, Loader2, RefreshCw, ShieldCheck, ShieldX, Webhook, ListChecks, RotateCw, CheckCircle, AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatFcfa } from "@/lib/data";
import {
  exportDonationsCsv,
  syncDonations,
  replayWebhookEvent,
  getAdminDonations,
  getAdminWebhookEvents,
  type AdminDonation,
  type AdminWebhookEvent,
  type DonationStatus,
} from "@/lib/admin-api";
import { Pagination } from "../_components/pagination";

const PURPOSE_LABELS: Record<string, string> = {
  dime: "Dîme",
  offrande: "Offrande",
  projet: "Projet Maison de Feu",
  missions: "Missions",
};
const purposeLabel = (key: string) => PURPOSE_LABELS[key] ?? key;

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
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

const yearOf = (iso: string | null) => (iso ? iso.slice(0, 4) : "");
const monthOf = (iso: string | null) => (iso ? Number(iso.slice(5, 7)) : 0);
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
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | DonationStatus>("");
  const [purpose, setPurpose] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [exporting, setExporting] = useState(false);

  const [wPage, setWPage] = useState(1);
  const [wPerPage, setWPerPage] = useState(10);

  const years = useMemo(() => uniq(donations.map((d) => yearOf(d.created_at))).sort((a, b) => b.localeCompare(a)), [donations]);
  const purposes = useMemo(() => uniq(donations.map((d) => d.purpose_key)), [donations]);

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return donations.filter((d) => {
      const matchesSearch = !q || [d.reference, d.donor_name, d.donor_email].some((v) => v?.toLowerCase().includes(q));
      const matchesStatus = !status || d.status === status;
      const matchesPurpose = !purpose || d.purpose_key === purpose;
      const matchesYear = !year || yearOf(d.created_at) === year;
      const matchesMonth = !month || monthOf(d.created_at) === Number(month);
      return matchesSearch && matchesStatus && matchesPurpose && matchesYear && matchesMonth;
    });
  }, [donations, search, status, purpose, year, month]);

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

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const wPageCount = Math.max(1, Math.ceil(webhooks.length / wPerPage));
  const wCurrentPage = Math.min(wPage, wPageCount);
  const wPaged = webhooks.slice((wCurrentPage - 1) * wPerPage, wCurrentPage * wPerPage);

  const refresh = async () => {
    const [d, w] = await Promise.all([getAdminDonations(), getAdminWebhookEvents()]);
    setDonations(d);
    setWebhooks(w);
  };

  // Pull missed transactions from Paystack (recovers gifts whose webhook never
  // reached us — e.g. the tunnel/server was down).
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
      if (year) params.year = year;
      if (month) params.month = month;
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
    <div className="mx-auto max-w-[1100px] animate-fade-up">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">Finances</span>
          <h1 className="mt-1 font-display text-[34px] font-semibold text-indigo italic">Livre de caisse</h1>
          <p className="mt-1 text-sm text-body">Suivi des dons, réconciliation Paystack et journal des webhooks.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button onClick={handleSync} disabled={syncing} title="Récupérer les transactions manquées depuis Paystack" className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-3 text-sm font-bold text-indigo shadow-[0_8px_22px_rgba(200,144,46,0.25)] transition hover:brightness-105 disabled:opacity-50">
            {syncing ? <Loader2 className="size-4 animate-spin" /> : <RotateCw className="size-4" />}
            Synchroniser Paystack
          </button>
          {tab === "donations" && (
            <button onClick={handleExport} disabled={exporting} className="flex cursor-pointer items-center gap-2 rounded-xl border border-[rgba(40,25,80,0.12)] bg-white px-5 py-3 text-sm font-bold text-indigo shadow-sm transition hover:border-gold hover:text-gold-dark disabled:opacity-50">
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Exporter (CSV)
            </button>
          )}
        </div>
      </header>

      {toast && (
        <div className={cn("mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm", toast.type === "success" ? "border-online/20 bg-online/5 text-body-strong" : "border-live/20 bg-live/5 text-live")}>
          {toast.type === "success" ? <CheckCircle className="size-5 shrink-0 text-online" /> : <AlertCircle className="size-5 shrink-0 text-live" />}
          <p className="font-semibold">{toast.message}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 inline-flex rounded-xl border border-[rgba(40,25,80,0.1)] bg-white p-1">
        <TabButton active={tab === "donations"} onClick={() => setTab("donations")} icon={<ListChecks className="size-4" />} label="Dons" />
        <TabButton active={tab === "webhooks"} onClick={() => setTab("webhooks")} icon={<Webhook className="size-4" />} label={`Webhooks (${webhooks.length})`} />
      </div>

      {tab === "donations" ? (
        <>
          {/* KPI cards */}
          <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon={<Wallet className="size-5" />} label="Total récolté" value={formatFcfa(kpis.total)} highlight />
            <KpiCard icon={<HandCoins className="size-5" />} label="Dîmes" value={formatFcfa(kpis.dime)} />
            <KpiCard icon={<PiggyBank className="size-5" />} label="Offrandes" value={formatFcfa(kpis.offrande)} />
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
            <Select value={month} onChange={resetPage(setMonth)} options={[["", "Tous mois"], ...MONTHS.map((m, i) => [String(i + 1), m] as [string, string])]} />
            <Select value={year} onChange={resetPage(setYear)} options={[["", "Toutes années"], ...years.map((y) => [y, y] as [string, string])]} />
          </div>

          <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-indigo">
                <thead className="bg-cream border-b border-[rgba(40,25,80,0.08)] text-xs font-bold tracking-wider text-body uppercase">
                  <tr>
                    <th className="px-6 py-4">Référence</th>
                    <th className="px-6 py-4">Donateur</th>
                    <th className="px-6 py-4">Affectation</th>
                    <th className="px-6 py-4 text-right">Montant</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
                  {paged.map((d) => (
                    <tr key={d.id} className="hover:bg-cream/40 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs font-semibold text-faint">{d.reference}</td>
                      <td className="px-6 py-3">
                        <p className="font-semibold">{d.donor_name}</p>
                        <p className="text-xs text-faint">{d.donor_email}</p>
                      </td>
                      <td className="px-6 py-3"><span className="rounded-md border border-gold/20 bg-gold/10 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-gold-dark">{purposeLabel(d.purpose_key)}</span></td>
                      <td className="px-6 py-3 text-right font-bold whitespace-nowrap">{formatFcfa(d.amount)}</td>
                      <td className="px-6 py-3 text-xs font-mono whitespace-nowrap text-faint">{d.date_label}</td>
                      <td className="px-6 py-3"><span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap", STATUS_META[d.status].className)}>{STATUS_META[d.status].label}</span></td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-10 text-center text-xs text-body">Aucun don ne correspond à ces filtres.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {filtered.length > 0 && (
              <Pagination page={currentPage} pageCount={pageCount} total={filtered.length} perPage={perPage} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1); }} itemLabel="dons" />
            )}
          </div>
        </>
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-indigo">
              <thead className="bg-cream border-b border-[rgba(40,25,80,0.08)] text-xs font-bold tracking-wider text-body uppercase">
                <tr>
                  <th className="px-6 py-4">Reçu le</th>
                  <th className="px-6 py-4">Événement</th>
                  <th className="px-6 py-4">Référence</th>
                  <th className="px-6 py-4">Signature</th>
                  <th className="px-6 py-4">Traitement</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
                {wPaged.map((h) => (
                  <tr key={h.id} className="hover:bg-cream/40 transition-colors">
                    <td className="px-6 py-3 text-xs font-mono whitespace-nowrap text-faint">{h.date_label}</td>
                    <td className="px-6 py-3 font-semibold whitespace-nowrap">{h.event ?? "—"}</td>
                    <td className="px-6 py-3 font-mono text-xs text-faint">{h.reference ?? "—"}</td>
                    <td className="px-6 py-3">
                      {h.signature_valid ? (
                        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-online"><ShieldCheck className="size-3.5" /> Valide</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-live"><ShieldX className="size-3.5" /> Invalide</span>
                      )}
                    </td>
                    <td className="px-6 py-3"><span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap", HOOK_STATUS_META[h.status] ?? "bg-indigo/5 text-indigo")}>{h.status}</span></td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => replay(h)}
                        disabled={busyId === h.id}
                        title="Rejouer ce webhook"
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[rgba(40,25,80,0.12)] px-3 py-1.5 text-[12px] font-bold text-indigo transition hover:border-gold hover:text-gold-dark disabled:opacity-50"
                      >
                        {busyId === h.id ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                        Rejouer
                      </button>
                    </td>
                  </tr>
                ))}
                {webhooks.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-xs text-body">Aucun webhook reçu pour l’instant.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {webhooks.length > 0 && (
            <Pagination page={wCurrentPage} pageCount={wPageCount} total={webhooks.length} perPage={wPerPage} onPageChange={setWPage} onPerPageChange={(n) => { setWPerPage(n); setWPage(1); }} itemLabel="webhooks" />
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-bold transition",
        active ? "bg-gradient-to-br from-gold to-gold-dark text-indigo shadow-sm" : "text-body hover:text-indigo"
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
      {options.map(([val, label]) => (<option key={val} value={val}>{label}</option>))}
    </select>
  );
}
