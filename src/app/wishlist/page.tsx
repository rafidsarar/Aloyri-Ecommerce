import type { Metadata } from "next";
import { SavedProductsClient } from "@/components/saved-products-client";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Your Aloyri skincare wishlist with live price and availability.",
  robots: { index: false, follow: true },
};

export default function WishlistPage() {
  return <SavedProductsClient />;
}
