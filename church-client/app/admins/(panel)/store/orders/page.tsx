"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  nouvelle: { label: "Nouvelle", color: "text-[#2a6fdb]", bg: "bg-[rgba(42,111,219,0.12)]" },
  preparation: { label: "En préparation", color: "text-[#c8902e]", bg: "bg-[rgba(200,144,46,0.14)]" },
  expediee: { label: "Expédiée", color: "text-[#7a4fd6]", bg: "bg-[rgba(122,79,214,0.14)]" },
  livree: { label: "Livrée", color: "text-[#1f8a5b]", bg: "bg-[rgba(31,138,91,0.14)]" },
  annulee: { label: "Annulée", color: "text-[#c9536b]", bg: "bg-[rgba(201,83,107,0.12)]" },
};

const MOCK_ORDERS = [
  { id: "MFM-2041", customer: "Grâce Aka", date: "28 juin 2026", status: "nouvelle", payment: "Orange Money", delivery: "Livraison Abidjan", address: "Cocody Angré, Abidjan", lines: [{ name: "Bible d'étude « Maison du Feu » × 1", price: 25000 }, { name: "Bougie de prière × 2", price: 9000 }] },
  { id: "MFM-2040", customer: "Emmanuel Koffi", date: "28 juin 2026", status: "preparation", payment: "Wave", delivery: "Retrait à l'église", address: "Retrait — MFM Ficgayo", lines: [{ name: "T-shirt « Génération Feu » × 2", price: 18000 }] },
  { id: "MFM-2039", customer: "Sarah Obi", date: "27 juin 2026", status: "expediee", payment: "Carte bancaire", delivery: "Livraison intérieur", address: "Bouaké", lines: [{ name: "Album « Feu du Ciel » × 1", price: 8000 }, { name: "Mug « Grâce » × 1", price: 5000 }] },
  { id: "MFM-2038", customer: "Paul Diby", date: "26 juin 2026", status: "livree", payment: "MTN Money", delivery: "Livraison Abidjan", address: "Yopougon", lines: [{ name: "Casquette brodée MFM × 1", price: 7500 }, { name: "Tote bag × 1", price: 6000 }] },
  { id: "MFM-2037", customer: "Marie Aka", date: "25 juin 2026", status: "livree", payment: "Orange Money", delivery: "Retrait à l'église", address: "Retrait — MFM Ficgayo", lines: [{ name: "Recueil « Vivre par la Foi » × 3", price: 36000 }] },
  { id: "MFM-2036", customer: "Jean Kouassi", date: "24 juin 2026", status: "annulee", payment: "Wave", delivery: "Livraison Abidjan", address: "Marcory", lines: [{ name: "Mug « Grâce » × 2", price: 10000 }] },
];

export default function AdminStoreOrdersPage() {
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [filter, setFilter] = useState("all");
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  const filteredOrders = orders.filter(
    (o) => filter === "all" || o.status === filter
  );

  const toggleOrder = (id: string) => {
    setOpenOrderId((prev) => (prev === id ? null : id));
  };

  const updateOrderStatus = (id: string, newStatus: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
    );
  };

  const getOrderTotal = (lines: { price: number }[]) => {
    return lines.reduce((acc, l) => acc + l.price, 0);
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

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {filterChips.map((chip) => {
          const active = filter === chip.key;
          return (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
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

      {/* Orders List */}
      <div className="flex flex-col gap-3">
        {filteredOrders.map((o) => {
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
                    : "grid-rows-[0fr] opacity-0"
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
                        {o.lines.map((l, i) => (
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
                    {Object.entries(STATUS_META).map(([key, meta]) => {
                      const isCurrent = o.status === key;
                      return (
                        <button
                          key={key}
                          onClick={() => updateOrderStatus(o.id, key)}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-[12.5px] font-bold transition cursor-pointer select-none",
                            isCurrent
                              ? cn(meta.color, meta.bg, "border-current")
                              : "bg-white border-[rgba(40,25,80,0.12)] text-[#6f6a85] hover:border-[#c8902e]"
                          )}
                        >
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
