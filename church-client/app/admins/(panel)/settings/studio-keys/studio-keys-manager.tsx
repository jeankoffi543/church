"use client";

import { useState, useTransition } from "react";
import { KeyRound, Plus, Copy, Check, Trash2, ShieldCheck } from "lucide-react";

import type { StudioKey } from "@/lib/admin-api";
import { createAdminStudioKey, revokeAdminStudioKey } from "@/lib/admin-api";
import { PageShell, PageHeader } from "@/components/admin/data/page-shell";
import { Button } from "@/components/admin/ui/button";
import { Badge, type BadgeTone } from "@/components/admin/ui/badge";
import { inputClass } from "@/components/admin/ui/field";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";
import { cn } from "@/lib/utils";

function keyState(key: StudioKey): { label: string; tone: BadgeTone } {
  if (key.revoked_at) return { label: "Révoquée", tone: "neutral" };
  if (key.bound_device) return { label: "Activée", tone: "success" };
  return { label: "En attente", tone: "info" };
}

export function StudioKeysManager({ initial }: { initial: { keys: StudioKey[]; seats: number; used: number } }) {
  const [keys, setKeys] = useState<StudioKey[]>(initial.keys);
  const [used, setUsed] = useState(initial.used);
  const [label, setLabel] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [revokeTarget, setRevokeTarget] = useState<StudioKey | null>(null);
  const [isPending, startTransition] = useTransition();

  const seatsLeft = Math.max(0, initial.seats - used);

  const generate = () => {
    if (!label.trim()) {
      setStatus({ type: "error", message: "Donnez un nom à cette licence (ex. « Régie principale »)." });
      return;
    }
    setStatus(null);
    startTransition(async () => {
      try {
        const { key, activation } = await createAdminStudioKey(label.trim());
        setKeys((prev) => [activation, ...prev]);
        setUsed((u) => u + 1);
        setFreshKey(key);
        setCopied(false);
        setLabel("");
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Génération impossible." });
      }
    });
  };

  const copyFresh = () => {
    if (!freshKey) return;
    navigator.clipboard?.writeText(freshKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const confirmRevoke = () => {
    const key = revokeTarget;
    if (!key) return;
    setRevokeTarget(null);
    startTransition(async () => {
      try {
        await revokeAdminStudioKey(key.id);
        setKeys((prev) => prev.map((k) => (k.id === key.id ? { ...k, revoked_at: new Date().toISOString() } : k)));
        setUsed((u) => Math.max(0, u - 1));
        setStatus({ type: "success", message: `Licence « ${key.label} » révoquée.` });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Révocation impossible." });
      }
    });
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Église & Présentation"
        title="Licences Studio Live"
        subtitle={`Générez une clé d'activation par poste de régie. ${used} / ${initial.seats} licence${initial.seats > 1 ? "s" : ""} utilisée${used > 1 ? "s" : ""}.`}
      />

      <StatusBanner status={status} className="mb-6" />

      {/* Freshly generated key — shown once */}
      {freshKey && (
        <div className="mb-6 rounded-[14px] border border-gold/40 bg-gold/[0.06] p-4">
          <p className="mb-2 text-[13px] font-semibold text-indigo">
            Copiez cette clé maintenant — elle ne sera plus jamais affichée.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-indigo/10 bg-white px-3 py-2">
            <code className="flex-1 truncate font-mono text-sm text-indigo">{freshKey}</code>
            <button
              type="button"
              onClick={copyFresh}
              className="cursor-pointer rounded p-1.5 text-faint transition hover:bg-cream hover:text-indigo"
              title="Copier"
            >
              {copied ? <Check className="size-4 text-online" /> : <Copy className="size-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Generate */}
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white p-5 shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
        <label className="flex flex-1 flex-col gap-1.5 text-sm">
          <span className="font-semibold text-indigo">Nouvelle licence</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && seatsLeft > 0 && generate()}
            placeholder="Régie principale"
            maxLength={255}
            className={cn(inputClass, "min-w-[220px]")}
          />
        </label>
        <Button icon={<Plus className="size-4" />} loading={isPending} disabled={seatsLeft === 0} onClick={generate}>
          Générer
        </Button>
      </div>

      {seatsLeft === 0 && (
        <p className="mb-4 text-sm text-body">
          Toutes vos licences sont utilisées. Révoquez-en une ou passez à une offre supérieure pour en obtenir plus.
        </p>
      )}

      {/* Keys list */}
      <div className="flex flex-col gap-3">
        {keys.length === 0 && (
          <p className="rounded-[14px] border border-dashed border-indigo/15 bg-cream/30 px-4 py-10 text-center text-sm text-faint">
            Aucune licence pour le moment.
          </p>
        )}
        {keys.map((key) => {
          const state = keyState(key);
          return (
            <div
              key={key.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[rgba(40,25,80,0.08)] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(22,15,51,0.04)]"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-indigo/5">
                  {key.bound_device ? <ShieldCheck className="size-5 text-online" /> : <KeyRound className="size-5 text-indigo" />}
                </div>
                <div>
                  <p className="font-semibold text-indigo">{key.label}</p>
                  <p className="font-mono text-xs text-faint">{key.key_prefix}…</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={state.tone}>{state.label}</Badge>
                {!key.revoked_at && (
                  <button
                    type="button"
                    onClick={() => setRevokeTarget(key)}
                    className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-cream hover:text-live"
                    title="Révoquer"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(o) => {
          if (!o) setRevokeTarget(null);
        }}
        title="Révoquer cette licence ?"
        message={`« ${revokeTarget?.label ?? ""} » cessera immédiatement de fonctionner sur le poste où elle est utilisée. Cette action libère une place.`}
        confirmLabel="Révoquer"
        loading={isPending}
        onConfirm={confirmRevoke}
      />
    </PageShell>
  );
}
