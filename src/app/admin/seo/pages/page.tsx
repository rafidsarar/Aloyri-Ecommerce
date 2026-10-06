import Link from "next/link";
import { AdminCard, AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  effectiveSeoEntry,
  publicPageLabels,
} from "@/lib/seo-manager";
import {
  defaultSeoConfig,
  readDraftStorefrontConfig,
  type SeoPageKey,
} from "@/lib/storefront-admin-store";

const pageRows = [
  ["homepage", "Homepage", "/"],
  ["shop", "Shop", "/shop"],
  ["category-cleansers", "Category · Cleansers", "/category/cleansers"],
  ["category-moisturizers", "Category · Moisturizers", "/category/moisturizers"],
  ["category-sunscreen", "Category · Sunscreen", "/category/sunscreen"],
  ...Object.entries(publicPageLabels).map(([key, label]) => [
    key,
    label,
    {
      about: "/about",
      faq: "/faq",
      shipping: "/shipping-delivery",
      returns: "/returns-refunds",
      contact: "/contact",
      customerCare: "/customer-care",
      privacy: "/privacy",
      terms: "/terms",
    }[key as SeoPageKey],
  ]),
] as Array<[string, string, string]>;

function entryFor(config: Awaited<ReturnType<typeof readDraftStorefrontConfig>>, key: string) {
  if (key === "homepage") return [config.seo.homepage, defaultSeoConfig.homepage] as const;
  if (key === "shop") return [config.seo.shop, defaultSeoConfig.shop] as const;
  if (key.startsWith("category-")) {
    const category = key.slice(9) as keyof typeof config.seo.categories;
    return [config.seo.categories[category], defaultSeoConfig.categories[category]] as const;
  }
  const page = key as SeoPageKey;
  return [config.seo.pages[page], defaultSeoConfig.pages[page]] as const;
}

export default async function SeoPagesPage() {
  const admin = await requireAdminPermission("seo.view");
  const config = await readDraftStorefrontConfig();

  return (
    <AdminShell
      username={admin.username}
      title="Page & category SEO"
      subtitle="Edit discoverability metadata in Draft. Transactional pages such as cart, checkout, order confirmation, tracking and returns requests remain permanently noindex."
    >
      <AdminCard>
        <div className="divide-y divide-black/7">
          {pageRows.map(([key, label, path]) => {
            const [entry, fallback] = entryFor(config, key);
            const effective = effectiveSeoEntry(entry, {
              title: fallback.title || label,
              description: fallback.description || "",
              canonical: fallback.canonical || path,
              index: fallback.index,
              follow: fallback.follow,
              ogTitle: fallback.ogTitle,
              ogDescription: fallback.ogDescription,
              ogImagePath: fallback.ogImagePath,
            });
            return (
              <div
                key={key}
                className="grid gap-4 py-4 md:grid-cols-[1fr_160px_auto] md:items-center"
              >
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-1 text-xs text-black/42">
                    {effective.title} · {effective.canonical}
                  </p>
                </div>
                <span
                  className={
                    effective.index === false
                      ? "w-fit rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-black/50"
                      : "w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-emerald-700"
                  }
                >
                  {effective.index === false ? "noindex" : "index"}
                </span>
                <Link
                  href={"/admin/seo/pages/" + key}
                  className="rounded-lg border border-[#713a35]/16 px-3 py-2 text-xs font-semibold text-[#713a35]"
                >
                  Edit SEO
                </Link>
              </div>
            );
          })}
        </div>
      </AdminCard>
    </AdminShell>
  );
}
