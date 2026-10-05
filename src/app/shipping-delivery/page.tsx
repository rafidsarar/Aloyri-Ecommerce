import type { Metadata } from "next";
import { CustomerInfoPage } from "@/components/customer-info-page";
import { readStorefrontConfig } from "@/lib/storefront-admin-store";

export const metadata: Metadata = {
  title: "Shipping & delivery",
  description:
    "Aloyri delivery charges, order handling and tracking information for Bangladesh.",
  alternates: { canonical: "/shipping-delivery" },
};

export default async function ShippingDeliveryPage() {
  const config = await readStorefrontConfig();
  return <CustomerInfoPage {...config.pages.shipping} />;
}
