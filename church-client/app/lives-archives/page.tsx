import type { Metadata } from "next";

import { getLatestPastLive, getPastLives } from "@/lib/api";
import { LivesArchive } from "@/components/lives/lives-archive";

export const metadata: Metadata = {
  title: "Lives & Archives · MFM Ficgayo",
  description: "Rediffusions cinématographiques et archives vidéo de nos cultes et enseignements passés.",
};

function toArray(val: string | string[] | undefined): string[] | undefined {
  if (!val) return undefined;
  return Array.isArray(val) ? val : [val];
}

export default async function LivesArchivesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    series?: string | string[];
    year?: string | string[];
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const rawParams = await searchParams;
  const search = rawParams.search;
  const series = rawParams.series || rawParams["series[]"];
  const year = rawParams.year || rawParams["year[]"];

  const normalizedSeries = toArray(series);
  const normalizedYear = toArray(year);

  const [latest, initialLivesData] = await Promise.all([
    getLatestPastLive(),
    getPastLives({
      search,
      series: normalizedSeries,
      year: normalizedYear,
      perPage: 9,
      page: 1,
    }),
  ]);

  return (
    <LivesArchive
      latest={latest}
      initialLives={initialLivesData.data}
      meta={initialLivesData.meta}
      searchParam={search}
      seriesParam={normalizedSeries}
      yearsParam={normalizedYear}
    />
  );
}
