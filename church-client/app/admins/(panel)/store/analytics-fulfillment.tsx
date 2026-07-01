"use client";

import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  ShoppingBag,
  Download,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Plus,
  RotateCcw
} from "lucide-react";
import { Order } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AnalyticsFulfillmentProps {
  initialOrders?: Order[];
}

export function AnalyticsFulfillment({ initialOrders = [] }: AnalyticsFulfillmentProps) {
  // Sandbox mode state
  const [liveTestMode, setLiveTestMode] = useState<"true" | "false">("true");

  // Orders State (in-memory for sandbox simulation)
  const [orders, setOrders] = useState<Order[]>(() => {
    if (initialOrders.length > 0) return initialOrders;
    return [
      {
        id: "ord-101",
        user_name: "Jean Koffi",
        total_amount: 35,
        payment_status: "paid",
        fulfillment_status: "preparing",
        items: [
          {
            id: "it-1",
            product_id: "prod-1",
            product_title: "Livre : L'Audace de la Foi",
            quantity: 1,
            price: 15,
            selected_attributes: { Format: "Relié", Couleur: "#e2b85f" }
          },
          {
            id: "it-2",
            product_id: "prod-2",
            product_title: "Bible d'étude MFM",
            quantity: 1,
            price: 20,
            selected_attributes: { Format: "Broché" }
          }
        ],
        created_at: "2026-06-30T10:15:00Z"
      },
      {
        id: "ord-102",
        user_name: "Marie Dubois",
        total_amount: 10,
        payment_status: "pending",
        fulfillment_status: "pickup_at_church",
        items: [
          {
            id: "it-3",
            product_id: "prod-3",
            product_title: "Recueil de Cantiques PDF",
            quantity: 1,
            price: 10
          }
        ],
        created_at: "2026-06-29T16:45:00Z"
      },
      {
        id: "ord-103",
        user_name: "Frère Samuel",
        total_amount: 45,
        payment_status: "paid",
        fulfillment_status: "shipped",
        items: [
          {
            id: "it-4",
            product_id: "prod-1",
            product_title: "Livre : L'Audace de la Foi",
            quantity: 3,
            price: 15,
            selected_attributes: { Format: "Broché" }
          }
        ],
        created_at: "2026-06-28T09:30:00Z"
      }
    ];
  });

  // Calculate Metrics
  const metrics = useMemo(() => {
    const paidOrders = orders.filter((o) => o.payment_status === "paid");
    const revenue = paidOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const aov = paidOrders.length > 0 ? revenue / paidOrders.length : 0;

    // Ratio calculation: count quantities of items
    let digitalItemsCount = 0;
    let physicalItemsCount = 0;

    paidOrders.forEach((order) => {
      order.items.forEach((item) => {
        // If it includes PDF/digital names or is simulated as digital
        const isDigitalName =
          item.product_title.toLowerCase().includes("pdf") ||
          item.product_title.toLowerCase().includes("cantique") ||
          item.product_title.toLowerCase().includes("numérique");
        
        if (isDigitalName) {
          digitalItemsCount += item.quantity;
        } else {
          physicalItemsCount += item.quantity;
        }
      });
    });

    const totalItems = digitalItemsCount + physicalItemsCount;
    const digitalPercent = totalItems > 0 ? (digitalItemsCount / totalItems) * 100 : 0;
    const physicalPercent = totalItems > 0 ? (physicalItemsCount / totalItems) * 100 : 0;

    return {
      revenue,
      aov,
      digitalPercent,
      physicalPercent,
      totalPaidOrders: paidOrders.length
    };
  }, [orders]);

  // Transition order status
  const moveOrder = (orderId: string, direction: "next" | "prev") => {
    // If not in live test mode and we had backend API, we would perform net fetch.
    if (liveTestMode === "false") {
      alert("Mode réseau actif : Enregistrement sur Laravel (simulé pour la démonstration)");
    }

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          let nextStatus: "preparing" | "shipped" | "pickup_at_church" = o.fulfillment_status;
          if (direction === "next") {
            if (o.fulfillment_status === "preparing") nextStatus = "shipped";
            else if (o.fulfillment_status === "shipped") nextStatus = "pickup_at_church";
          } else {
            if (o.fulfillment_status === "pickup_at_church") nextStatus = "shipped";
            else if (o.fulfillment_status === "shipped") nextStatus = "preparing";
          }
          return { ...o, fulfillment_status: nextStatus };
        }
        return o;
      })
    );
  };

  // Generate simulated random order in Sandbox mode
  const injectSimulatedOrder = () => {
    const firstNames = ["Aimé", "Marc", "Deborah", "Koffi", "Sarah", "Grace"];
    const lastNames = ["Yao", "Coulibaly", "Kouassi", "Konan", "Touré", "Gomez"];
    const randomName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    
    const randomAmount = Math.floor(Math.random() * 50) + 15;
    const newSim: Order = {
      id: `ord-sim-${Math.floor(Math.random() * 900) + 100}`,
      user_name: randomName,
      total_amount: randomAmount,
      payment_status: "paid",
      fulfillment_status: "preparing",
      items: [
        {
          id: `it-${Date.now()}`,
          product_id: `prod-${Math.floor(Math.random() * 5)}`,
          product_title: "Objet de dévotion ou Livre",
          quantity: 1,
          price: randomAmount,
          selected_attributes: { Format: "Standard" }
        }
      ],
      created_at: new Date().toISOString()
    };

    setOrders([newSim, ...orders]);
  };

  // Clear orders (Reset demo)
  const resetDemo = () => {
    setOrders([]);
  };

  return (
    <div className="bg-[#130d22] text-white p-6 md:p-8 rounded-2xl border border-white/5 space-y-8">
      
      {/* Test Sandbox Banner */}
      {liveTestMode === "true" && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider">Mode Bac à sable (Sandbox) Actif</h4>
              <p className="text-[11px] text-amber-400/70 mt-0.5">
                Les transactions, simulations et gestions logistiques s{"'"}exécutent uniquement en mémoire volatile locale. Aucun appel serveur n{"'"}est persisté.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={injectSimulatedOrder}
              className="bg-amber-400 hover:bg-amber-400/90 text-black text-xs font-bold px-3 py-1.5 h-8 cursor-pointer"
            >
              <Plus className="size-3.5 mr-1" /> Injecter commande
            </Button>
            <Button
              variant="outline"
              onClick={resetDemo}
              className="border-amber-500/30 text-amber-400 hover:bg-amber-400/10 text-xs px-3 py-1.5 h-8 cursor-pointer"
            >
              <RotateCcw className="size-3.5 mr-1" /> Effacer
            </Button>
          </div>
        </div>
      )}

      {/* Control Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <span className="text-[10px] font-bold tracking-[0.25em] text-[#b270ff] uppercase">Dashboard</span>
          <h1 className="text-2xl font-black tracking-tight mt-0.5">Suivi de la Boutique</h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-white/50">Régie Live Mode Sandbox :</span>
          <div className="flex bg-[#0f091f] border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setLiveTestMode("true")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer",
                liveTestMode === "true" ? "bg-[#b270ff] text-white" : "text-white/60 hover:text-white"
              )}
            >
              SIMULATION
            </button>
            <button
              onClick={() => setLiveTestMode("false")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer",
                liveTestMode === "false" ? "bg-[#b270ff] text-white" : "text-white/60 hover:text-white"
              )}
            >
              API LIVE
            </button>
          </div>
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: CA */}
        <div className="bg-[#1b1430] border border-white/5 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <span className="size-11 rounded-xl bg-[#b270ff]/10 text-[#b270ff] border border-[#b270ff]/20 flex items-center justify-center">
            <DollarSign className="size-5" />
          </span>
          <div>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Chiffre d{"'"}Affaires</span>
            <span className="text-xl font-black text-white">{metrics.revenue} €</span>
          </div>
        </div>

        {/* Card 2: AOV */}
        <div className="bg-[#1b1430] border border-white/5 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <span className="size-11 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <TrendingUp className="size-5" />
          </span>
          <div>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Panier Moyen (AOV)</span>
            <span className="text-xl font-black text-white">{metrics.aov.toFixed(1)} €</span>
          </div>
        </div>

        {/* Card 3: Physical ratio */}
        <div className="bg-[#1b1430] border border-white/5 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <span className="size-11 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
            <ShoppingBag className="size-5" />
          </span>
          <div className="flex-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Produits Physiques</span>
            <span className="text-xl font-black text-white">{metrics.physicalPercent.toFixed(0)} %</span>
            {/* Progress bar */}
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-1.5">
              <div className="bg-cyan-400 h-full" style={{ width: `${metrics.physicalPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Card 4: Digital Ratio */}
        <div className="bg-[#1b1430] border border-white/5 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <span className="size-11 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Download className="size-5" />
          </span>
          <div className="flex-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Numériques / Téléchargements</span>
            <span className="text-xl font-black text-white">{metrics.digitalPercent.toFixed(0)} %</span>
            {/* Progress bar */}
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-1.5">
              <div className="bg-emerald-400 h-full" style={{ width: `${metrics.digitalPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* KANBAN LOGISTIQUE FULFILLMENT */}
      <div className="space-y-4 pt-2">
        <h2 className="text-sm font-bold text-[#b270ff] uppercase tracking-wider">Suivi Logistique des Commandes</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: En Préparation */}
          <div className="bg-[#0f091f] border border-white/5 rounded-2xl p-4 flex flex-col min-h-[500px] space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-400 inline-block" /> En Préparation
              </h3>
              <span className="text-[10px] font-mono font-bold bg-white/5 px-2 py-0.5 rounded text-white/50">
                {orders.filter((o) => o.fulfillment_status === "preparing").length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {orders
                .filter((o) => o.fulfillment_status === "preparing")
                .map((o) => (
                  <OrderCard key={o.id} order={o} onNext={() => moveOrder(o.id, "next")} />
                ))}
              {orders.filter((o) => o.fulfillment_status === "preparing").length === 0 && (
                <EmptyColumn text="Aucune commande à préparer" />
              )}
            </div>
          </div>

          {/* Column 2: Expédié */}
          <div className="bg-[#0f091f] border border-white/5 rounded-2xl p-4 flex flex-col min-h-[500px] space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-cyan-400 inline-block" /> Expédié
              </h3>
              <span className="text-[10px] font-mono font-bold bg-white/5 px-2 py-0.5 rounded text-white/50">
                {orders.filter((o) => o.fulfillment_status === "shipped").length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {orders
                .filter((o) => o.fulfillment_status === "shipped")
                .map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    onNext={() => moveOrder(o.id, "next")}
                    onPrev={() => moveOrder(o.id, "prev")}
                  />
                ))}
              {orders.filter((o) => o.fulfillment_status === "shipped").length === 0 && (
                <EmptyColumn text="Aucune commande expédiée" />
              )}
            </div>
          </div>

          {/* Column 3: Prêt pour retrait guichet */}
          <div className="bg-[#0f091f] border border-white/5 rounded-2xl p-4 flex flex-col min-h-[500px] space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-400 inline-block" /> Retrait Guichet Église
              </h3>
              <span className="text-[10px] font-mono font-bold bg-white/5 px-2 py-0.5 rounded text-white/50">
                {orders.filter((o) => o.fulfillment_status === "pickup_at_church").length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {orders
                .filter((o) => o.fulfillment_status === "pickup_at_church")
                .map((o) => (
                  <OrderCard key={o.id} order={o} onPrev={() => moveOrder(o.id, "prev")} />
                ))}
              {orders.filter((o) => o.fulfillment_status === "pickup_at_church").length === 0 && (
                <EmptyColumn text="Aucune commande en attente de retrait" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub components
function OrderCard({
  order,
  onNext,
  onPrev
}: {
  order: Order;
  onNext?: () => void;
  onPrev?: () => void;
}) {
  return (
    <div className="bg-[#1b1430] border border-white/5 p-4 rounded-xl space-y-3 hover:border-white/10 transition relative">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[10px] font-mono text-white/40 block">{order.id}</span>
          <span className="font-bold text-xs text-white/90 block mt-0.5">{order.user_name}</span>
        </div>
        <span className={cn(
          "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
          order.payment_status === "paid" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
        )}>
          {order.payment_status === "paid" ? "Payé" : "En attente"}
        </span>
      </div>

      {/* Items list */}
      <div className="space-y-1.5 border-t border-white/5 pt-2">
        {order.items.map((item, idx) => (
          <div key={`${order.id}-${item.id}-${idx}`} className="text-[10px] text-white/70 leading-snug">
            <span className="font-bold text-white/95">{item.quantity}x</span> {item.product_title}
            {item.selected_attributes && Object.keys(item.selected_attributes).length > 0 && (
              <span className="text-white/40 block ml-3.5">
                ({Object.entries(item.selected_attributes)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ")})
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Amount and transitions */}
      <div className="flex justify-between items-center border-t border-white/5 pt-2.5">
        <span className="text-xs font-black text-[#e2b85f]">{order.total_amount} €</span>

        <div className="flex items-center gap-1">
          {onPrev && (
            <button
              onClick={onPrev}
              className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer"
              title="Reculer d&apos;étape"
            >
              <ArrowLeft className="size-3" />
            </button>
          )}
          {onNext && (
            <button
              onClick={onNext}
              className="p-1 rounded bg-[#b270ff]/10 hover:bg-[#b270ff]/20 text-[#b270ff] transition cursor-pointer"
              title="Avancer d&apos;étape"
            >
              <ArrowRight className="size-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyColumn({ text }: { text: string }) {
  return (
    <div className="py-12 text-center text-white/20 text-xs italic border border-dashed border-white/5 rounded-xl">
      {text}
    </div>
  );
}
