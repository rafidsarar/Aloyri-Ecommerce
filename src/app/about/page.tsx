import type { Metadata } from "next";
import { CustomerInfoPage } from "@/components/customer-info-page";

export const metadata: Metadata = {
  title: "About Aloyri",
  description:
    "Learn about Aloyri's approach to clear, considered skincare shopping in Bangladesh.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <CustomerInfoPage
      eyebrow="About Aloyri"
      title="A calmer way to shop skincare."
      intro="Aloyri is built around a simple idea: make everyday skincare easier to understand, easier to compare and easier to buy without burying the customer in unnecessary noise."
      sections={[
        {
          title: "What we focus on",
          paragraphs: [
            "The storefront is organised around practical routine steps—cleanse, moisturise and protect—while live price and availability come directly from Aloyri's operational system.",
          ],
          bullets: [
            "Clear product identity, size and BDT pricing.",
            "Live stock visibility before checkout.",
            "Straightforward routine guidance without medical claims.",
            "Secure order creation and customer order tracking.",
          ],
        },
        {
          title: "How product information is handled",
          paragraphs: [
            "Aloyri separates verified operational facts from editorial guidance. Product identity, selling price and availability are synchronised from the CRM. Descriptions and routine guidance are written for the storefront.",
            "Ingredient lists are not guessed. Until an ingredient list has been verified against the exact product supplied, customers are directed to the product packaging for the current formulation.",
          ],
        },
        {
          title: "Built for Bangladesh",
          paragraphs: [
            "Aloyri uses BDT pricing, Bangladesh mobile validation, local delivery zones and Cash on Delivery as the first live payment method. The website is designed to remain useful across mobile, tablet and desktop.",
          ],
        },
      ]}
    />
  );
}
