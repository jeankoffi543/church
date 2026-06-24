import type { Metadata } from "next";
import { getHomeGroups } from "@/lib/api";
import { PageHeader } from "@/components/sections/page-header";
import { HomeGroups } from "@/components/eglise/home-groups";

export const metadata: Metadata = {
  title: "Groupes de Maison · MFM Ficgayo",
  description: "Découvrez et rejoignez l'une de nos cellules de quartier ou groupes de maison à Abidjan.",
};

export default async function GroupesDeMaisonPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; zone_name?: string; day?: string }>;
}) {
  const { search, zone_name, day } = await searchParams;
  const { data: homeGroups, meta } = await getHomeGroups({ search, zone_name, day });

  return (
    <section className="min-h-screen bg-cream px-6 pt-[clamp(96px,11vw,120px)] pb-[90px]">
      <div className="mx-auto max-w-[1200px]">
        <PageHeader
          eyebrow="Cellules de Prière"
          title="Groupes de maison"
          intro="Les cellules de prière sont le cœur battant de la Maison. On y grandit ensemble, en semaine, près de chez soi. Trouvez un groupe et engagez-vous."
        />
        <HomeGroups groups={homeGroups} allZones={meta?.zones} allDays={meta?.days} />
      </div>
    </section>
  );
}
