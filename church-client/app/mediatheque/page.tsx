import type { Metadata } from "next";

import { getSermons } from "@/lib/api";
import { PageHeader } from "@/components/sections/page-header";
import { SermonLibrary } from "@/components/mediatheque/sermon-library";

export const metadata: Metadata = {
  title: "Médiathèque · MFM Ficgayo",
  description: "Enseignements et rediffusions de l'Église MFM Ficgayo.",
};

export default async function MediathequePage() {
  const sermons = await getSermons();

  return (
    <section className="min-h-screen bg-cream px-6 pt-[clamp(96px,11vw,120px)] pb-[90px]">
      <div className="mx-auto max-w-[1200px]">
        <PageHeader
          eyebrow="Médiathèque"
          title="Enseignements & rediffusions"
          intro="Réécoute chaque message, filtre par série, par orateur ou par livre de la Bible."
        />
        <SermonLibrary sermons={sermons} />
      </div>
    </section>
  );
}
