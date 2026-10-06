import type { Metadata } from "next";
import { CustomerAccountHub } from "@/components/customer-account-hub";

export const metadata: Metadata = {
  title: "Customer account",
  description: "Your Aloyri customer hub for wishlist, cart and order tools.",
  robots: { index: false, follow: true },
};

export default function CustomerAccountPage() {
  return <CustomerAccountHub />;
}
