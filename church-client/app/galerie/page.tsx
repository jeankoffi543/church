import type { Metadata } from "next";

import { getAlbums } from "@/lib/api";
import { PageHeader } from "@/components/sections/page-header";
import { GalleryGrid } from "@/components/galerie/gallery-grid";

export const metadata: Metadata = {
  title: "Galerie Photos · MFM Ficgayo",
  description: "Découvrez en images la vie de notre église, les moments de louange et les séminaires de la Maison du Feu.",
};

export default async function GaleriePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; year?: string }>;
}) {
  const { page, category, year } = await searchParams;
  const pageNum = page ? Number(page) : 1;
  const yearNum = year ? Number(year) : undefined;

  const { data: albums, meta } = await getAlbums({
    page: pageNum,
    perPage: 9,
    category,
    year: yearNum,
  });

  return (
    <section className="min-h-screen bg-cream px-6 pt-[clamp(96px,11vw,120px)] pb-[90px]">
      <div className="mx-auto max-w-[1200px]">
        <PageHeader
          eyebrow="Galerie"
          title="La vie de l'église en images"
          intro="Parcourez nos albums photos et revivez en images les grands moments de louange, d'adoration, et de fraternité."
        />
        <GalleryGrid albums={albums} initialMeta={meta} />
      </div>
    </section>
  );
}
