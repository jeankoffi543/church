import Link from "next/link";
import { ArrowLeft, Server, Database } from "lucide-react";

import { getPlatformShards } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

export default async function PlatformInfrastructurePage() {
  const { servers, unassigned } = await getPlatformShards();

  return (
    <>
      <Link href="/central/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-body hover:text-indigo">
        <ArrowLeft className="size-4" /> Console
      </Link>

      <h1 className="font-display text-3xl font-bold text-indigo">Infrastructure</h1>
      <p className="mt-1 text-sm text-body">
        Serveurs de bases de données (shards) et leur capacité. {unassigned} église{unassigned > 1 ? "s" : ""} sur la connexion par défaut.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {servers.length === 0 && (
          <div className="rounded-2xl border border-dashed border-indigo/15 bg-white p-8 text-center text-sm text-faint sm:col-span-2">
            Aucun shard enregistré — les églises vivent sur la connexion par défaut. Ajoutez-en avec <code className="font-mono text-indigo">shards:register</code>.
          </div>
        )}
        {servers.map((server) => {
          const capped = server.max_tenants != null;
          const pct = capped && server.max_tenants! > 0 ? Math.min(100, Math.round((server.tenants_count / server.max_tenants!) * 100)) : 0;
          return (
            <div key={server.id} className="rounded-[18px] border border-indigo/10 bg-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-10 place-items-center rounded-xl bg-indigo/5">
                    <Server className="size-5 text-indigo" />
                  </div>
                  <div>
                    <p className="font-semibold text-indigo">{server.name}</p>
                    <p className="font-mono text-xs text-faint">{server.host ?? "—"}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${server.is_active ? "bg-online/10 text-online" : "bg-indigo/5 text-faint"}`}>
                  {server.is_active ? "Actif" : "Inactif"}
                </span>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-body">
                    {server.tenants_count} église{server.tenants_count > 1 ? "s" : ""}
                    {capped && <span className="text-faint"> / {server.max_tenants}</span>}
                  </span>
                  {capped && <span className="font-mono text-xs text-faint">{pct}%</span>}
                </div>
                {capped && (
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-indigo/10">
                    <div className={`h-full rounded-full ${pct >= 90 ? "bg-live" : pct >= 70 ? "bg-gold" : "bg-online"}`} style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-4 text-xs text-faint">
                <span>Poids : {server.weight}</span>
                {server.has_read_replica && (
                  <span className="inline-flex items-center gap-1 text-indigo">
                    <Database className="size-3.5" /> Réplica lecture
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
