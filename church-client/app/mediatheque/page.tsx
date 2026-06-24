import type { Metadata } from "next";

import { getSermons } from "@/lib/api";
import { PageHeader } from "@/components/sections/page-header";
import { SermonLibrary } from "@/components/mediatheque/sermon-library";

export const metadata: Metadata = {
  title: "Médiathèque · MFM Ficgayo",
  description: "Enseignements et rediffusions de l'Église MFM Ficgayo.",
};

function toArray(val: string | string[] | undefined): string[] | undefined {
  if (!val) return undefined;
  return Array.isArray(val) ? val : [val];
}

export default async function MediathequePage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    speaker?: string | string[];
    series?: string | string[];
    year?: string | string[];
    date?: string | string[];
    book?: string | string[];
    page?: string;
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const rawParams = await searchParams;
  const search = rawParams.search;
  const speaker = rawParams.speaker || rawParams["speaker[]"];
  const series = rawParams.series || rawParams["series[]"];
  const year = rawParams.year || rawParams["year[]"];
  const date = rawParams.date || rawParams["date[]"];
  const book = rawParams.book || rawParams["book[]"];
  const page = rawParams.page;

  const normalizedSpeakers = toArray(speaker);
  const normalizedSeries = toArray(series);
  const normalizedYears = toArray(year);
  const normalizedDates = toArray(date);
  const normalizedBooks = toArray(book);
  const currentPage = page ? Number(page) : 1;

  const sermonsData = await getSermons({
    search,
    speaker: normalizedSpeakers,
    series: normalizedSeries,
    year: normalizedYears,
    date: normalizedDates,
    book: normalizedBooks,
    page: currentPage,
    perPage: 8,
  });

  return (
    <section className="min-h-screen bg-cream px-6 pt-[clamp(96px,11vw,120px)] pb-[90px]">
      <div className="mx-auto max-w-[1200px]">
        <PageHeader
          eyebrow="Médiathèque"
          title="Enseignements & rediffusions"
          intro="Réécoute chaque message, filtre par série, par orateur ou par livre de la Bible."
        />
        <SermonLibrary
          initialSermons={sermonsData.data}
          meta={sermonsData.meta}
          searchParam={search}
          speakersParam={normalizedSpeakers}
          seriesParam={normalizedSeries}
          yearsParam={normalizedYears}
          datesParam={normalizedDates}
          booksParam={normalizedBooks}
          pageParam={currentPage}
        />
      </div>
    </section>
  );
}
