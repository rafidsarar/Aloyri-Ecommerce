import type { Metadata } from "next";
import { staticPageSeoMetadata } from "@/lib/seo-manager";
import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { readStorefrontConfig } from "@/lib/storefront-admin-store";

export async function generateMetadata(): Promise<Metadata> {
  const config = await readStorefrontConfig();
  return staticPageSeoMetadata(config, "customerCare");
}

const cards = [
  {
    title: "Track an order",
    copy: "Use your website order number and checkout mobile number to see the latest CRM status.",
    href: "/track-order",
  },
  {
    title: "Shipping & delivery",
    copy: "Review delivery charges, order handling and how courier tracking works.",
    href: "/shipping-delivery",
  },
  {
    title: "Returns & refunds",
    copy: "Understand how Aloyri reviews wrong, damaged, returned or cancelled products.",
    href: "/returns-refunds",
  },
  {
    title: "Frequently asked questions",
    copy: "Quick answers about products, stock, COD, delivery, tracking and returns.",
    href: "/faq",
  },
  {
    title: "Contact Aloyri",
    copy: "See what information to prepare when you need help with a website order.",
    href: "/contact",
  },
];

export default function CustomerCarePage() {
  return (
    <main className="shell py-12 md:py-18">
      <div className="max-w-3xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/48">
          Customer care
        </p>
        <h1 className="display mt-3 text-5xl leading-[.94] sm:text-6xl">
          Help without the guesswork.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-[#321f1c]/58">
          Find order, delivery and return information in one place. Aloyri keeps
          customer-facing support separate from internal CRM data.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-[1.5rem] border border-[#713a35]/10 bg-white/65 p-6 transition hover:-translate-y-0.5 hover:bg-white"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <h2 className="display text-3xl">{card.title}</h2>
                <p className="mt-3 text-sm leading-7 text-[#321f1c]/52">{card.copy}</p>
              </div>
              <ArrowIcon className="mt-2 h-4 w-4 shrink-0 text-[#713a35] transition group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
