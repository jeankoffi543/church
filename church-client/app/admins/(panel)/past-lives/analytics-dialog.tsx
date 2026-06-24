"use client";

import { BarChart3, Eye, Loader2, MessagesSquare, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CHURCH_REACTIONS } from "@/lib/church-reactions";
import { getPastLiveAnalytics, type AdminPastLive, type PastLiveAnalytics } from "@/lib/admin-api";
import type { ReactionType } from "@/lib/live";

export function AnalyticsDialog({
  live,
  open,
  onOpenChange,
}: {
  live: AdminPastLive | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<PastLiveAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !live) return;
    let active = true;
    const run = async () => {
      setLoading(true);
      setData(null);
      try {
        const res = await getPastLiveAnalytics(live.id);
        if (active) setData(res);
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [open, live]);

  const totalReactions = data ? Object.values(data.reactions).reduce((a, b) => a + b, 0) : 0;
  const engagement = data && data.views_count > 0 ? Math.round((data.messages_count / data.views_count) * 100) : 0;
  const maxBucket = data ? Math.max(1, ...data.chat_timeline.map((b) => b.count)) : 1;
  const maxReaction = Math.max(1, ...CHURCH_REACTIONS.map((r) => data?.reactions[r.type] ?? 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-h-[88vh] w-[95vw] gap-0 overflow-y-auto rounded-2xl border-0 bg-white p-0 md:max-w-2xl"
      >
        <div className="border-b border-[rgba(40,25,80,0.08)] px-6 py-4">
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">Impressions</span>
          <h3 className="mt-0.5 font-display text-xl font-bold text-indigo italic">{live?.title ?? ""}</h3>
        </div>

        {loading || !data ? (
          <div className="flex items-center justify-center gap-2 py-20 text-body">
            <Loader2 className="size-5 animate-spin" /> Chargement des impressions…
          </div>
        ) : (
          <div className="flex flex-col gap-6 px-6 py-6">
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard icon={<Eye className="size-4" />} label="Vues uniques" value={data.views_count.toLocaleString("fr-FR")} hint="Spectateurs uniques (anti-rafraîchissement, fenêtre de 12 h)." />
              <MetricCard icon={<MessagesSquare className="size-4" />} label="Messages" value={data.messages_count.toLocaleString("fr-FR")} hint="Nombre total de messages de chat durant le direct." />
              <MetricCard icon={<Sparkles className="size-4" />} label="Réactions" value={totalReactions.toLocaleString("fr-FR")} hint="Total des émojis (Feu, Adoration, Colombe, Couronne, Amour) envoyés." />
              <MetricCard icon={<BarChart3 className="size-4" />} label="Engagement" value={`${engagement}%`} hint="Participation au chat : messages pour 100 vues uniques." />
            </div>

            {/* Reaction histogram */}
            <section>
              <h4 className="mb-3 text-[12px] font-bold tracking-wide text-body-strong uppercase">Émojis les plus envoyés</h4>
              {totalReactions === 0 ? (
                <p className="text-xs text-faint">Aucune réaction enregistrée pour cette diffusion.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {CHURCH_REACTIONS.map((r) => {
                    const count = data.reactions[r.type as ReactionType] ?? 0;
                    return (
                      <div key={r.type} className="flex items-center gap-3">
                        <span className="w-6 text-center text-base">{r.emoji}</span>
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-[rgba(40,25,80,0.06)]">
                          <div
                            className="h-full rounded-full transition-[width] duration-500"
                            style={{ width: `${(count / maxReaction) * 100}%`, background: r.color }}
                          />
                        </div>
                        <span className="w-12 text-right font-mono text-xs font-semibold text-indigo">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Chat retention curve */}
            <section>
              <h4 className="mb-3 text-[12px] font-bold tracking-wide text-body-strong uppercase">
                Rétention du chat (messages / 5 min)
              </h4>
              {data.chat_timeline.length === 0 ? (
                <p className="text-xs text-faint">Aucun message pour tracer la courbe.</p>
              ) : (
                <div className="rounded-xl border border-[rgba(40,25,80,0.08)] bg-cream/40 p-3">
                  {/* Bars: each column is full-height so the % height resolves. */}
                  <div className="flex h-32 items-end gap-1.5">
                    {data.chat_timeline.map((b) => (
                      <div key={b.minute} className="flex h-full flex-1 items-end" title={`${b.minute} min · ${b.count} message(s)`}>
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-gold-dark to-gold transition-[height] duration-500"
                          style={{ height: `${Math.max(6, (b.count / maxBucket) * 100)}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  {/* Minute axis */}
                  <div className="mt-1.5 flex gap-1.5">
                    {data.chat_timeline.map((b) => (
                      <span key={b.minute} className="flex-1 text-center text-[9px] font-semibold text-faint">
                        {b.minute}′
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MetricCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div title={hint} className="flex flex-col gap-1.5 rounded-xl border border-[rgba(40,25,80,0.08)] bg-cream/50 p-3.5">
      <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-body uppercase">
        {icon} {label}
      </span>
      <span className="font-display text-2xl font-bold text-indigo">{value}</span>
    </div>
  );
}
