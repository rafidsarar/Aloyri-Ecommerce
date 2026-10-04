import type { Metadata } from "next";
import Link from "next/link";
import { CustomerInfoPage } from "@/components/customer-info-page";

export const metadata: Metadata = {
  title: "Contact Aloyri",
  description:
    "Prepare the information Aloyri needs to help with a website order, delivery or return.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <CustomerInfoPage
        eyebrow="Customer care"
        title="Contact Aloyri."
        intro="For order support, having the right information ready helps Aloyri verify the order without exposing private CRM data."
        sections={[
          {
            title: "For an order question",
            bullets: [
              "Keep your website order number ready.",
              "Use the same mobile number that was entered at checkout.",
              "For a product or delivery issue, note which item is affected and what happened.",
              "For damaged or incorrect products, keep clear photos of the item and packaging where useful.",
            ],
          },
          {
            title: "Check the live order first",
            paragraphs: [
              "The Track Order page reads the latest customer-safe status directly from Aloyri's CRM. It is usually the quickest way to check whether an order is confirmed, packed, shipped, out for delivery or delivered.",
            ],
          },
          {
            title: "Direct support channel",
            paragraphs: [
              "Aloyri's permanent branded support email will be published here after the final business domain is connected and verified. Until then, the site does not display an invented or temporary branded email address.",
            ],
          },
        ]}
      />
      <div className="shell -mt-8 pb-16">
        <Link
          href="/track-order"
          className="inline-flex rounded-full bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white"
        >
          Track an order
        </Link>
      </div>
    </>
  );
}
