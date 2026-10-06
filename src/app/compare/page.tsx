import type { Metadata } from "next";
import { CompareProductsClient } from "@/components/compare-products-client";

export const metadata: Metadata = {
  title: "Compare products | Aloyri",
  description: "Compare Aloyri skincare products side by side.",
  robots: { index: false, follow: true },
};

export default function CompareProductsPage() {
  return <CompareProductsClient />;
}
