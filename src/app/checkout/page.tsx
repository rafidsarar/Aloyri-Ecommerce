import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout-client";
import { currentCustomerSession } from "@/lib/customer-auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Checkout",
  description:
    "Review your Aloyri skincare cart and prepare delivery and payment details.",
  alternates: { canonical: "/checkout" },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CheckoutPage() {
  const session = await currentCustomerSession();
  if (!session || session.session.method !== "google" ||
      session.account.displayName.trim().length < 2 || !session.account.phone) {
    redirect("/account/setup?next=/checkout");
  }
  return <CheckoutClient />;
}
