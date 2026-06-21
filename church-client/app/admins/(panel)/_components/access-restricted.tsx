import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

import { ADMIN_HOME_PATH } from "@/lib/auth/config";

/**
 * Graceful screen shown when an administrator reaches a department they are not
 * authorised for (mirrors the API's 403 response).
 */
export function AccessRestricted({
  message = "Vous n'avez pas les privilèges requis pour accéder à ce département.",
}: {
  message?: string;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-[20px] border border-[rgba(40,25,80,0.08)] bg-white px-8 py-16 text-center shadow-[0_1px_3px_rgba(22,15,51,0.04)] animate-fade-up">
      <div className="flex size-16 items-center justify-center rounded-full bg-live/10">
        <ShieldAlert className="size-8 text-live" />
      </div>
      <div className="space-y-2">
        <span className="text-[11px] font-bold tracking-[0.2em] text-live uppercase">
          Accès restreint
        </span>
        <h1 className="font-display text-[28px] font-semibold text-indigo italic">
          Département protégé
        </h1>
        <p className="mx-auto max-w-sm text-sm text-body">{message}</p>
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
