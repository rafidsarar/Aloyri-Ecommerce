import type { Metadata } from "next";
import { staticPageSeoMetadata } from "@/lib/seo-manager";
import { AnalyticsPreference } from "@/components/analytics-preference";
import { readStorefrontConfig } from "@/lib/storefront-admin-store";
import { CustomerInfoPage } from "@/components/customer-info-page";

export async function generateMetadata(): Promise<Metadata> {
  const config = await readStorefrontConfig();
  return staticPageSeoMetadata(config, "privacy");
}

export default function PrivacyPage() {
  return (
    <>
    <CustomerInfoPage
      eyebrow="Legal"
      title="Privacy policy."
      intro="This policy explains the customer information Aloyri uses to operate the storefront, fulfil orders, protect the service and provide order support."
      sections={[
        {
          title: "Information collected",
          bullets: [
            "Name, Bangladesh mobile number and delivery address details provided at checkout.",
            "Optional email address when provided for transactional order updates.",
            "Products, quantities, delivery zone and payment method associated with an order.",
            "Order-status, return and support information created while servicing an order.",
            "Limited technical and security information needed to operate and protect the website.",
          ],
        },
        {
          title: "How information is used",
          bullets: [
            "Create, confirm, fulfil and track customer orders.",
            "Provide transactional order and delivery-status updates.",
            "Handle returns, refunds, support and order corrections.",
            "Protect the website and integration endpoints against abuse, duplication and unauthorised access.",
            "Maintain business records where reasonably necessary for operations or legal obligations.",
          ],
        },
        {
          title: "Sharing with service providers",
          paragraphs: [
            "Aloyri may use service providers for website hosting, delivery/courier operations, transactional communications and other infrastructure needed to fulfil an order. Information should be limited to what the relevant provider needs for that service.",
          ],
        },
        {
          title: "Storefront analytics & performance",
          paragraphs: [
            "Aloyri records a limited set of first-party storefront events to understand product views, cart activity, checkout progress, successful order creation, order tracking, return requests and Core Web Vitals. The application analytics payload does not include customer names, phone numbers, email addresses, delivery addresses, order numbers, free-text notes or search text.",
            "These analytics events use strict allowlists rather than arbitrary customer data. The storefront respects browser Do Not Track and also supports a local analytics opt-out. Hosting and security providers may separately process limited technical request information needed to operate and protect the service.",
          ],
        },
        {
          title: "Marketing",
          paragraphs: [
            "Providing an email address at checkout is not treated as marketing consent. The current checkout email field is for transactional order confirmation and delivery-status updates.",
          ],
        },
        {
          title: "Retention and requests",
          paragraphs: [
            "Aloyri keeps customer and order information for as long as reasonably needed for fulfilment, support, returns, accounting, security and applicable legal obligations. The permanent privacy-contact address will be published after Aloyri's business domain is connected.",
          ],
        },
      ]}
    />
    <div className="shell -mt-8 pb-16">
      <AnalyticsPreference />
    </div>
    </>
  );
}
