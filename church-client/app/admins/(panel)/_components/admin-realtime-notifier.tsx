"use client";

import { HandHeart, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useAdminChannel, type PrayerReceived } from "@/lib/echo";

type Toast = { id: number; title: string; body: string };

/**
 * Live back-office notifications (CHR-157). Subscribes to this church's PRIVATE
 * admin channel and surfaces incoming events (a visitor's prayer request lands
 * instantly, no polling). Authentication runs through `/api/broadcasting/auth`,
 * so a church's admins only ever see their own church's notifications.
 */
export function AdminRealtimeNotifier({ channelPrefix }: { channelPrefix: string }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const onPrayer = useCallback((p: PrayerReceived) => {
    setToasts((cur) => [
      ...cur,
      { id: p.id, title: "Nouvelle demande de prière", body: `${p.name} · ${p.category}` },
    ]);
  }, []);

  useAdminChannel(channelPrefix, { onPrayer });

  const dismiss = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(92vw,340px)] flex-col gap-2">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDone={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 8000);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <div
      role="status"
      className="pointer-events-auto flex items-start gap-3 rounded-xl border-l-4 border-gold bg-ink/95 px-4 py-3 text-white shadow-lg backdrop-blur"
    >
      <HandHeart className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{toast.title}</p>
        <p className="truncate text-xs text-white/70">{toast.body}</p>
      </div>
      <button
        type="button"
        onClick={onDone}
        aria-label="Fermer"
        className="shrink-0 text-white/50 transition-colors hover:text-white"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
