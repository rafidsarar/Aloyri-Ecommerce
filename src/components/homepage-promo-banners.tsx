import Image from "next/image";
import Link from "next/link";
import { storefrontMediaUrl, type StorefrontConfig } from "@/lib/storefront-admin-store";

function inSchedule(startAt: string, endAt: string, now: number) {
  const parse = (value: string) => value ? Date.parse(value + ":00+06:00") : null;
  const start = parse(startAt);
  const end = parse(endAt);
  if ((start !== null && !Number.isFinite(start)) || (end !== null && !Number.isFinite(end))) return false;
  if (start !== null && end !== null && start >= end) return false;
  return (start === null || now >= start) && (end === null || now < end);
}

function serverTimestamp() { return Date.now(); }

export function HomepagePromoBanners({ banners }: {
  banners: StorefrontConfig["homepage"]["promoBanners"];
}) {
  const now = serverTimestamp();
  const visible = banners.filter((banner) => banner.enabled && banner.title.trim() && inSchedule(banner.startAt, banner.endAt, now));
  if (!visible.length) return null;

  return (
    <div className="shell grid gap-4 py-7 md:py-10" aria-label="Storefront promotions">
      {visible.map((banner, index) => (
        <section key={index} className={`min-w-0 overflow-hidden rounded-[1.75rem] border border-[#713a35]/10 bg-[#f5e8e2] px-6 py-8 sm:px-10 sm:py-10 ${banner.layout === "centered" ? "text-center" : ""}`}>
          <div className={`flex min-w-0 flex-col gap-5 ${banner.layout === "centered" ? "items-center" : "items-start md:flex-row md:items-center md:justify-between"}`}>
            <div className="min-w-0 max-w-2xl">
              {banner.eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#713a35]/70">{banner.eyebrow}</p> : null}
              <h2 className="display mt-3 text-3xl leading-tight text-[#321f1c] sm:text-4xl">{banner.title}</h2>
              {banner.copy ? <p className="mt-3 text-sm leading-6 text-[#321f1c]/70">{banner.copy}</p> : null}
            </div>
            {banner.imagePath ? (
              <div className={`relative w-full overflow-hidden rounded-2xl ${banner.mobileLayout === "compact" ? "hidden sm:block" : ""} ${banner.layout === "centered" ? "max-w-2xl" : "md:max-w-[40%]"}`}>
                <Image src={storefrontMediaUrl(banner.imagePath)} alt={banner.title} width={840} height={480} unoptimized className="h-auto w-full object-cover" />
              </div>
            ) : null}
            {banner.ctaHref && banner.ctaLabel ? (
              <Link href={banner.ctaHref} className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-[#713a35] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#60312d]">
                {banner.ctaLabel} <span className="ml-2" aria-hidden="true">→</span>
              </Link>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}
