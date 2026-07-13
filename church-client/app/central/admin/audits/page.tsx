import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

import { getPlatformAudits } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  created: "Création",
  updated: "Modification",
  deleted: "Suppression",
  suspended: "Suspension",
  restored: "Réactivation",
  impersonated: "Connexion en tant que",
  signup: "Inscription",
};

function formatDateTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

export default async function PlatformAuditsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const current = Math.max(1, Number(page) || 1);
  const { data: audits, meta } = await getPlatformAudits(current);

  return (
    <>
      <Link href="/central/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-body hover:text-indigo">
        <ArrowLeft className="size-4" /> Console
      </Link>

      <h1 className="font-display text-3xl font-bold text-indigo">Journal d&apos;audit</h1>
      <p className="mt-1 text-sm text-body">{meta.total} action{meta.total > 1 ? "s" : ""} du personnel de la plateforme.</p>

      <div className="mt-6 overflow-hidden rounded-[18px] border border-indigo/10 bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-indigo/8 bg-cream text-left text-[11px] font-bold uppercase tracking-wider text-body">
              <th className="px-6 py-3.5">Action</th>
              <th className="px-4 py-3.5">Église</th>
              <th className="px-4 py-3.5">Par</th>
              <th className="px-6 py-3.5">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-indigo/6">
            {audits.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-faint">Aucune action enregistrée.</td>
              </tr>
            )}
            {audits.map((audit) => (
              <tr key={audit.id} className="hover:bg-cream/40">
                <td className="px-6 py-3.5">
                  <span className="font-semibold text-indigo">{ACTION_LABEL[audit.action] ?? audit.action}</span>
                </td>
                <td className="px-4 py-3.5 text-body">
                  {audit.tenant ? (
                    <Link href={`/central/admin/tenants/${audit.tenant.id}`} className="hover:text-gold-dark">
                      {audit.tenant.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3.5 text-body">{audit.actor?.name ?? "Système"}</td>
                <td className="px-6 py-3.5 text-faint">{formatDateTime(audit.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-faint">Page {meta.current_page} / {meta.last_page}</span>
          <div className="flex gap-2">
            {meta.current_page > 1 && (
              <Link href={`/central/admin/audits?page=${meta.current_page - 1}`} className="inline-flex items-center gap-1 rounded-lg border border-indigo/15 bg-white px-3 py-1.5 font-semibold text-indigo transition hover:bg-cream">
                <ChevronLeft className="size-3.5" /> Précédent
              </Link>
            )}
            {meta.current_page < meta.last_page && (
              <Link href={`/central/admin/audits?page=${meta.current_page + 1}`} className="inline-flex items-center gap-1 rounded-lg border border-indigo/15 bg-white px-3 py-1.5 font-semibold text-indigo transition hover:bg-cream">
                Suivant <ChevronRight className="size-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
