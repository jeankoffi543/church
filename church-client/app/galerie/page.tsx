import type { Metadata } from "next";

import { getAlbums } from "@/lib/api";
import { PageHeader } from "@/components/sections/page-header";
import { GalleryGrid } from "@/components/galerie/gallery-grid";

export const metadata: Metadata = {
  title: "Galerie Photos · MFM Ficgayo",
  description: "Découvrez en images la vie de notre église, les moments de louange et les séminaires de la Maison du Feu.",
};

export default async function GaleriePage() {
  const albums = await getAlbums();

  return (
    <section className="min-h-screen bg-cream px-6 pt-[clamp(96px,11vw,120px)] pb-[90px]">
      <div className="mx-auto max-w-[1200px]">
        <PageHeader
          eyebrow="Galerie"
          title="La vie de l'église en images"
          intro="Parcourez nos albums photos et revivez en images les grands moments de louange, d'adoration, et de fraternité."
        />
        <GalleryGrid albums={albums} />
      </div>
    </section>
  );
}
