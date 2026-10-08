import type { Metadata } from "next";
import { RoutineFinder } from "@/components/routine-finder";

export const metadata: Metadata = {
  title: "Find your skincare routine",
  description: "Explore a simple Aloyri skincare routine by choosing your preferred skincare step and texture. Browse current products with live availability.",
  alternates: { canonical: "/routine-finder" },
};

export default function RoutineFinderPage() {
  return <RoutineFinder />;
}
