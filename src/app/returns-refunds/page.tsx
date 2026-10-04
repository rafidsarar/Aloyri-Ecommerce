import type { Metadata } from "next";
import { CustomerInfoPage } from "@/components/customer-info-page";

export const metadata: Metadata = {
  title: "Returns & refunds",
  description:
    "How Aloyri reviews product returns, wrong or damaged items and eligible refunds.",
  alternates: { canonical: "/returns-refunds" },
};

export default function ReturnsRefundsPage() {
  return (
    <CustomerInfoPage
      eyebrow="Customer care"
      title="Returns & refunds."
      intro="A return is reviewed before any refund or stock movement is completed. This helps Aloyri handle hygiene-sensitive skincare products, damaged items and order corrections responsibly."
      sections={[
        {
          title: "When to contact Aloyri",
          bullets: [
            "The wrong product was delivered.",
            "An item arrived visibly damaged or unusable.",
            "A product is missing from the delivered order.",
            "You need to request a return for another reason and want Aloyri to review eligibility.",
          ],
        },
        {
          title: "How a return is reviewed",
          paragraphs: [
            "Keep the order number, product packaging and any useful photos available. Aloyri reviews the order, product condition, reason for return and any relevant delivery information before confirming the next step.",
            "Do not send a product back without return instructions. Skincare products can have hygiene and safety considerations that affect whether an item can be accepted back into inventory.",
          ],
        },
        {
          title: "Refunds",
          paragraphs: [
            "If a refund is approved, Aloyri will confirm the amount and refund method after the return review. A returned product does not automatically mean a refund is due, and a refund does not automatically mean the product can be restocked.",
          ],
        },
        {
          title: "Your legal rights",
          paragraphs: [
            "Nothing on this page is intended to remove rights that apply under mandatory consumer law in Bangladesh.",
          ],
        },
      ]}
    />
  );
}
