import type { Metadata } from "next";
import { VisualPageSections } from "@/components/visual-page-sections";
import { staticPageSeoMetadata } from "@/lib/seo-manager";
import { FaqPageContent } from "@/components/faq-page-content";
import { safeJsonLd } from "@/lib/seo";
import { readStorefrontConfig } from "@/lib/storefront-admin-store";

export async function generateMetadata(): Promise<Metadata> {
  const config = await readStorefrontConfig();
  return staticPageSeoMetadata(config, "faq");
}

export default async function FAQPage() {
  const config = await readStorefrontConfig();
  const faq = config.faq;
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(schema)}} />
    <FaqPageContent initial={faq} />
    <VisualPageSections layout={config.visualPages.faq} />
    </>
  );
}
