import type { Metadata } from "next";
import { CustomerInfoPage } from "@/components/customer-info-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Aloyri handles information used for shopping, orders and customer support.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
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
  );
}
