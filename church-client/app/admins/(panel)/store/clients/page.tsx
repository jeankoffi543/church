"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

const SEGMENT_META: Record<string, { color: string; bg: string }> = {
  VIP: { color: "text-[#c8902e]", bg: "bg-[rgba(200,144,46,0.14)]" },
  Fidèle: { color: "text-[#7a4fd6]", bg: "bg-[rgba(122,79,214,0.12)]" },
  Actif: { color: "text-[#2a6fdb]", bg: "bg-[rgba(42,111,219,0.12)]" },
  Nouveau: { color: "text-[#1f8a5b]", bg: "bg-[rgba(31,138,91,0.12)]" },
};

const MOCK_CLIENTS = [
  { name: "Grâce Aka", email: "grace.aka@email.com", phone: "07 01 02 03 04", orders: 8, spent: 142000, since: "2024", segment: "VIP" },
  { name: "Emmanuel Koffi", email: "emma.koffi@email.com", phone: "05 44 55 66 77", orders: 5, spent: 89000, since: "2024", segment: "Fidèle" },
  { name: "Sarah Obi", email: "sarah.obi@email.com", phone: "01 22 33 44 55", orders: 3, spent: 47000, since: "2025", segment: "Fidèle" },
  { name: "Paul Diby", email: "paul.diby@email.com", phone: "07 88 99 00 11", orders: 2, spent: 28500, since: "2025", segment: "Actif" },
  { name: "Marie Aka", email: "marie.aka@email.com", phone: "05 66 77 88 99", orders: 6, spent: 96000, since: "2024", segment: "Fidèle" },
  { name: "Jean Kouassi", email: "jean.k@email.com", phone: "01 33 44 55 66", orders: 1, spent: 10000, since: "2026", segment: "Nouveau" },
];

export default function AdminStoreClientsPage() {
  const [clients] = useState(MOCK_CLIENTS);

  const totalClients = clients.length;
  const totalOrders = clients.reduce((acc, c) => acc + c.orders, 0);
  const totalSpent = clients.reduce((acc, c) => acc + c.spent, 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;
  const vipCount = clients.filter((c) => c.segment === "VIP").length;

  return (
    <div className="space-y-[22px] animate-fade-in">
      {/* Header */}
      <div>
        <span className="text-xs font-bold tracking-widest text-[#c8902e] uppercase">
          Communauté
        </span>
        <h1 className="font-display text-4xl font-semibold italic text-[#211648] mt-1.5">
          Gestion des clients
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-3">
        {[
          { label: "Clients", value: totalClients, color: "text-[#211648]" },
          { label: "Panier moyen", value: `${avgOrderValue.toLocaleString("fr-FR")} FCFA`, color: "text-[#3a2a6e]" },
          { label: "Clients VIP", value: vipCount, color: "text-[#c8902e]" },
        ].map((stat, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[rgba(40,25,80,0.07)] bg-white p-5"
          >
            <div className="text-xs font-semibold text-[#9a93ad] mb-1.5">{stat.label}</div>
            <div className={cn("font-display text-3xl font-bold", stat.color)}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Clients Card */}
      <div className="rounded-2xl border border-[rgba(40,25,80,0.07)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="border-b border-[rgba(40,25,80,0.07)] text-left text-[11px] font-bold tracking-wider text-[#9a93ad] uppercase">
                <th className="p-[14px_20px] w-[35%]">Client</th>
                <th className="p-[14px_20px] w-[25%]">Contact</th>
                <th className="p-[14px_20px]">Commandes</th>
                <th className="p-[14px_20px]">Total dépensé</th>
                <th className="p-[14px_20px]">Segment</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c, i) => {
                const segment = SEGMENT_META[c.segment] || SEGMENT_META.Nouveau;
                const initial = c.name.charAt(0);

                return (
                  <tr
                    key={i}
                    className="border-b border-[rgba(40,25,80,0.05)] align-middle transition hover:bg-[#faf8f4]"
                  >
                    {/* Client info with avatar */}
                    <td className="p-[14px_20px]">
                      <div className="flex items-center gap-3">
                        <div className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3a2a6e] to-[#160f33]">
                          <span className="font-display font-bold italic text-[#e2b85f] text-lg select-none">
                            {initial}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-[#211648]">
                            {c.name}
                          </div>
                          <div className="text-[11.5px] text-[#9a93ad]">
                            Depuis {c.since}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contacts info */}
                    <td className="p-[14px_20px]">
                      <div className="text-[12.5px] text-[#5a5470] leading-relaxed">
                        {c.email}
                        <br />
                        {c.phone}
                      </div>
                    </td>

                    {/* Orders count */}
                    <td className="p-[14px_20px] text-sm font-bold text-[#211648]">
                      {c.orders}
                    </td>

                    {/* Total spent */}
                    <td className="p-[14px_20px] font-display text-lg font-bold text-[#211648]">
                      {c.spent.toLocaleString("fr-FR")} FCFA
                    </td>

                    {/* Segment badge */}
                    <td className="p-[14px_20px]">
                      <span
                        className={cn(
                          "inline-block rounded-lg px-[11px] py-[5px] text-[11.5px] font-extrabold",
                          segment.color,
                          segment.bg
                        )}
                      >
                        {c.segment}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
