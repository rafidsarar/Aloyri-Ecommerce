import Link from "next/link";
import { ArrowIcon } from "@/components/icons";

export type InfoSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

const careLinks = [
  ["Track order", "/track-order"],
  ["Shipping & delivery", "/shipping-delivery"],
  ["Returns & refunds", "/returns-refunds"],
  ["Frequently asked questions", "/faq"],
  ["Contact Aloyri", "/contact"],
];

export function CustomerInfoPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: InfoSection[];
}) {
  return (
    <main className="shell py-12 md:py-18">
      <div className="grid gap-10 lg:grid-cols-[1fr_300px] lg:gap-16">
        <div>
          <div className="max-w-3xl border-b border-[#713a35]/10 pb-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/48">
              {eyebrow}
            </p>
            <h1 className="display mt-3 text-5xl leading-[.94] sm:text-6xl">{title}</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#321f1c]/58">
              {intro}
            </p>
          </div>

          {sections.length > 1 ? <nav aria-label="On this page" className="mt-6 rounded-2xl border border-[#713a35]/12 bg-white p-5">
            <p className="text-sm font-semibold">On this page</p>
            <div className="mt-3 flex flex-wrap gap-3">{sections.map((section,index)=><a key={section.title} href={`#care-section-${index}`} className="text-sm text-[#713a35] underline underline-offset-4">{section.title}</a>)}</div>
          </nav> : null}
          <div className="divide-y divide-[#713a35]/10">
            {sections.map((section,index) => (
              <section id={`care-section-${index}`} key={section.title} className="py-8 first:pt-10">
                <h2 className="display text-3xl">{section.title}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-4 max-w-3xl text-sm leading-7 text-[#321f1c]/58"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="mt-5 grid gap-3">
                    {section.bullets.map((item) => (
                      <li
                        key={item}
                        className="flex gap-3 text-sm leading-7 text-[#321f1c]/58"
                      >
                        <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#b9725f]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </div>

        <aside className="h-fit rounded-[1.5rem] border border-[#713a35]/10 bg-[#f5e8e2] p-6 lg:sticky lg:top-28">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
            Customer care
          </p>
          <div className="mt-4 divide-y divide-[#713a35]/10">
            {careLinks.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between gap-4 py-3.5 text-sm font-medium text-[#321f1c]/70 transition hover:text-[#713a35]"
              >
                {label}
                <ArrowIcon className="h-3.5 w-3.5 shrink-0" />
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
