import type { Metadata } from "next";
import { CustomerInfoPage } from "@/components/customer-info-page";
import { readStorefrontConfig } from "@/lib/storefront-admin-store";

export const metadata: Metadata = {
  title: "About Aloyri",
  description:
    "Learn about Aloyri's approach to clear, considered skincare shopping in Bangladesh.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const config = await readStorefrontConfig();
  return <CustomerInfoPage {...config.pages.about} />;
}
