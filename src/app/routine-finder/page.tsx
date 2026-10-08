import type { Metadata } from "next";
import { RoutineFinder } from "@/components/routine-finder";

export const metadata: Metadata = {
  title: "Find your skincare routine | Aloyri",
  description: "Choose how you want your skincare routine to feel and explore relevant cleansers, moisturizers and sunscreen from Aloyri's current catalog.",
  alternates: { canonical: "/routine-finder" },
};

export default function RoutineFinderPage() {
  return <RoutineFinder />;
}
