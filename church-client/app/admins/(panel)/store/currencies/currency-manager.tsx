"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Coins, Crown, Save, Search, X } from "lucide-react";

import type { AdminCurrency } from "@/lib/admin-api";
import { updateAdminCurrency, setDefaultAdminCurrency } from "@/lib/admin-api";
import { currencyFlag } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { PageShell, PageHeader } from "@/components/admin/data/page-shell";
import { Button } from "@/components/admin/ui/button";
import { inputClass } from "@/components/admin/ui/field";
import { Badge } from "@/components/admin/ui/badge";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";
import { Pagination } from "../../_components/pagination";

type EditBuffer = { symbol: string; exchange_rate: string };

function bufferOf(currency: AdminCurrency): EditBuffer {
  return { symbol: currency.symbol, exchange_rate: String(currency.exchange_rate) };
}

export function CurrencyManager({ initialCurrencies }: { initialCurrencies: AdminCurrency[] }) {
  const [currencies, setCurrencies] = useState<AdminCurrency[]>(initialCurrencies);
  const [buffers, setBuffers] = useState<Record<number, EditBuffer>>(() =>
    Object.fromEntries(initialCurrencies.map((c) => [c.id, bufferOf(c)]))
  );
  const [savingId, setSavingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);
  const [defaultTarget, setDefaultTarget] = useState<AdminCurrency | null>(null);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(30);

  const isDirty = (currency: AdminCurrency) => {
    const buf = buffers[currency.id];
    if (!buf) return false;
    const rate = Number(buf.exchange_rate);
    return buf.symbol !== currency.symbol || (Number.isFinite(rate) && rate !== currency.exchange_rate);
  };

  const setBuffer = (id: number, patch: Partial<EditBuffer>) => {
    setStatus(null);
    setBuffers((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const resetBuffer = (currency: AdminCurrency) => {
    setBuffers((prev) => ({ ...prev, [currency.id]: bufferOf(currency) }));
  };

  const handleSaveRow = (currency: AdminCurrency) => {
    const buf = buffers[currency.id];
    const rate = Number(buf.exchange_rate);
    if (!buf.symbol.trim() || !Number.isFinite(rate) || rate <= 0) {
      setStatus({ type: "error", message: "Symbole requis et taux de change strictement positif." });
      return;
    }
    setSavingId(currency.id);
    startTransition(async () => {
      try {
        const updated = await updateAdminCurrency(currency.id, {
          symbol: buf.symbol.trim(),
          exchange_rate: rate,
        });
        setCurrencies((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setBuffers((prev) => ({ ...prev, [updated.id]: bufferOf(updated) }));
        setStatus({ type: "success", message: `Devise ${updated.code} mise à jour.` });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Mise à jour impossible." });
      } finally {
        setSavingId(null);
      }
    });
  };

  const handleToggleActive = (currency: AdminCurrency) => {
    if (currency.is_default) return;
    setSavingId(currency.id);
    startTransition(async () => {
      try {
        const updated = await updateAdminCurrency(currency.id, { is_active: !currency.is_active });
        setCurrencies((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setStatus({
          type: "success",
          message: `Devise ${updated.code} ${updated.is_active ? "activée" : "désactivée"}.`,
        });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Mise à jour impossible." });
      } finally {
        setSavingId(null);
      }
    });
  };

  const confirmSetDefault = () => {
    const currency = defaultTarget;
    if (!currency) return;
    setDefaultTarget(null);
    setSavingId(currency.id);
    startTransition(async () => {
      try {
        const updated = await setDefaultAdminCurrency(currency.id);
        setCurrencies((prev) =>
          prev.map((c) =>
            c.id === updated.id ? updated : c.is_default ? { ...c, is_default: false } : c
          )
        );
        setBuffers((prev) => ({ ...prev, [updated.id]: bufferOf(updated) }));
        setStatus({ type: "success", message: `${updated.code} est désormais la devise pivot du magasin.` });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Opération impossible." });
      } finally {
        setSavingId(null);
      }
    });
  };

  const activeCount = currencies.filter((c) => c.is_active).length;

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    return currencies
      .filter((c) => showInactive || c.is_active)
      .filter((c) => q === "" || c.code.includes(q))
      .sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0) || a.code.localeCompare(b.code));
  }, [currencies, search, showInactive]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Boutique"
        title="Devises"
        subtitle={`${activeCount} devise${activeCount > 1 ? "s" : ""} active${activeCount > 1 ? "s" : ""} sur ${currencies.length} (ISO 4217) · les taux sont exprimés par rapport à la devise pivot (taux = 1).`}
      />

      <StatusBanner status={status} className="mb-6" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher un code (EUR, USD…)"
            className={cn(inputClass, "py-2 pl-9")}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-body-strong">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => {
              setShowInactive(e.target.checked);
              setPage(1);
            }}
            className="size-4 accent-gold-dark"
          />
          Afficher les devises inactives ({currencies.length - activeCount})
        </label>
      </div>

      <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[rgba(40,25,80,0.08)] bg-cream">
              <th className="px-6 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Devise</th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Symbole</th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Taux de change</th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold tracking-wider text-body uppercase">Statut</th>
              <th className="px-6 py-3.5 text-right text-[11px] font-bold tracking-wider text-body uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
            {paged.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-faint">
                  Aucune devise ne correspond à cette recherche.
                </td>
              </tr>
            )}
            {paged.map((currency) => {
              const buf = buffers[currency.id] ?? bufferOf(currency);
              const dirty = isDirty(currency);
              const busy = savingId === currency.id && isPending;
              return (
                <tr key={currency.id} className="hover:bg-cream/30">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg leading-none">{currencyFlag(currency.code)}</span>
                      <div>
                        <div className="flex items-center gap-1.5 font-semibold text-indigo">
                          {currency.code}
                          {currency.is_default && <Crown className="size-3.5 text-gold-dark" />}
                        </div>
                        {currency.is_default && (
                          <span className="text-[11px] text-faint">Devise pivot</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <input
                      type="text"
                      value={buf.symbol}
                      onChange={(e) => setBuffer(currency.id, { symbol: e.target.value })}
                      maxLength={20}
                      className={cn(inputClass, "w-24 py-2")}
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.000001"
                        min="0.000001"
                        disabled={currency.is_default}
                        value={buf.exchange_rate}
                        onChange={(e) => setBuffer(currency.id, { exchange_rate: e.target.value })}
                        className={cn(inputClass, "w-36 py-2 disabled:cursor-not-allowed disabled:opacity-60")}
                      />
                      {currency.is_default && (
                        <span className="text-[11px] text-faint">(pivot, fixe)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      type="button"
                      disabled={currency.is_default || busy}
                      onClick={() => handleToggleActive(currency)}
                      className="cursor-pointer disabled:cursor-not-allowed"
                      title={currency.is_default ? "La devise pivot est toujours active" : "Basculer le statut"}
                    >
                      <Badge tone={currency.is_active ? "success" : "neutral"}>
                        {currency.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      {dirty && (
                        <>
                          <button
                            onClick={() => resetBuffer(currency)}
                            className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-cream hover:text-indigo"
                            title="Annuler"
                          >
                            <X className="size-4" />
                          </button>
                          <Button
                            size="sm"
                            icon={<Save className="size-3.5" />}
                            loading={busy}
                            onClick={() => handleSaveRow(currency)}
                          >
                            Enregistrer
                          </Button>
                        </>
                      )}
                      {!dirty && !currency.is_default && (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Coins className="size-3.5" />}
                          disabled={!currency.is_active || busy}
                          onClick={() => setDefaultTarget(currency)}
                        >
                          Définir par défaut
                        </Button>
                      )}
                      {!dirty && currency.is_default && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gold-dark">
                          <Check className="size-3.5" /> Pivot actuel
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-[14px] border border-[rgba(40,25,80,0.08)] bg-white">
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            total={filtered.length}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={(n) => {
              setPerPage(n);
              setPage(1);
            }}
            itemLabel="devises"
          />
        </div>
      )}

      <ConfirmDialog
        open={defaultTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDefaultTarget(null);
        }}
        title="Changer la devise pivot ?"
        message={`« ${defaultTarget?.code ?? ""} » deviendra la devise de référence (taux = 1) pour tout le magasin ; les prix des produits, exprimés dans la devise pivot, seront donc affichés différemment dans les autres devises.`}
        confirmLabel="Définir par défaut"
        loading={isPending}
        onConfirm={confirmSetDefault}
      />
    </PageShell>
  );
}
