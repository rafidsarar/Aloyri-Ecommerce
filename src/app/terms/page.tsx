import type { Metadata } from "next";
import { staticPageSeoMetadata } from "@/lib/seo-manager";
import { CustomerInfoPage } from "@/components/customer-info-page";
import { readStorefrontConfig } from "@/lib/storefront-admin-store";

export async function generateMetadata(): Promise<Metadata> {
  const config = await readStorefrontConfig();
  return staticPageSeoMetadata(config, "terms");
}

export default function TermsPage() {
  return (
    <CustomerInfoPage
      eyebrow="Legal"
      title="Terms & conditions."
      intro="These terms set out the basic conditions for using the Aloyri storefront and placing a website order in Bangladesh."
      sections={[
        {
          title: "Product information",
          paragraphs: [
            "Aloyri aims to present products clearly, but packaging, formulation details and manufacturer information can change. The physical product packaging remains the reference for current ingredient lists, warnings and directions where the website has not published verified source information.",
          ],
        },
        {
          title: "Price and availability",
          paragraphs: [
            "Displayed selling price and available stock are synchronised from Aloyri's operational system. Before an order is created, Aloyri rechecks product status, current selling price and available inventory.",
          ],
        },
        {
          title: "Orders",
          paragraphs: [
            "Submitting checkout details requests an order. Aloyri may cancel or correct an order where a product is unavailable, information is materially incorrect, fraud or abuse is suspected, or fulfilment cannot reasonably proceed.",
          ],
        },
        {
          title: "Payment and delivery",
          paragraphs: [
            "Cash on Delivery is currently the live payment method. Delivery charges are shown before the final order is placed. Courier timing can vary by destination and operating conditions.",
          ],
        },
        {
          title: "Returns",
          paragraphs: [
            "Returns and refunds are reviewed under Aloyri's Returns & Refunds process. Hygiene, product condition, delivery circumstances and applicable consumer rights may affect the outcome.",
          ],
        },
        {
          title: "Use of the website",
          paragraphs: [
            "Do not misuse the website, attempt unauthorised access, interfere with service operation, submit fraudulent orders or use automated methods to abuse customer-facing endpoints.",
          ],
        },
        {
          title: "Applicable rights",
          paragraphs: [
            "These terms are intended for a Bangladesh-facing storefront. Mandatory rights or protections that apply under relevant law are not excluded by these terms.",
          ],
        },
      ]}
    />
  );
}
