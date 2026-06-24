import type { Metadata } from "next";
import { BranchesSplitScreen } from "@/components/branches/branches-split-screen";
import { getBranches } from "@/lib/api";

export const metadata: Metadata = {
  title: "Branches & Campus · MFM Ficgayo",
  description: "Géolocalisation et informations de nos différents campus et églises de quartier.",
};

export default async function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const branches = await getBranches({ search });
  return <BranchesSplitScreen initialBranches={branches} searchParam={search} />;
}
