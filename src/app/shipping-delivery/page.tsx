import type { Metadata } from "next";
import { VisualPageSections } from "@/components/visual-page-sections";
import { staticPageSeoMetadata } from "@/lib/seo-manager";
import { CustomerInfoPage } from "@/components/customer-info-page";
import { readStorefrontConfig } from "@/lib/storefront-admin-store";

export async function generateMetadata(): Promise<Metadata> {
  const config = await readStorefrontConfig();
  return staticPageSeoMetadata(config, "shipping");
}

export default async function ShippingDeliveryPage() {
  const config = await readStorefrontConfig();
  return <><CustomerInfoPage {...config.pages.shipping} /><VisualPageSections layout={config.visualPages.shipping} /></>;
}
