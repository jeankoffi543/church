"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useServerList } from "../../_components/use-server-list";
import { Pagination } from "../../_components/pagination";
import { Input } from "@/components/ui/input";

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  nouvelle: { label: "Nouvelle", color: "text-[#2a6fdb]", bg: "bg-[rgba(42,111,219,0.12)]" },
  preparation: { label: "En préparation", color: "text-[#c8902e]", bg: "bg-[rgba(200,144,46,0.14)]" },
  expediee: { label: "Expédiée", color: "text-[#7a4fd6]", bg: "bg-[rgba(122,79,214,0.14)]" },
  livree: { label: "Livrée", color: "text-[#1f8a5b]", bg: "bg-[rgba(31,138,91,0.14)]" },
  annulee: { label: "Annulée", color: "text-[#c9536b]", bg: "bg-[rgba(201,83,107,0.12)]" },
};

export default function AdminStoreOrdersPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  const orderFilters = useMemo(() => {
    const filters: Record<string, string> = {};
    if (filter !== "all") {
      filters.fulfillment_status__eq = filter;
    }
    return filters;
  }, [filter]);

  const {
    items: rawOrders,
    meta,
    isLoading,
    refresh
  } = useServerList<any>({
    fetcher: async (params) => {
      const { getAdminOrdersPaginated } = await import("@/lib/admin-api");
      return getAdminOrdersPaginated(params);
    },
    params: {
      page,
      perPage,
      search,
      filters: orderFilters,
      sort: { field: "created_at", dir: "desc" }
    },
    initialData: [],
    initialMeta: { current_page: 1, last_page: 1, total: 0, per_page: 10 },
    loadOnMount: true,
  });

  const orders = useMemo(() => {
    return (rawOrders || []).map((o: any) => {
      const lines = (o.items || []).map((item: any) => {
        const attrsStr = item.selected_attributes && Object.keys(item.selected_attributes).length > 0
          ? " (" + Object.entries(item.selected_attributes).map(([k, v]) => `${k}: ${v}`).join(", ") + ")"
          : "";
        return {
          name: `${item.product_title}${attrsStr} × ${item.quantity}`,
          price: Number(item.price) * Number(item.quantity)
        };
      });

      return {
        id: o.reference || `MFM-${o.id}`,
        dbId: Number(o.id),
        customer: `${o.customer_first_name} ${o.customer_last_name}`,
        date: new Date(o.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }),
        status: o.fulfillment_status,
        payment: o.payment_method,
        delivery: o.delivery_label || o.delivery_key,
        address: `${o.customer_email} · ${o.customer_phone}`,
        lines: lines
      };
    });
  }, [rawOrders]);

  const toggleOrder = (id: string) => {
    setOpenOrderId((prev) => (prev === id ? null : id));
  };

  const updateOrderStatus = async (id: string, newStatus: string) => {
    const targetOrder = orders.find(o => o.id === id);
    if (!targetOrder || !targetOrder.dbId) return;

    try {
      const { updateAdminOrderStatus } = await import("@/lib/admin-api");
      await updateAdminOrderStatus(targetOrder.dbId, newStatus);
      refresh();
    } catch (err: any) {
      alert(err.message || "Erreur de changement de statut");
    }
  };

  const getOrderTotal = (lines: { price: number }[]) => {
    return lines.reduce((acc, l) => acc + l.price, 0);
  };

  const handleChipClick = (key: string) => {
    setFilter(key);
    setPage(1);
  };

  const filterChips = [
    { key: "all", label: "Toutes" },
    { key: "nouvelle", label: "Nouvelles" },
    { key: "preparation", label: "En préparation" },
    { key: "expediee", label: "Expédiées" },
    { key: "livree", label: "Livrées" },
  ];

  return (
    <div className="space-y-[22px] animate-fade-in">
      {/* Header */}
      <div>
        <span className="text-xs font-bold tracking-widest text-[#c8902e] uppercase">
          Ventes
        </span>
        <h1 className="font-display text-4xl font-semibold italic text-[#211648] mt-1.5">
          Gestion des commandes
        </h1>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between flex-wrap z-20 relative">
        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => {
            const active = filter === chip.key;
            return (
              <button
                key={chip.key}
                onClick={() => handleChipClick(chip.key)}
                className={cn(
                  "rounded-full px-4 py-2 text-xs font-bold border transition cursor-pointer select-none",
                  active
                    ? "bg-gradient-to-r from-[#3a2a6e] to-[#211648] text-white border-transparent"
                    : "bg-white border-[rgba(40,25,80,0.12)] text-[#4a4360] hover:border-[#c8902e]"
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint animate-pulse" />
          <Input
            type="text"
            placeholder="Rechercher par client, email, réf..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border-[#281950]/14 bg-white pl-9 text-xs text-indigo placeholder:text-faint w-full"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="py-20 flex justify-center bg-white rounded-2xl border border-[rgba(40,25,80,0.07)]">
            <span className="text-sm font-semibold text-faint">Chargement des commandes...</span>
          </div>
        ) : (
          orders.map((o) => {
            const status = STATUS_META[o.status] || STATUS_META.nouvelle;
            const open = openOrderId === o.id;
            const total = getOrderTotal(o.lines);

            return (
              <div
                key={o.id}
                className="rounded-2xl border border-[rgba(40,25,80,0.07)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.05)] overflow-hidden"
              >
                {/* Header row (clickable) */}
                <div
                  onClick={() => toggleOrder(o.id)}
                  className="flex flex-wrap items-center gap-4 px-5 py-4 cursor-pointer hover:bg-[#faf8f4] select-none"
                >
                  <div className="min-w-[120px]">
                    <div className="text-[14.5px] font-extrabold text-[#211648]">
                      {o.id}
                    </div>
                    <div className="text-xs text-[#9a93ad]">{o.date}</div>
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <div className="text-sm font-bold text-[#211648]">
                      {o.customer}
                    </div>
                    <div className="text-xs text-[#9a93ad]">
                      {o.lines.length} article(s)
                    </div>
                  </div>
                  <span className="font-display text-xl font-bold text-[#211648]">
                    {total.toLocaleString("fr-FR")} FCFA
                  </span>
                  <span
                    className={cn(
                      "inline-block rounded-lg px-3 py-1.5 text-[11.5px] font-extrabold",
                      status.color,
                      status.bg
                    )}
                  >
                    {status.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 text-[#9a93ad] transition-transform duration-200",
                      open && "rotate-180"
                    )}
                  />
                </div>

                {/* Collapsible expanded section */}
                <div
                  className={cn(
                    "grid transition-all duration-250 ease-out border-t border-[rgba(40,25,80,0.06)] bg-white",
                    open
                      ? "grid-rows-[1fr] opacity-100 p-5 pt-0"
                      : "grid-rows-[0fr] opacity-0 h-0 overflow-hidden"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="flex flex-wrap gap-6 pt-4">
                      {/* Articles list */}
                      <div className="flex-1 min-w-[240px]">
                        <div className="text-[11px] font-bold tracking-wider text-[#9a93ad] uppercase mb-2.5">
                          Articles
                        </div>
                        <div className="flex flex-col gap-2">
                          {o.lines.map((l: any, i: number) => (
                            <div
                              key={i}
                              className="flex justify-between text-[13.5px] text-[#5a5470]"
                            >
                              <span>{l.name}</span>
                              <span className="font-bold text-[#211648]">
                                {l.price.toLocaleString("fr-FR")} FCFA
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Delivery & Payment details */}
                      <div className="flex-1 min-w-[200px]">
                        <div className="text-[11px] font-bold tracking-wider text-[#9a93ad] uppercase mb-2.5">
                          Livraison & paiement
                        </div>
                        <div className="text-[13.5px] text-[#5a5470] leading-relaxed">
                          {o.address}
                          <br />
                          {o.delivery}
                          <br />
                          Paiement ·{" "}
                          <strong className="text-[#211648]">{o.payment}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Actions / Status update */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-[rgba(40,25,80,0.06)] mt-4 pt-3.5">
                      <span className="text-[12.5px] font-bold text-[#5a5470]">
                        Changer le statut :
                      </span>
                      {Object.entries(STATUS_META).map(([key, valMeta]) => {
                        const isCurrent = o.status === key;
                        return (
                          <button
                            key={key}
                            onClick={() => updateOrderStatus(o.id, key)}
                            className={cn(
                              "rounded-lg border px-3 py-1.5 text-[12.5px] font-bold transition cursor-pointer select-none",
                              isCurrent
                                ? cn(valMeta.color, valMeta.bg, "border-current")
                                : "bg-white border-[rgba(40,25,80,0.12)] text-[#6f6a85] hover:border-[#c8902e]"
                            )}
                          >
                            {valMeta.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {!isLoading && orders.length === 0 && (
          <div className="py-16 text-center text-[#9a93ad] text-xs font-bold bg-white border border-[#281950]/8 rounded-2xl">
            Aucune commande correspondante.
          </div>
        )}
      </div>

      {/* Pagination control */}
      {!isLoading && orders.length > 0 && (
        <div className="mt-4 border-t border-[#281950]/6 pt-4 bg-white p-4 rounded-2xl border border-[rgba(40,25,80,0.07)]">
          <Pagination
            page={page}
            pageCount={meta.last_page || 1}
            perPage={perPage}
            total={meta.total}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        </div>
      )}
    </div>
  );
}
