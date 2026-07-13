"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Pause, Play, LogIn, Save, KeyRound, Plus, Trash2, Copy, Check, Globe } from "lucide-react";

import type { PlatformTenant, PlatformPlan, PlatformStudioKey } from "@/lib/platform-api";
import {
  suspendPlatformTenant,
  restorePlatformTenant,
  updatePlatformTenant,
  impersonatePlatformTenant,
  subscribePlatformTenant,
  createPlatformStudioKey,
  revokePlatformStudioKey,
} from "@/lib/platform-api";
import { Badge, type BadgeTone } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { inputClass } from "@/components/admin/ui/field";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";
import { cn } from "@/lib/utils";

const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: "Active", tone: "success" },
  suspended: { label: "Suspendue", tone: "live" },
  provisioning: { label: "En création", tone: "warning" },
};

export function TenantDetail({
  tenant: initialTenant,
  studio: initialStudio,
  plans,
}: {
  tenant: PlatformTenant;
  studio: { keys: PlatformStudioKey[]; seats: number };
  plans: PlatformPlan[];
}) {
  const [tenant, setTenant] = useState(initialTenant);
  const [keys, setKeys] = useState(initialStudio.keys);
  const [studioEnabled, setStudioEnabled] = useState(initialTenant.studio_enabled);
  const [studioSeats, setStudioSeats] = useState(String(initialTenant.studio_seats));
  const [keyLabel, setKeyLabel] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [billingEmail, setBillingEmail] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [isPending, startTransition] = useTransition();

  const meta = STATUS_META[tenant.status ?? ""] ?? { label: tenant.status ?? "—", tone: "neutral" as BadgeTone };
  const suspended = tenant.status === "suspended";
  const usedSeats = keys.filter((k) => !k.revoked_at).length;

  const run = (fn: () => Promise<void>) => {
    setStatus(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Action impossible." });
      }
    });
  };

  const toggleStatus = () =>
    run(async () => {
      const updated = suspended ? await restorePlatformTenant(tenant.id) : await suspendPlatformTenant(tenant.id);
      setTenant(updated);
      setStatus({ type: "success", message: `Église ${updated.status === "suspended" ? "suspendue" : "réactivée"}.` });
    });

  const impersonate = () =>
    run(async () => {
      const res = await impersonatePlatformTenant(tenant.id);
      if (res.token && res.tenant.domain) {
        window.open(`https://${res.tenant.domain}/admins/impersonate?token=${encodeURIComponent(res.token)}`, "_blank", "noopener,noreferrer");
        setStatus({ type: "success", message: `Session de support ouverte pour ${res.impersonated_user.name}.` });
      } else {
        setStatus({ type: "error", message: "Impossible d'ouvrir la session." });
      }
    });

  const saveStudio = () =>
    run(async () => {
      const seats = Math.max(0, parseInt(studioSeats, 10) || 0);
      const updated = await updatePlatformTenant(tenant.id, { studio_enabled: studioEnabled, studio_seats: seats });
      setTenant(updated);
      setStudioSeats(String(updated.studio_seats));
      setStatus({ type: "success", message: "Configuration Studio enregistrée." });
    });

  const generateKey = () => {
    if (!keyLabel.trim()) {
      setStatus({ type: "error", message: "Donnez un nom à la licence." });
      return;
    }
    run(async () => {
      const { key, activation } = await createPlatformStudioKey(tenant.id, keyLabel.trim());
      setKeys((prev) => [activation, ...prev]);
      setFreshKey(key);
      setCopied(false);
      setKeyLabel("");
    });
  };

  const revokeKey = (id: number) =>
    run(async () => {
      await revokePlatformStudioKey(id);
      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k)));
      setStatus({ type: "success", message: "Licence révoquée." });
    });

  const subscribe = (planCode: string) => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(billingEmail)) {
      setStatus({ type: "error", message: "Renseignez un email de facturation valide." });
      return;
    }
    run(async () => {
      const res = await subscribePlatformTenant(tenant.id, planCode, billingEmail);
      if (res.authorization_url) {
        window.open(res.authorization_url, "_blank", "noopener,noreferrer");
        setStatus({ type: "success", message: "Lien de paiement ouvert (à transmettre à l'église si besoin)." });
      } else {
        setStatus({ type: "error", message: "Impossible d'ouvrir le paiement." });
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

  return (
    <>
      <Link href="/central/admin/tenants" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-body hover:text-indigo">
        <ArrowLeft className="size-4" /> Toutes les églises
      </Link>

      <StatusBanner status={status} className="mb-6" />

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold text-indigo">{tenant.name}</h1>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>
          <p className="mt-1 font-mono text-sm text-faint">{tenant.slug}.churchapp.io</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={suspended ? <Play className="size-4" /> : <Pause className="size-4" />} loading={isPending} onClick={toggleStatus}>
            {suspended ? "Réactiver" : "Suspendre"}
          </Button>
          <Button icon={<LogIn className="size-4" />} loading={isPending} onClick={impersonate}>
            Se connecter en tant que
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Domains */}
        <Section title="Domaines">
          <ul className="flex flex-col gap-2">
            {(tenant.domains ?? []).map((d) => (
              <li key={d.domain} className="flex items-center gap-2 text-sm">
                <Globe className="size-4 text-faint" />
                <span className="font-mono text-indigo">{d.domain}</span>
                {d.is_primary && <Badge tone="neutral">Principal</Badge>}
                {d.ssl_status && <span className="text-xs text-faint">TLS: {d.ssl_status}</span>}
              </li>
            ))}
            {(tenant.domains ?? []).length === 0 && <li className="text-sm text-faint">Aucun domaine.</li>}
          </ul>
        </Section>

        {/* Subscription */}
        <Section title="Abonnement">
          <p className="mb-3 text-sm text-body">
            Statut : <strong className="text-indigo">{tenant.subscription_status ?? "—"}</strong>
          </p>
          <label className="mb-3 flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-indigo">Email de facturation</span>
            <input type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} className={inputClass} />
          </label>
          <div className="flex flex-wrap gap-2">
            {plans.filter((p) => p.price_month > 0).map((p) => (
              <Button key={p.code} variant="secondary" size="sm" loading={isPending} onClick={() => subscribe(p.code)}>
                {p.name}
              </Button>
            ))}
            {plans.filter((p) => p.price_month > 0).length === 0 && <span className="text-sm text-faint">Aucune offre payante.</span>}
          </div>
        </Section>

        {/* Studio */}
        <Section title="Studio Live" className="lg:col-span-2">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-indigo">
              <input type="checkbox" checked={studioEnabled} onChange={(e) => setStudioEnabled(e.target.checked)} className="size-4 accent-gold-dark" />
              Studio activé
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-indigo">Licences (seats)</span>
              <input type="number" min={0} value={studioSeats} onChange={(e) => setStudioSeats(e.target.value)} className={cn(inputClass, "w-28")} />
            </label>
            <Button icon={<Save className="size-4" />} loading={isPending} onClick={saveStudio}>Enregistrer</Button>
            <span className="text-xs text-faint">{usedSeats} / {tenant.studio_seats} utilisée(s)</span>
          </div>

          {freshKey && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/[0.06] px-3 py-2">
              <code className="flex-1 truncate font-mono text-sm text-indigo">{freshKey}</code>
              <button type="button" onClick={copyFresh} className="cursor-pointer rounded p-1.5 text-faint hover:text-indigo" title="Copier">
                {copied ? <Check className="size-4 text-online" /> : <Copy className="size-4" />}
              </button>
            </div>
          )}

          {studioEnabled && (
            <div className="mt-4 flex flex-wrap items-end gap-2">
              <input type="text" value={keyLabel} onChange={(e) => setKeyLabel(e.target.value)} placeholder="Nom de la licence" maxLength={255} className={cn(inputClass, "max-w-xs")} />
              <Button variant="secondary" icon={<Plus className="size-4" />} loading={isPending} disabled={usedSeats >= tenant.studio_seats} onClick={generateKey}>
                Générer une licence
              </Button>
            </div>
          )}

          <ul className="mt-4 flex flex-col gap-2">
            {keys.map((key) => (
              <li key={key.id} className="flex items-center justify-between gap-3 rounded-lg border border-indigo/8 bg-cream/30 px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <KeyRound className="size-4 text-faint" />
                  <span className="font-semibold text-indigo">{key.label}</span>
                  <span className="font-mono text-xs text-faint">{key.key_prefix}…</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone={key.revoked_at ? "neutral" : key.bound_device ? "success" : "info"}>
                    {key.revoked_at ? "Révoquée" : key.bound_device ? "Activée" : "En attente"}
                  </Badge>
                  {!key.revoked_at && (
                    <button type="button" onClick={() => revokeKey(key.id)} className="cursor-pointer rounded p-1.5 text-faint hover:text-live" title="Révoquer">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </span>
              </li>
            ))}
            {keys.length === 0 && <li className="text-sm text-faint">Aucune licence.</li>}
          </ul>
        </Section>
      </div>
    </>
  );
}

function Section({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[18px] border border-indigo/10 bg-white p-6 shadow-[0_1px_3px_rgba(22,15,51,0.04)]", className)}>
      <h2 className="mb-4 font-display text-lg font-bold text-indigo">{title}</h2>
      {children}
    </div>
  );
}
