import Link from "next/link";
import type { StorefrontConfig } from "@/lib/storefront-admin-store";

type Section = StorefrontConfig["homepage"]["editorialSections"][number];

export function HomepageEditorialSections({ sections, position }: {
  sections: Section[];
  position: Section["position"];
}) {
  const visible = sections.filter((section) => section.enabled && section.position === position && section.title);
  if (!visible.length) return null;
  return <div className="shell grid gap-5 py-8 md:py-12" aria-label="Storefront editorial sections">
    {visible.map((section, index) => <section key={index} className={`min-w-0 rounded-[1.75rem] border border-[#713a35]/10 bg-white/65 p-6 sm:p-10 ${section.layout === "centered" ? "text-center" : ""}`}>
      {section.eyebrow ? <p className="text-xs font-semibold uppercase tracking-widest text-[#713a35]/70">{section.eyebrow}</p> : null}
      <h2 className="display mt-3 text-3xl leading-tight sm:text-4xl">{section.title}</h2>
      {section.copy ? <p className={`mt-4 whitespace-pre-line text-sm leading-7 text-[#321f1c]/70 ${section.layout === "centered" ? "mx-auto max-w-2xl" : "max-w-3xl"}`}>{section.copy}</p> : null}
      {section.ctaLabel && section.ctaHref ? <Link href={section.ctaHref} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-[#713a35]/20 px-6 py-3 text-sm font-semibold text-[#713a35]">{section.ctaLabel} <span className="ml-2" aria-hidden="true">→</span></Link> : null}
    </section>)}
  </div>;
}
