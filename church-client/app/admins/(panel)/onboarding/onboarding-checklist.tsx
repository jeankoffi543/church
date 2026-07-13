"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight, PartyPopper } from "lucide-react";

import type { OnboardingStatus } from "@/lib/admin-api";
import { dismissAdminOnboarding } from "@/lib/admin-api";
import { PageShell, PageHeader } from "@/components/admin/data/page-shell";
import { Button } from "@/components/admin/ui/button";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";

export function OnboardingChecklist({ initial }: { initial: OnboardingStatus }) {
  const [dismissed, setDismissed] = useState(initial.dismissed);
  const [status, setStatus] = useState<Status>(null);
  const [isPending, startTransition] = useTransition();

  const { steps, completed, total } = initial;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = completed >= total;

  const handleDismiss = () => {
    startTransition(async () => {
      try {
        await dismissAdminOnboarding();
        setDismissed(true);
        setStatus({ type: "success", message: "Guide masqué. Vous pouvez y revenir à tout moment depuis « Démarrage »." });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Action impossible." });
      }
    });
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Démarrage"
        title="Bienvenue sur ChurchApp 👋"
        subtitle="Quelques étapes pour configurer votre église. Elles se cochent toutes seules au fur et à mesure."
      />

      <StatusBanner status={status} className="mb-6" />

      <div className="rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
        {/* Progress */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-indigo">
              {completed} / {total} étape{total > 1 ? "s" : ""} terminée{completed > 1 ? "s" : ""}
            </span>
            <span className="font-mono text-xs text-faint">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-indigo/10">
            <div
              className="h-full rounded-full bg-gold transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {allDone && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-online/30 bg-online/10 px-4 py-3 text-sm font-semibold text-online">
            <PartyPopper className="size-4" /> Tout est prêt — votre église est configurée !
          </div>
        )}

        <ul className="flex flex-col divide-y divide-[rgba(40,25,80,0.06)]">
          {steps.map((step) => (
            <li key={step.key} className="flex items-center gap-3 py-3.5">
              {step.done ? (
                <CheckCircle2 className="size-5 shrink-0 text-online" />
              ) : (
                <Circle className="size-5 shrink-0 text-faint" />
              )}
              <span className={`flex-1 text-sm ${step.done ? "text-faint line-through" : "font-semibold text-indigo"}`}>
                {step.label}
              </span>
              {!step.done && (
                <Link
                  href={step.href}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-gold-dark transition hover:bg-cream"
                >
                  Commencer <ArrowRight className="size-3.5" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>

      {!dismissed && (
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" loading={isPending} onClick={handleDismiss}>
            Ne plus afficher
          </Button>
        </div>
      )}
    </PageShell>
  );
}
