"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, Pause, Play, ArrowRight } from "lucide-react";

import type { PlatformPage, PlatformTenant } from "@/lib/platform-api";
import { getPlatformTenants, suspendPlatformTenant, restorePlatformTenant } from "@/lib/platform-api";
import { Badge, type BadgeTone } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { inputClass } from "@/components/admin/ui/field";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";
import { cn } from "@/lib/utils";

const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: "Active", tone: "success" },
  suspended: { label: "Suspendue", tone: "live" },
  provisioning: { label: "En création", tone: "warning" },
};

function statusMeta(status: string | null) {
  return STATUS_META[status ?? ""] ?? { label: status ?? "—", tone: "neutral" as BadgeTone };
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export function TenantsList({ initial }: { initial: PlatformPage<PlatformTenant> }) {
  const [tenants, setTenants] = useState(initial.data);
  const [meta, setMeta] = useState(initial.meta);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [isPending, startTransition] = useTransition();
  const firstRun = useRef(true);

  const load = useCallback((page: number, searchTerm: string, statusTerm: string) => {
    startTransition(async () => {
      try {
        const res = await getPlatformTenants(page, searchTerm, statusTerm);
        setTenants(res.data);
        setMeta(res.meta);
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Chargement impossible." });
      }
    });
  }, []);

  // Debounced search / filter (skips the initial render — the page seeded us).
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const timer = setTimeout(() => load(1, search, statusFilter), 350);
    return () => clearTimeout(timer);
  }, [search, statusFilter, load]);

  const goTo = (page: number) => load(page, search, statusFilter);

  const toggleStatus = (tenant: PlatformTenant) => {
    setStatus(null);
    startTransition(async () => {
      try {
        const updated =
          tenant.status === "suspended"
            ? await restorePlatformTenant(tenant.id)
            : await suspendPlatformTenant(tenant.id);
        setTenants((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setStatus({
          type: "success",
          message: `${updated.name} ${updated.status === "suspended" ? "suspendue" : "réactivée"}.`,
        });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Action impossible." });
      }
    });
  };

  return (
    <>
      <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-gold-dark">Console</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-indigo">Églises</h1>
      <p className="mt-1 text-sm text-body">{meta.total} église{meta.total > 1 ? "s" : ""} sur la plateforme.</p>

      <StatusBanner status={status} className="my-6" />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou adresse…"
            className={cn(inputClass, "py-2 pl-9")}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={cn(inputClass, "w-auto py-2")}
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actives</option>
          <option value="suspended">Suspendues</option>
          <option value="provisioning">En création</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-[18px] border border-indigo/10 bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-indigo/8 bg-cream text-left text-[11px] font-bold uppercase tracking-wider text-body">
              <th className="px-6 py-3.5">Église</th>
              <th className="px-4 py-3.5">Statut</th>
              <th className="px-4 py-3.5">Abonnement</th>
              <th className="px-4 py-3.5">Créée le</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-indigo/6">
            {tenants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-faint">
                  Aucune église ne correspond.
                </td>
              </tr>
            )}
            {tenants.map((tenant) => {
              const meta = statusMeta(tenant.status);
              const suspended = tenant.status === "suspended";
              return (
                <tr key={tenant.id} className="hover:bg-cream/40">
                  <td className="px-6 py-3.5">
                    <Link href={`/central/admin/tenants/${tenant.id}`} className="font-semibold text-indigo hover:text-gold-dark">
                      {tenant.name}
                    </Link>
                    <div className="font-mono text-xs text-faint">{tenant.slug}.churchapp.io</div>
                  </td>
                  <td className="px-4 py-3.5"><Badge tone={meta.tone}>{meta.label}</Badge></td>
                  <td className="px-4 py-3.5 text-body">{tenant.subscription_status ?? "—"}</td>
                  <td className="px-4 py-3.5 text-body">{formatDate(tenant.created_at)}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={suspended ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                        loading={isPending}
                        onClick={() => toggleStatus(tenant)}
                      >
                        {suspended ? "Réactiver" : "Suspendre"}
                      </Button>
                      <Link
                        href={`/central/admin/tenants/${tenant.id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-indigo transition hover:bg-cream"
                      >
                        Ouvrir <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-faint">Page {meta.current_page} / {meta.last_page}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<ChevronLeft className="size-3.5" />} disabled={meta.current_page <= 1 || isPending} onClick={() => goTo(meta.current_page - 1)}>
              Précédent
            </Button>
            <Button variant="secondary" size="sm" disabled={meta.current_page >= meta.last_page || isPending} onClick={() => goTo(meta.current_page + 1)}>
              Suivant <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
