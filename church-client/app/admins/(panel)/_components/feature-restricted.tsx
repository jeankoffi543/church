import Link from "next/link";
import { Lock, ArrowLeft } from "lucide-react";

import { ADMIN_HOME_PATH } from "@/lib/auth/config";

/**
 * Shown when an administrator deep-links to a module their church's plan doesn't
 * include (CHR-179) — the plan-gated counterpart of AccessRestricted. Mirrors the
 * API's `feature:` middleware 403, but as a graceful upsell rather than an error.
 */
export function FeatureRestricted({
  message = "Cette fonctionnalité n'est pas incluse dans l'offre actuelle de votre église.",
}: {
  message?: string;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-[20px] border border-[rgba(40,25,80,0.08)] bg-white px-8 py-16 text-center shadow-[0_1px_3px_rgba(22,15,51,0.04)] animate-fade-up">
      <div className="flex size-16 items-center justify-center rounded-full bg-gold/15">
        <Lock className="size-8 text-gold-dark" />
      </div>
      <div className="space-y-2">
        <span className="text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">
          Offre supérieure requise
        </span>
        <h1 className="font-display text-[28px] font-semibold text-indigo italic">
          Module non inclus
        </h1>
        <p className="mx-auto max-w-sm text-sm text-body">{message}</p>
        <p className="mx-auto max-w-sm text-xs text-faint">
          Passez à une offre supérieure pour débloquer ce module.
        </p>
      </div>
      <Link
        href={ADMIN_HOME_PATH}
        className="flex items-center gap-2 rounded-xl bg-indigo px-5 py-3 text-xs font-bold text-white transition hover:bg-indigo-mid"
      >
        <ArrowLeft className="size-4" />
        Retour au tableau de bord
      </Link>
    </div>
  );
}
