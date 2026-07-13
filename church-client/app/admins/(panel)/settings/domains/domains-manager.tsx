"use client";

import { useState, useTransition } from "react";
import { Globe, Plus, RefreshCw, Rocket, Trash2, Check, Copy } from "lucide-react";

import type { AdminDomain, DomainDnsInstructions } from "@/lib/admin-api";
import { addAdminDomain, verifyAdminDomain, activateAdminDomain, deleteAdminDomain } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { PageShell, PageHeader } from "@/components/admin/data/page-shell";
import { Button } from "@/components/admin/ui/button";
import { Badge, type BadgeTone } from "@/components/admin/ui/badge";
import { inputClass } from "@/components/admin/ui/field";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";

const STATUS_LABEL: Record<string, { label: string; tone: BadgeTone }> = {
  pending: { label: "En attente DNS", tone: "warning" },
  verified: { label: "Vérifié", tone: "info" },
  active: { label: "Actif (principal)", tone: "success" },
  failed: { label: "Échec", tone: "live" },
};

export function DomainsManager({ initialDomains }: { initialDomains: AdminDomain[] }) {
  const [domains, setDomains] = useState<AdminDomain[]>(initialDomains);
  const [newDomain, setNewDomain] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [busyId, setBusyId] = useState<number | "add" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminDomain | null>(null);
  const [isPending, startTransition] = useTransition();

  const replace = (updated: AdminDomain) =>
    setDomains((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));

  const handleAdd = () => {
    const host = newDomain.trim().toLowerCase();
    if (!host) return;
    setBusyId("add");
    setStatus(null);
    startTransition(async () => {
      try {
        const { data } = await addAdminDomain(host);
        setDomains((prev) => [...prev, data]);
        setNewDomain("");
        setStatus({ type: "success", message: `${data.domain} ajouté. Publiez les enregistrements DNS ci-dessous.` });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Ajout impossible." });
      } finally {
        setBusyId(null);
      }
    });
  };

  const handleVerify = (domain: AdminDomain) => {
    setBusyId(domain.id);
    setStatus(null);
    startTransition(async () => {
      try {
        const updated = await verifyAdminDomain(domain.id);
        replace(updated);
        setStatus({ type: "success", message: `${updated.domain} est vérifié. Vous pouvez maintenant l'activer.` });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Vérification impossible." });
      } finally {
        setBusyId(null);
      }
    });
  };

  const handleActivate = (domain: AdminDomain) => {
    setBusyId(domain.id);
    setStatus(null);
    startTransition(async () => {
      try {
        const updated = await activateAdminDomain(domain.id);
        // Activating demotes the previous primary — reflect it locally.
        setDomains((prev) =>
          prev.map((d) =>
            d.id === updated.id ? updated : d.is_primary ? { ...d, is_primary: false, status: "verified" } : d,
          ),
        );
        setStatus({ type: "success", message: `${updated.domain} est désormais votre domaine principal.` });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Activation impossible." });
      } finally {
        setBusyId(null);
      }
    });
  };

  const confirmDelete = () => {
    const domain = deleteTarget;
    if (!domain) return;
    setDeleteTarget(null);
    setBusyId(domain.id);
    startTransition(async () => {
      try {
        await deleteAdminDomain(domain.id);
        setDomains((prev) => prev.filter((d) => d.id !== domain.id));
        setStatus({ type: "success", message: `${domain.domain} retiré.` });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Suppression impossible." });
      } finally {
        setBusyId(null);
      }
    });
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Église & Présentation"
        title="Nom de domaine"
        subtitle="Connectez votre propre nom de domaine (ex. www.mon-eglise.org). Publiez les enregistrements DNS, vérifiez la propriété, puis activez-le comme adresse principale de votre site."
      />

      <StatusBanner status={status} className="mb-6" />

      {/* Add a custom domain */}
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white p-5 shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
        <label className="flex flex-1 flex-col gap-1.5 text-sm">
          <span className="font-semibold text-indigo">Ajouter un domaine</span>
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="www.mon-eglise.org"
            spellCheck={false}
            className={cn(inputClass, "min-w-[220px]")}
          />
        </label>
        <Button icon={<Plus className="size-4" />} loading={busyId === "add" && isPending} onClick={handleAdd}>
          Ajouter
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {domains.map((domain) => {
          const meta = STATUS_LABEL[domain.status ?? "pending"] ?? STATUS_LABEL.pending;
          const busy = busyId === domain.id && isPending;
          const isCustom = domain.type === "custom";
          return (
            <div
              key={domain.id}
              className="rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white p-5 shadow-[0_1px_3px_rgba(22,15,51,0.04)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Globe className="size-5 text-indigo" />
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-indigo">
                      {domain.domain}
                      {domain.is_primary && <Badge tone="success">Principal</Badge>}
                    </div>
                    <span className="text-[11px] text-faint">
                      {domain.type === "subdomain" ? "Sous-domaine plateforme" : "Domaine personnalisé"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  {isCustom && (domain.status === "pending" || domain.status === "failed") && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<RefreshCw className="size-3.5" />}
                      loading={busy}
                      onClick={() => handleVerify(domain)}
                    >
                      Vérifier
                    </Button>
                  )}
                  {isCustom && domain.status === "verified" && (
                    <Button
                      size="sm"
                      icon={<Rocket className="size-3.5" />}
                      loading={busy}
                      onClick={() => handleActivate(domain)}
                    >
                      Activer
                    </Button>
                  )}
                  {isCustom && !domain.is_primary && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setDeleteTarget(domain)}
                      className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-cream hover:text-live disabled:cursor-not-allowed disabled:opacity-50"
                      title="Retirer"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              {domain.dns && domain.status !== "active" && <DnsInstructions dns={domain.dns} />}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Retirer ce domaine ?"
        message={`« ${deleteTarget?.domain ?? ""} » ne pointera plus vers votre site. Vous pourrez le rajouter plus tard.`}
        confirmLabel="Retirer"
        loading={isPending}
        onConfirm={confirmDelete}
      />
    </PageShell>
  );
}

function DnsInstructions({ dns }: { dns: DomainDnsInstructions }) {
  return (
    <div className="mt-4 rounded-[14px] border border-dashed border-indigo/20 bg-cream/40 p-4">
      <p className="mb-3 text-[13px] font-semibold text-indigo">
        Publiez ces enregistrements chez votre hébergeur DNS, puis cliquez sur « Vérifier ».
      </p>
      <div className="flex flex-col gap-2">
        <DnsRow type={dns.cname.type} host={dns.cname.host} value={dns.cname.target ?? ""} />
        <DnsRow type={dns.txt.type} host={dns.txt.host} value={dns.txt.value ?? ""} />
      </div>
    </div>
  );
}

function DnsRow({ type, host, value }: { type: string; host: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-indigo/10 bg-white px-3 py-2 text-xs">
      <span className="w-14 shrink-0 font-mono font-bold text-gold-dark">{type}</span>
      <span className="min-w-[160px] flex-1 truncate font-mono text-body" title={host}>
        {host}
      </span>
      <span className="min-w-[160px] flex-1 truncate font-mono text-indigo" title={value}>
        {value}
      </span>
      <button
        type="button"
        onClick={copy}
        className="cursor-pointer rounded p-1.5 text-faint transition hover:bg-cream hover:text-indigo"
        title="Copier la valeur"
      >
        {copied ? <Check className="size-3.5 text-online" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}
