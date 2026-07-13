"use client";

import { useState, useTransition } from "react";
import { CreditCard, Check, Sparkles, RadioTower } from "lucide-react";

import type { BillingStatus, BillingPlan } from "@/lib/admin-api";
import { subscribeAdminBilling } from "@/lib/admin-api";
import { featureLabel, formatPrice } from "@/lib/central";
import { PageShell, PageHeader } from "@/components/admin/data/page-shell";
import { Button } from "@/components/admin/ui/button";
import { Badge, type BadgeTone } from "@/components/admin/ui/badge";
import { inputClass } from "@/components/admin/ui/field";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, { label: string; tone: BadgeTone }> = {
  trialing: { label: "Période d'essai", tone: "warning" },
  active: { label: "Actif", tone: "success" },
  past_due: { label: "Paiement en retard", tone: "warning" },
  suspended: { label: "Suspendu", tone: "live" },
  canceled: { label: "Annulé", tone: "live" },
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function BillingManager({ initial, adminEmail }: { initial: BillingStatus; adminEmail: string }) {
  const [email, setEmail] = useState(adminEmail);
  const [status, setStatus] = useState<Status>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { plan, subscription_status, trial_ends_at, current_period_end, studio, plans } = initial;
  const meta = STATUS_LABEL[subscription_status ?? ""] ?? { label: subscription_status ?? "—", tone: "neutral" as BadgeTone };
  const renewsOn = formatDate(current_period_end);
  const trialEndsOn = formatDate(trial_ends_at);

  const subscribe = (target: BillingPlan) => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setStatus({ type: "error", message: "Renseignez un email de facturation valide." });
      return;
    }
    setPendingCode(target.code);
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await subscribeAdminBilling(target.code, email, `${window.location.origin}/admins/settings/billing`);
        if (res.authorization_url) {
          window.location.href = res.authorization_url; // → Paystack checkout
          return;
        }
        setStatus({ type: "error", message: "Impossible d'ouvrir le paiement. Réessayez." });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Opération impossible." });
      } finally {
        setPendingCode(null);
      }
    });
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Église & Présentation"
        title="Abonnement"
        subtitle="Votre offre actuelle et le passage à une offre supérieure. Le paiement est sécurisé par Paystack ; l'activation est confirmée automatiquement."
      />

      <StatusBanner status={status} className="mb-6" />

      {/* Current plan */}
      <div className="mb-8 rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-indigo/5">
              <CreditCard className="size-5 text-indigo" />
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-wider text-body uppercase">Offre actuelle</p>
              <p className="font-display text-2xl font-bold text-indigo">{plan?.name ?? "Aucune offre"}</p>
              {plan && (
                <p className="text-sm text-body">
                  {formatPrice(plan.price_month, plan.currency)}
                  {plan.price_month > 0 ? " / mois" : ""}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {trialEndsOn && subscription_status === "trialing" && (
              <span className="text-xs text-faint">Essai jusqu&apos;au {trialEndsOn}</span>
            )}
            {renewsOn && <span className="text-xs text-faint">Renouvellement le {renewsOn}</span>}
          </div>
        </div>

        {studio.enabled && (
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-sm text-indigo">
            <RadioTower className="size-4 text-gold-dark" />
            Studio Live · <strong>{studio.used}</strong> / {studio.seats} licence{studio.seats > 1 ? "s" : ""} utilisée{studio.used > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Plan catalogue */}
      <h2 className="mb-3 font-display text-lg font-bold text-indigo">Changer d&apos;offre</h2>
      <div className="mb-4 max-w-sm">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-indigo">Email de facturation</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = p.code === plan?.code;
          const paid = p.price_month > 0;
          const busy = pendingCode === p.code && isPending;
          return (
            <div
              key={p.code}
              className={cn(
                "flex flex-col rounded-[18px] border p-5",
                isCurrent ? "border-gold bg-gold/[0.04]" : "border-[rgba(40,25,80,0.08)] bg-white",
              )}
            >
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-body">{p.name}</p>
                {p.studio_included && <Sparkles className="size-4 text-gold-dark" />}
              </div>
              <p className="mt-2 text-2xl font-bold text-indigo">{formatPrice(p.price_month, p.currency)}</p>
              <p className="text-xs text-faint">{paid ? "par mois" : "pour toujours"}</p>

              <ul className="mt-4 flex flex-1 flex-col gap-1.5 text-sm text-body">
                {p.features.length === 0 && <li className="text-faint">Fonctions essentielles</li>}
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-gold-dark" />
                    {featureLabel(f)}
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {isCurrent ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold-dark">
                    <Check className="size-4" /> Offre actuelle
                  </span>
                ) : paid ? (
                  <Button className="w-full" loading={busy} onClick={() => subscribe(p)}>
                    Passer à {p.name}
                  </Button>
                ) : (
                  <span className="text-xs text-faint">Contactez-nous pour revenir à cette offre.</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
