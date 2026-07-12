"use client";

import { AlertTriangle, Loader2, Square } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { LiveDot } from "@/components/ui/live-dot";
import { updateAdminSettings } from "@/lib/admin-api";
import { tenantApiBase } from "@/lib/tenant/api-base";

/**
 * Live status indicator shown in the admin top bar on every backoffice page.
 * Polls the public live setting so it stays accurate even when the live is
 * started/stopped elsewhere, and lets an admin cut a running live (with a
 * confirmation) — which triggers the backend archival.
 */
export function LiveStatusControl({ initialIsLive }: { initialIsLive: boolean }) {
  const [isLive, setIsLive] = useState(initialIsLive);
  const [confirmStop, setConfirmStop] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Keep the indicator fresh across the whole backoffice.
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const res = await fetch(`${await tenantApiBase()}/public/settings?group=live`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok || !active) return;
        const live = (await res.json())?.data;
        if (live && active) setIsLive(Boolean(live.live_status));
      } catch {
        /* keep last known state */
      }
    };
    const interval = setInterval(refresh, 15_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleStop = () => {
    setConfirmStop(false);
    startTransition(async () => {
      try {
        await updateAdminSettings([{ key: "live_status", value: false, group: "live" }]);
        setIsLive(false);
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <>
      {isLive ? (
        <div className="flex items-center gap-2 rounded-xl border border-live/30 bg-live/10 px-3 py-1.5">
          <span className="flex items-center gap-2 text-[13px] font-extrabold tracking-wide text-live">
            <LiveDot className="size-2" /> EN DIRECT
          </span>
          <button
            type="button"
            onClick={() => setConfirmStop(true)}
            disabled={isPending}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-live px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Square className="size-3.5 fill-white" />}
            Arrêter le direct
          </button>
        </div>
      ) : (
        <span className="flex items-center gap-2 rounded-xl border border-[rgba(40,25,80,0.12)] bg-cream px-3.5 py-2 text-[13px] font-bold text-body">
          <span className="size-2 rounded-full bg-body/40" /> Hors direct
        </span>
      )}

      {/* Stop-live confirmation */}
      {confirmStop && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm animate-fade-up"
          onClick={() => setConfirmStop(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-live/10 text-live">
                <AlertTriangle className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-indigo">Arrêter le direct ?</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-body">
                  La diffusion sera coupée immédiatement pour tous les spectateurs. Le direct est
                  alors archivé automatiquement et son chat reste consultable en rediffusion. Cette
                  action est irréversible.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmStop(false)}
                disabled={isPending}
                className="cursor-pointer rounded-xl border border-[rgba(40,25,80,0.12)] bg-white px-4 py-2.5 text-sm font-bold text-body transition hover:bg-cream disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleStop}
                disabled={isPending}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-live px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4 fill-white" />}
                Arrêter le direct
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
