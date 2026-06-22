import type { Metadata } from "next";
import { getHomeGroups } from "@/lib/api";
import { PageHeader } from "@/components/sections/page-header";
import { HomeGroups } from "@/components/eglise/home-groups";

export const metadata: Metadata = {
  title: "Groupes de Maison · MFM Ficgayo",
  description: "Découvrez et rejoignez l'une de nos cellules de quartier ou groupes de maison à Abidjan.",
};

export default async function GroupesDeMaisonPage() {
  const homeGroups = await getHomeGroups();

  return (
    <section className="min-h-screen bg-cream px-6 pt-[clamp(96px,11vw,120px)] pb-[90px]">
      <div className="mx-auto max-w-[1200px]">
        <PageHeader
          eyebrow="Cellules de Prière"
          title="Groupes de maison"
          intro="Les cellules de prière sont le cœur battant de la Maison. On y grandit ensemble, en semaine, près de chez soi. Trouvez un groupe et engagez-vous."
        />
        <HomeGroups groups={homeGroups} />
      </div>
    </section>
  );
}
