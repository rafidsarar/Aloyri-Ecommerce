import type { Metadata } from "next";
import { SavedProductsClient } from "@/components/saved-products-client";

export const metadata: Metadata = {
  title: "Saved products | Aloyri",
  description: "Your device-local Aloyri skincare shortlist.",
  robots: { index: false, follow: true },
};

export default function SavedProductsPage() {
  return <SavedProductsClient />;
}
