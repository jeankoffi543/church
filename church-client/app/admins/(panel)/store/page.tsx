"use client";

import React, { useState } from "react";
import { ProductForm } from "./product-form";
import { AnalyticsFulfillment } from "./analytics-fulfillment";
import { LayoutDashboard, PlusCircle, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminStorePage() {
  const [activeTab, setActiveTab] = useState<"analytics" | "new_product">("analytics");

  return (
    <div className="space-y-6">
      {/* Tab Navigation header */}
      <div className="flex justify-between items-center bg-[#130d22] p-4 rounded-2xl border border-white/5 shadow-xl">
        <div className="flex items-center gap-2">
          <ShoppingBag className="size-5 text-[#b270ff]" />
          <h2 className="font-display text-lg font-bold text-white">Gestion de la Boutique</h2>
        </div>

        <div className="flex bg-[#0f091f] border border-white/10 rounded-xl p-1 shrink-0">
          <button
            onClick={() => setActiveTab("analytics")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none",
              activeTab === "analytics"
                ? "bg-[#b270ff] text-white"
                : "text-white/60 hover:text-white"
            )}
          >
            <LayoutDashboard className="size-3.5" /> Dashboard & Logistique
          </button>
          <button
            onClick={() => setActiveTab("new_product")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none",
              activeTab === "new_product"
                ? "bg-[#b270ff] text-white"
                : "text-white/60 hover:text-white"
            )}
          >
            <PlusCircle className="size-3.5" /> Créer un Produit
          </button>
        </div>
      </div>

      {/* Dynamic Tab view */}
      {activeTab === "analytics" ? (
        <AnalyticsFulfillment />
      ) : (
        <ProductForm onCancel={() => setActiveTab("analytics")} />
      )}
    </div>
  );
}
