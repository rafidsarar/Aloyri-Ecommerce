import type { Metadata } from "next";
import { staticPageSeoMetadata } from "@/lib/seo-manager";
import { AnalyticsPreference } from "@/components/analytics-preference";
import { readStorefrontConfig } from "@/lib/storefront-admin-store";
import { VisualPageSections } from "@/components/visual-page-sections";
import { CustomerInfoPage } from "@/components/customer-info-page";

export async function generateMetadata(): Promise<Metadata> {
  const config = await readStorefrontConfig();
  return staticPageSeoMetadata(config, "privacy");
}

export default async function PrivacyPage() {
  const config = await readStorefrontConfig();
  return (
    <>
    <CustomerInfoPage {...config.pages.privacy} />
    <div className="shell -mt-8 pb-16">
      <AnalyticsPreference />
    </div>
    <VisualPageSections layout={config.visualPages.privacy} />
    </>
  );
}
