import type { Metadata } from "next";
import { BranchesSplitScreen } from "@/components/branches/branches-split-screen";

export const metadata: Metadata = {
  title: "Branches & Campus · MFM Ficgayo",
  description: "Géolocalisation et informations de nos différents campus et églises de quartier.",
};

export default function BranchesPage() {
  return <BranchesSplitScreen />;
}
