"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Pagination } from "../../_components/pagination";
import type { AdminClient } from "@/lib/admin-api";

const SEGMENT_META: Record<string, { color: string; bg: string }> = {
  VIP: { color: "text-[#c8902e]", bg: "bg-[rgba(200,144,46,0.14)]" },
  'Fidèle': { color: "text-[#7a4fd6]", bg: "bg-[rgba(122,79,214,0.12)]" },
  Actif: { color: "text-[#2a6fdb]", bg: "bg-[rgba(42,111,219,0.12)]" },
  Nouveau: { color: "text-[#1f8a5b]", bg: "bg-[rgba(31,138,91,0.12)]" },
};

export default function AdminStoreClientsPage() {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [filterSegment, setFilterSegment] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  
  const [sortBy, setSortBy] = useState<"name" | "orders" | "spent" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

  useEffect(() => {
    const loadClients = async () => {
      setIsLoading(true);
      try {
        const { getAdminClients } = await import("@/lib/admin-api");
        const data = await getAdminClients(search);
        if (data) {
          setClients(data);
        } else {
          setClients([]);
        }
      } catch (err) {
        console.error("Error loading clients:", err);
        setClients([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadClients();
  }, [search]);

  // Statistics from all clients matching search (for accuracy)
  const totalClients = clients.length;
  const totalOrders = clients.reduce((acc, c) => acc + (c.orders || 0), 0);
  const totalSpent = clients.reduce((acc, c) => acc + (c.spent || 0), 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;
  const vipCount = clients.filter((c) => c.segment === "VIP").length;

  const filteredClients = useMemo(() => {
    let result = [...clients];

    // Filter by segment
    if (filterSegment !== "all") {
      result = result.filter((c) => c.segment === filterSegment);
    }

    // Sort
    if (sortBy) {
      result.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];
        if (typeof valA === "string" && typeof valB === "string") {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }
        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [clients, filterSegment, sortBy, sortOrder]);

  const paginatedClients = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredClients.slice(start, start + perPage);
  }, [filteredClients, page, perPage]);

  const handleSort = (column: "name" | "orders" | "spent") => {
    if (sortBy !== column) {
      setSortBy(column);
      setSortOrder("asc");
    } else {
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else {
        setSortBy(null);
        setSortOrder(null);
      }
    }
    setPage(1);
  };

  const renderSortChevron = (column: "name" | "orders" | "spent") => {
    if (sortBy !== column) {
      return <ChevronsUpDown className="size-3 text-faint shrink-0" />;
    }
    if (sortOrder === "asc") {
      return <ChevronUp className="size-3 text-gold-dark shrink-0" />;
    }
    if (sortOrder === "desc") {
      return <ChevronDown className="size-3 text-gold-dark shrink-0" />;
    }
    return <ChevronsUpDown className="size-3 text-faint shrink-0" />;
  };

  const segmentChips = [
    { key: "all", label: "Tous" },
    { key: "VIP", label: "VIP" },
    { key: "Fidèle", label: "Fidèles" },
    { key: "Actif", label: "Actifs" },
    { key: "Nouveau", label: "Nouveaux" },
  ];

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

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between flex-wrap z-20 relative">
        <div className="flex flex-wrap gap-2">
          {segmentChips.map((chip) => {
            const active = filterSegment === chip.key;
            return (
              <button
                key={chip.key}
                onClick={() => {
                  setFilterSegment(chip.key);
                  setPage(1);
                }}
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
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
          <Input
            type="text"
            placeholder="Rechercher par nom, email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border-[#281950]/14 bg-white pl-9 text-xs text-indigo placeholder:text-faint w-full"
          />
        </div>
      </div>

      {/* Clients Card */}
      <div className="rounded-2xl border border-[rgba(40,25,80,0.07)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <span className="text-sm font-semibold text-faint">Chargement des clients...</span>
            </div>
          ) : (
            <table className="w-full min-w-[700px] border-collapse">
              <thead>
                <tr className="border-b border-[rgba(40,25,80,0.07)] text-left text-[11px] font-bold tracking-wider text-[#9a93ad] uppercase select-none">
                  <th className="p-[14px_20px] w-[35%] cursor-pointer" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1.5">
                      Client {renderSortChevron("name")}
                    </div>
                  </th>
                  <th className="p-[14px_20px] w-[25%]">Contact</th>
                  <th className="p-[14px_20px] cursor-pointer" onClick={() => handleSort("orders")}>
                    <div className="flex items-center gap-1.5">
                      Commandes {renderSortChevron("orders")}
                    </div>
                  </th>
                  <th className="p-[14px_20px] cursor-pointer" onClick={() => handleSort("spent")}>
                    <div className="flex items-center gap-1.5">
                      Total dépensé {renderSortChevron("spent")}
                    </div>
                  </th>
                  <th className="p-[14px_20px]">Segment</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClients.map((c, i) => {
                  const segment = SEGMENT_META[c.segment] || SEGMENT_META.Nouveau;
                  const initial = c.name ? c.name.charAt(0) : "C";

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

                      {/* Contact details */}
                      <td className="p-[14px_20px]">
                        <div className="text-sm font-bold text-[#211648] truncate">
                          {c.email}
                        </div>
                        <div className="text-xs text-[#9a93ad] mt-0.5">
                          {c.phone}
                        </div>
                      </td>

                      {/* Total orders count */}
                      <td className="p-[14px_20px] text-sm font-bold text-[#211648]">
                        {c.orders}
                      </td>

                      {/* Total spent */}
                      <td className="p-[14px_20px] text-sm font-extrabold text-[#211648]">
                        {Number(c.spent).toLocaleString("fr-FR")} FCFA
                      </td>

                      {/* Client segment badge */}
                      <td className="p-[14px_20px]">
                        <span
                          className={cn(
                            "inline-block rounded-full px-2.5 py-[5px] text-[11px] font-extrabold uppercase",
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
          )}
        </div>

        {!isLoading && filteredClients.length === 0 && (
          <div className="py-16 text-center text-[#9a93ad] text-xs font-bold bg-white">
            Aucun client correspondant.
          </div>
        )}
      </div>

      {/* Pagination control */}
      {!isLoading && filteredClients.length > 0 && (
        <div className="mt-4 border-t border-[#281950]/6 pt-4 bg-white p-4 rounded-2xl border border-[rgba(40,25,80,0.07)]">
          <Pagination
            page={page}
            pageCount={Math.max(1, Math.ceil(filteredClients.length / perPage))}
            perPage={perPage}
            total={filteredClients.length}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        </div>
      )}
    </div>
  );
}
