import type { Metadata } from "next";
import { BranchesSplitScreen } from "@/components/branches/branches-split-screen";
import { getBranches } from "@/lib/api";

export const metadata: Metadata = {
  title: "Branches & Campus · MFM Ficgayo",
  description: "Géolocalisation et informations de nos différents campus et églises de quartier.",
};

export default async function BranchesPage() {
  const branches = await getBranches();
  return <BranchesSplitScreen initialBranches={branches} />;
}
