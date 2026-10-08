import Image from "next/image";
import Link from "next/link";
import type { VisualBlock } from "@/lib/visual-builder";

const tones: Record<VisualBlock["tone"], string> = {
  light: "bg-white text-[#33211f] border-[#713a35]/10",
  rose: "bg-[#f4e3df] text-[#4f2725] border-[#713a35]/10",
  sage: "bg-[#e7ece5] text-[#284333] border-[#284333]/15",
  dark: "bg-[#392923] text-[#fff8f3] border-[#fff8f3]/20",
};
const spacing: Record<VisualBlock["spacing"], string> = {
  compact: "py-5 sm:py-8",
  regular: "py-10 sm:py-14",
  spacious: "py-16 sm:py-24",
};

export function VisualBuilderBlock({ block }: { block: VisualBlock }) {
  if (!block.enabled || (block.hideMobile && block.hideDesktop)) return null;
  const visibility = block.hideMobile ? "hidden md:block" : block.hideDesktop ? "md:hidden" : "";
  const centered = block.align === "center";
  const href = block.ctaHref;
  if (block.kind === "spacer") {
    return <div data-visual-block={block.id} className={`${visibility} ${block.spacing === "compact" ? "h-5" : block.spacing === "spacious" ? "h-28" : "h-14"}`} aria-hidden="true" />;
  }
  if (block.kind === "divider") {
    return <div data-visual-block={block.id} className={`shell ${visibility} py-6`} aria-hidden="true"><div className="h-px bg-[#713a35]/15" /></div>;
  }
  return (
    <section data-visual-block={block.id} className={`shell ${visibility} py-3 sm:py-5`} aria-label={block.title || block.eyebrow || "Storefront section"}>
      <div className={`rounded-[1.75rem] border px-6 sm:px-10 ${tones[block.tone]} ${spacing[block.spacing]} ${centered ? "text-center" : ""}`}>
        <div className={centered ? "mx-auto max-w-3xl" : "max-w-4xl"}>
          {block.eyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-[.16em] opacity-70">{block.eyebrow}</p>}
          {block.title && <h2 className="display text-3xl leading-tight sm:text-4xl">{block.title}</h2>}
          {block.body && <p className={`mt-4 whitespace-pre-line text-sm leading-7 opacity-80 sm:text-base ${centered ? "mx-auto max-w-2xl" : "max-w-3xl"}`}>{block.body}</p>}
        </div>
        {block.kind === "image" && block.imagePath && (
          <div className="relative mt-7 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-black/5 sm:aspect-[21/9]">
            <Image unoptimized fill sizes="(max-width: 768px) 100vw, 1100px" className="object-cover" src={`/api/storefront-media/${block.imagePath.replace(/^media\//, "")}`} alt={block.title || "Aloyri editorial image"} />
          </div>
        )}
        {block.kind === "features" && block.items.length > 0 && (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {block.items.slice(0, 4).map((item, index) => <li key={index} className="rounded-xl border border-current/15 bg-white/10 p-5 text-sm font-medium leading-6">{item}</li>)}
          </ul>
        )}
        {block.kind === "quote" && <blockquote className="mt-6 border-l-2 border-current/30 pl-5 text-lg italic leading-relaxed sm:text-2xl">{block.items[0] || block.body || "Add a quote in your visual editor."}</blockquote>}
        {block.kind === "faq" && block.items.length > 0 && (
          <div className="mt-7 space-y-2">
            {block.items.map((item, index) => {
              const [question, ...answer] = item.split("|");
              return <details key={index} className="rounded-xl border border-current/15 p-4"><summary className="cursor-pointer font-semibold">{question}</summary><p className="mt-3 whitespace-pre-line text-sm leading-6 opacity-75">{answer.join("|")}</p></details>;
            })}
          </div>
        )}
        {block.ctaLabel && href && <div className={`mt-7 ${centered ? "text-center" : ""}`}>
          <Link href={href} className="inline-flex min-h-11 items-center justify-center rounded-full border border-current/30 px-6 py-3 text-sm font-semibold transition hover:opacity-70">{block.ctaLabel} <span className="ml-2" aria-hidden="true">→</span></Link>
        </div>}
      </div>
    </section>
  );
}
