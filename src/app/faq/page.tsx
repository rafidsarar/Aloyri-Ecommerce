import type { Metadata } from "next";
import { staticPageSeoMetadata } from "@/lib/seo-manager";
import Link from "next/link";
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
    <main className="shell py-12 md:py-18">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
      />
      <div className="max-w-3xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/48">
          {faq.eyebrow}
        </p>
        <h1 className="display mt-3 text-5xl leading-[.94] sm:text-6xl">
          {faq.title}
        </h1>
        {faq.intro ? (
          <p className="mt-5 max-w-2xl text-base leading-8 text-[#321f1c]/58">
            {faq.intro}
          </p>
        ) : null}
      </div>

      <div className="mt-10 max-w-4xl divide-y divide-[#713a35]/10 border-y border-[#713a35]/10">
        {faq.items.map((item) => (
          <details key={item.question} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-base font-semibold">
              {item.question}
              <span className="text-2xl font-light text-[#713a35] transition group-open:rotate-45">+</span>
            </summary>
            <p className="max-w-3xl pt-4 text-sm leading-7 text-[#321f1c]/56">
              {item.answer}
            </p>
          </details>
        ))}
      </div>

      <p className="mt-8 text-sm text-[#321f1c]/52">
        Still looking for order help?{" "}
        <Link
          href="/customer-care"
          className="font-semibold text-[#713a35] underline underline-offset-4"
        >
          Visit customer care
        </Link>
        .
      </p>
    </main>
  );
}
