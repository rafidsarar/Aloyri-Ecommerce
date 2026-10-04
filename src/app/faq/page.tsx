import type { Metadata } from "next";
import Link from "next/link";
import { safeJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Answers about Aloyri products, stock, delivery, payment, order tracking and returns.",
  alternates: { canonical: "/faq" },
};

const faqs = [
  {
    q: "Are product prices and stock live?",
    a: "Yes. The storefront reads customer-safe product price and available stock from Aloyri's CRM, and the CRM checks them again when an order is submitted.",
  },
  {
    q: "What are the delivery charges?",
    a: "Delivery is ৳80 inside Dhaka and ৳150 outside Dhaka. The selected charge is shown during checkout.",
  },
  {
    q: "Which payment method can I use?",
    a: "Cash on Delivery is currently the live checkout payment method.",
  },
  {
    q: "How do I track an order?",
    a: "Open Track Order and enter the website order number plus the same Bangladesh mobile number used at checkout.",
  },
  {
    q: "Why are full ingredient lists not shown for every product?",
    a: "Aloyri does not guess ingredient lists. Until a list is verified against the exact item supplied, the product packaging is the reference for the current formulation.",
  },
  {
    q: "What if an item is out of stock after I add it to my cart?",
    a: "The cart and checkout recheck live availability. If stock drops below the quantity in your cart, checkout pauses until the quantity is updated.",
  },
  {
    q: "Can I return a skincare product?",
    a: "You can ask Aloyri to review a return. Eligibility depends on the order, product condition, reason for return, hygiene considerations and applicable consumer rights.",
  },
  {
    q: "Do I need an account to order?",
    a: "No customer account is required for the current checkout. Order tracking uses your order number and checkout mobile number.",
  },
];

export default function FAQPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <main className="shell py-12 md:py-18">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
      />
      <div className="max-w-3xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/48">
          Customer care
        </p>
        <h1 className="display mt-3 text-5xl leading-[.94] sm:text-6xl">
          Frequently asked questions.
        </h1>
      </div>

      <div className="mt-10 max-w-4xl divide-y divide-[#713a35]/10 border-y border-[#713a35]/10">
        {faqs.map((faq) => (
          <details key={faq.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-base font-semibold">
              {faq.q}
              <span className="text-2xl font-light text-[#713a35] transition group-open:rotate-45">+</span>
            </summary>
            <p className="max-w-3xl pt-4 text-sm leading-7 text-[#321f1c]/56">{faq.a}</p>
          </details>
        ))}
      </div>

      <p className="mt-8 text-sm text-[#321f1c]/52">
        Still looking for order help?{" "}
        <Link href="/customer-care" className="font-semibold text-[#713a35] underline underline-offset-4">
          Visit customer care
        </Link>
        .
      </p>
    </main>
  );
}
