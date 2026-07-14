"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

import type { ManagedPlan, PlanInput } from "@/lib/platform-api";
import { createManagedPlan, updateManagedPlan, deleteManagedPlan } from "@/lib/platform-api";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Field, inputClass } from "@/components/admin/ui/field";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";
import { cn } from "@/lib/utils";

// Mirrors the backend Feature enum (church-api App\Enums\Feature). Adding a new
// capability is a code change; the owner composes plans from this fixed set.
const FEATURES: { value: string; label: string }[] = [
  { value: "custom_domain", label: "Domaine personnalisé" },
  { value: "store", label: "Boutique" },
  { value: "finances", label: "Finances" },
  { value: "evangelism", label: "Évangélisation" },
  { value: "followups", label: "Suivi & relances" },
  { value: "teams", label: "Équipes" },
  { value: "resources", label: "Ressources" },
  { value: "live", label: "Live" },
  { value: "studio", label: "Studio" },
  { value: "multi_campus", label: "Multi-campus" },
  { value: "analytics", label: "Analytics" },
];

function formatMoney(minor: number, currency: string): string {
  try {
    return (minor / 100).toLocaleString("fr-FR", { style: "currency", currency });
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

function limitLabel(value: number | null | undefined): string {
  return value === null || value === undefined ? "illimité" : String(value);
}

export function PlansManager({ initial }: { initial: ManagedPlan[] }) {
  const [plans, setPlans] = useState<ManagedPlan[]>(initial);
  const [editing, setEditing] = useState<ManagedPlan | "new" | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [isPending, startTransition] = useTransition();

  const upsertLocal = (plan: ManagedPlan) =>
    setPlans((prev) => {
      const next = prev.some((p) => p.id === plan.id)
        ? prev.map((p) => (p.id === plan.id ? plan : p))
        : [...prev, plan];
      return next.sort((a, b) => a.sort_order - b.sort_order);
    });

  const handleSave = (input: PlanInput) => {
    startTransition(async () => {
      try {
        const saved =
          editing && editing !== "new"
            ? await updateManagedPlan(editing.id, input)
            : await createManagedPlan(input);
        upsertLocal(saved);
        setEditing(null);
        setStatus({ type: "success", message: `Plan « ${saved.name} » enregistré.` });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Enregistrement impossible." });
      }
    });
  };

  const handleDelete = (plan: ManagedPlan) => {
    if (!window.confirm(`Supprimer le plan « ${plan.name} » ? Cette action est définitive.`)) return;
    startTransition(async () => {
      try {
        await deleteManagedPlan(plan.id);
        setPlans((prev) => prev.filter((p) => p.id !== plan.id));
        setStatus({ type: "success", message: `Plan « ${plan.name} » supprimé.` });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Suppression impossible." });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-indigo">Plans d&apos;abonnement</h1>
          <p className="text-sm text-body">Catalogue personnalisable — prix, fonctionnalités et limites de chaque offre.</p>
        </div>
        {editing === null && (
          <Button icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>
            Nouveau plan
          </Button>
        )}
      </div>

      <StatusBanner status={status} />

      {editing !== null && (
        <PlanEditor
          key={editing === "new" ? "new" : editing.id}
          plan={editing === "new" ? null : editing}
          busy={isPending}
          onCancel={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      <div className="grid gap-4">
        {plans.length === 0 && (
          <p className="rounded-2xl border border-dashed border-indigo/15 bg-white p-8 text-center text-sm text-body">
            Aucun plan pour le moment.
          </p>
        )}
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "flex flex-col gap-4 rounded-2xl border border-indigo/10 bg-white p-5 sm:flex-row sm:items-start sm:justify-between",
              !plan.is_active && "opacity-70",
            )}
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-lg font-bold text-indigo">{plan.name}</span>
                <code className="rounded bg-cream px-1.5 py-0.5 text-xs text-body">{plan.code}</code>
                {plan.is_active ? (
                  <Badge tone="success">Actif</Badge>
                ) : (
                  <Badge tone="neutral">Inactif</Badge>
                )}
                {plan.studio_included && <Badge tone="info">Studio inclus</Badge>}
              </div>
              <p className="text-sm text-body">
                <strong className="text-indigo">{formatMoney(plan.price_month, plan.currency)}</strong> / mois ·{" "}
                {formatMoney(plan.price_year, plan.currency)} / an
              </p>
              <p className="text-xs text-body">
                Limites — membres : {limitLabel(plan.limits.members)} · stockage : {limitLabel(plan.limits.storage_gb)} Go ·
                sièges : {limitLabel(plan.limits.staff_seats)}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {plan.features.length === 0 && <span className="text-xs text-body/60">Aucune fonctionnalité</span>}
                {plan.features.map((f) => (
                  <span key={f} className="rounded-full bg-cream px-2 py-0.5 text-[11px] text-body">
                    {FEATURES.find((x) => x.value === f)?.label ?? f}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={<Pencil className="size-3.5" />} onClick={() => setEditing(plan)}>
                Éditer
              </Button>
              <Button
                variant="destructive"
                size="sm"
                icon={<Trash2 className="size-3.5" />}
                disabled={isPending}
                onClick={() => handleDelete(plan)}
              >
                Supprimer
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type FormState = {
  code: string;
  name: string;
  price_month: string;
  price_year: string;
  currency: string;
  paystack_plan_code: string;
  features: string[];
  members: string;
  storage_gb: string;
  staff_seats: string;
  studio_included: boolean;
  sort_order: string;
  is_active: boolean;
};

function toForm(plan: ManagedPlan | null): FormState {
  const major = (minor: number): string => (minor / 100).toString();
  const limit = (v: number | null | undefined): string => (v === null || v === undefined ? "" : String(v));
  return {
    code: plan?.code ?? "",
    name: plan?.name ?? "",
    price_month: plan ? major(plan.price_month) : "0",
    price_year: plan ? major(plan.price_year) : "0",
    currency: plan?.currency ?? "USD",
    paystack_plan_code: plan?.paystack_plan_code ?? "",
    features: plan?.features ?? [],
    members: limit(plan?.limits.members),
    storage_gb: limit(plan?.limits.storage_gb),
    staff_seats: limit(plan?.limits.staff_seats),
    studio_included: plan?.studio_included ?? false,
    sort_order: plan ? String(plan.sort_order) : "0",
    is_active: plan?.is_active ?? true,
  };
}

function PlanEditor({
  plan,
  busy,
  onCancel,
  onSave,
}: {
  plan: ManagedPlan | null;
  busy: boolean;
  onCancel: () => void;
  onSave: (input: PlanInput) => void;
}) {
  const [form, setForm] = useState<FormState>(() => toForm(plan));

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleFeature = (value: string) =>
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(value)
        ? prev.features.filter((f) => f !== value)
        : [...prev.features, value],
    }));

  const submit = () => {
    const toMinor = (major: string): number => Math.round((Number(major) || 0) * 100);
    const toLimit = (v: string): number | null => (v.trim() === "" ? null : Number(v));
    onSave({
      code: form.code.trim(),
      name: form.name.trim(),
      price_month: toMinor(form.price_month),
      price_year: toMinor(form.price_year),
      currency: form.currency.trim().toUpperCase(),
      paystack_plan_code: form.paystack_plan_code.trim() || null,
      features: form.features,
      limits: {
        members: toLimit(form.members),
        storage_gb: toLimit(form.storage_gb),
        staff_seats: toLimit(form.staff_seats),
      },
      studio_included: form.studio_included,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    });
  };

  return (
    <div className="space-y-5 rounded-2xl border border-gold/40 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-bold text-indigo">
        {plan ? `Éditer « ${plan.name} »` : "Nouveau plan"}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom" required>
          <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Paroisse" />
        </Field>
        <Field label="Code" required hint="Identifiant unique (a-z, chiffres, tirets)">
          <input className={inputClass} value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="starter" />
        </Field>
        <Field label="Prix mensuel" hint="Dans la devise ci-dessous">
          <input className={inputClass} type="number" min="0" step="0.01" value={form.price_month} onChange={(e) => set("price_month", e.target.value)} />
        </Field>
        <Field label="Prix annuel">
          <input className={inputClass} type="number" min="0" step="0.01" value={form.price_year} onChange={(e) => set("price_year", e.target.value)} />
        </Field>
        <Field label="Devise" hint="Code ISO à 3 lettres">
          <input className={inputClass} value={form.currency} maxLength={3} onChange={(e) => set("currency", e.target.value)} placeholder="USD" />
        </Field>
        <Field label="Code plan Paystack" hint="Optionnel — pour l'abonnement récurrent">
          <input className={inputClass} value={form.paystack_plan_code} onChange={(e) => set("paystack_plan_code", e.target.value)} placeholder="PLN_xxx" />
        </Field>
      </div>

      <div>
        <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Fonctionnalités</span>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {FEATURES.map((f) => {
            const on = form.features.includes(f.value);
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => toggleFeature(f.value)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
                  on ? "border-gold bg-gold/10 text-indigo" : "border-indigo/10 bg-cream text-body hover:border-gold/40",
                )}
              >
                <span className={cn("grid size-4 place-items-center rounded border", on ? "border-gold bg-gold text-indigo" : "border-body/30")}>
                  {on && <Check className="size-3" />}
                </span>
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Limite membres" hint="Vide = illimité">
          <input className={inputClass} type="number" min="0" value={form.members} onChange={(e) => set("members", e.target.value)} placeholder="illimité" />
        </Field>
        <Field label="Stockage (Go)" hint="Vide = illimité">
          <input className={inputClass} type="number" min="0" value={form.storage_gb} onChange={(e) => set("storage_gb", e.target.value)} placeholder="illimité" />
        </Field>
        <Field label="Sièges staff" hint="Vide = illimité">
          <input className={inputClass} type="number" min="0" value={form.staff_seats} onChange={(e) => set("staff_seats", e.target.value)} placeholder="illimité" />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-indigo">
          <input type="checkbox" className="size-4 accent-gold-dark" checked={form.studio_included} onChange={(e) => set("studio_included", e.target.checked)} />
          Studio inclus
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-indigo">
          <input type="checkbox" className="size-4 accent-gold-dark" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
          Plan actif (visible publiquement)
        </label>
        <Field label="Ordre" className="w-24">
          <input className={inputClass} type="number" min="0" value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
        </Field>
      </div>

      <div className="flex justify-end gap-2 border-t border-indigo/10 pt-4">
        <Button variant="ghost" icon={<X className="size-4" />} onClick={onCancel} disabled={busy}>
          Annuler
        </Button>
        <Button icon={<Check className="size-4" />} onClick={submit} loading={busy}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
