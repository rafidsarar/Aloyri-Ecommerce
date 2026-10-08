import type { Metadata } from "next";
import { VisualPageSections } from "@/components/visual-page-sections";
import { staticPageSeoMetadata } from "@/lib/seo-manager";
import Link from "next/link";
import { CustomerInfoPage } from "@/components/customer-info-page";
import { readStorefrontConfig } from "@/lib/storefront-admin-store";

export async function generateMetadata(): Promise<Metadata> {
  const config = await readStorefrontConfig();
  return staticPageSeoMetadata(config, "returns");
}

export default async function ReturnsRefundsPage() {
  const config = await readStorefrontConfig();

  return (
    <>
      <CustomerInfoPage {...config.pages.returns} />
      <div className="shell -mt-8 pb-16">
        <Link
          href="/return-request"
          className="inline-flex rounded-full bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white"
        >
          Request a return / refund review
        </Link>
        <p className="mt-3 max-w-xl text-xs leading-6 text-[#321f1c]/45">
          You will verify the website order with the same mobile number used at checkout before selecting products for review.
        </p>
      </div>
      <VisualPageSections layout={config.visualPages.returns} />
    </>
  );
}
