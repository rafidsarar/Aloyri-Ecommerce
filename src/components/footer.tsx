"use client";

import Link from "next/link";
import { socialPlatforms, validSocialUrl, type SocialLinks } from "@/lib/storefront-admin-store";
import { BrandMark } from "@/components/brand-mark";
import { useCatalog } from "@/components/catalog-provider";
import { buildCategoryDirectory } from "@/lib/storefront-categories";

const socialNames: Record<keyof SocialLinks, string> = {
  facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube",
  x: "X", linkedin: "LinkedIn", whatsapp: "WhatsApp",
};
// Self-contained vector marks: no additional icon dependency in the storefront bundle.
const socialIconPaths: Record<keyof SocialLinks, string> = {
  facebook: "M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.9c0-2.51 1.5-3.9 3.8-3.9 1.1 0 2.25.2 2.25.2v2.48h-1.27c-1.25 0-1.64.78-1.64 1.58V12h2.8l-.45 2.89h-2.35v6.99A10 10 0 0 0 22 12Z",
  instagram: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.5-3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z",
  tiktok: "M16.7 2c.25 2.55 1.62 4.05 4.3 4.2v3.7a8.9 8.9 0 0 1-4.3-1.12v6.54c0 4.05-3.2 6.68-6.9 6.68-3.85 0-6.8-3.05-6.8-6.75 0-4.1 3.15-6.95 7.6-6.75v3.85c-2.35-.65-3.85.85-3.85 2.85 0 1.75 1.15 2.85 2.85 2.85 1.9 0 3.2-1.15 3.2-3.5V2h3.9Z",
  youtube: "M21.5 7.1a2.8 2.8 0 0 0-2-2C17.75 4.65 12 4.65 12 4.65s-5.75 0-7.5.45a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .5 4.9 2.8 2.8 0 0 0 2 2c1.75.45 7.5.45 7.5.45s5.75 0 7.5-.45a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22 12a29 29 0 0 0-.5-4.9ZM10 15.4V8.6l6 3.4-6 3.4Z",
  x: "M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.5 5.45 22H2.3l7.3-8.5L1.8 2h6.45l4.45 6.8L18.9 2Zm-1.1 18h1.75L7.3 3.9H5.4L17.8 20Z",
  linkedin: "M5 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM3 9h4v12H3V9Zm6 0h3.8v1.65h.05c.55-1 1.85-1.9 3.8-1.9 4.05 0 4.8 2.55 4.8 5.85V21h-4v-5.7c0-1.4-.05-3.15-1.95-3.15-1.95 0-2.25 1.5-2.25 3.05V21H9V9Z",
  whatsapp: "M12 2a10 10 0 0 0-8.55 15.2L2 22l4.95-1.4A10 10 0 1 0 12 2Zm0 2a8 8 0 0 1 0 16 7.9 7.9 0 0 1-4.1-1.15l-.45-.25-2.55.7.75-2.45-.3-.5A8 8 0 0 1 12 4Zm-3.5 3.5c-.3 0-.6.05-.85.35-.3.35-1.1 1.1-1.1 2.65 0 1.6 1.15 3.15 1.3 3.35.15.2 2.2 3.55 5.4 4.25 2.7.6 3.2-.1 3.75-.85.45-.6.45-1.15.3-1.25-.15-.1-1.7-.85-1.95-.95-.25-.1-.45-.15-.65.15-.2.3-.75.95-.9 1.15-.15.2-.35.2-.65.05-.3-.15-1.25-.45-2.4-1.45-.9-.8-1.5-1.8-1.65-2.1-.15-.3 0-.45.15-.6.15-.15.3-.35.45-.5.15-.2.2-.35.3-.55.1-.2.05-.4-.05-.55l-.9-2.15c-.2-.5-.4-.5-.55-.5Z",
};

export function Footer({ description, socialLinks }: { description: string; socialLinks: SocialLinks }) {
  const { products, categories, synced } = useCatalog();
  const directory = buildCategoryDirectory(categories, products);
  return (
    <footer id="about" className="store-footer border-t">
      <div className="shell py-10 md:py-14">
        <div aria-label="Shopping with Aloyri" className="store-discovery-strip mb-10 grid gap-5 rounded-2xl p-5 text-sm sm:grid-cols-3">
          <div><p className="font-semibold">Live availability</p><p className="store-discovery-muted mt-1 text-xs leading-5">Product price and stock are checked against the current catalog.</p></div>
          <div><p className="font-semibold">Delivery in Bangladesh</p><p className="store-discovery-muted mt-1 text-xs leading-5">See your delivery fee and details before placing an order.</p></div>
          <div><p className="font-semibold">Easy order tracking</p><p className="store-discovery-muted mt-1 text-xs leading-5">Track a purchase without signing into your account.</p></div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-[1.3fr_.55fr_.7fr_.65fr]">
          <div className="col-span-2 lg:col-span-1">
            <BrandMark className="items-start" />
            <p className="store-footer-description mt-6 max-w-md text-sm leading-7">
              {description}
            </p>
            <div aria-label="Follow Aloyri" className="mt-5 flex flex-wrap items-center gap-2">
              {socialPlatforms.map(platform => {
                const href = validSocialUrl(platform, socialLinks?.[platform] || "");
                if (!href) return null;
                return <a key={platform} href={href} target="_blank" rel="noopener noreferrer" aria-label={"Aloyri on " + socialNames[platform]} title={socialNames[platform]} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-current/20 transition-colors hover:bg-[#713a35]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                  <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d={socialIconPaths[platform]} /></svg>
                </a>;
              })}
            </div>
            <Link
              href="/about"
              className="store-footer-accent mt-5 inline-flex text-sm font-semibold underline underline-offset-4"
            >
              About Aloyri
            </Link>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#713a35]/55">
              Shop
            </p>
            <div className="mt-5 flex flex-col gap-3 text-sm">
              <Link href="/shop">All skincare</Link>
              <Link href="/shop?sort=bestseller">Bestsellers</Link>
              <Link href="/routine-finder">Routine finder</Link>
              <Link href="/compare">Compare products</Link>
              {synced ? directory.map(category => <Link key={category.slug} href={category.href}>{category.name}</Link>) : null}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#713a35]/55">
              Customer care
            </p>
            <div className="mt-5 flex flex-col gap-3 text-sm text-[#321f1c]/70">
              <Link href="/account">My account</Link>
              <Link href="/track-order">Track order</Link>
              <Link href="/shipping-delivery">Shipping & delivery</Link>
              <Link href="/returns-refunds">Returns & refunds</Link>
              <Link href="/faq">FAQ</Link>
              <Link href="/contact">Contact</Link>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#713a35]/55">
              Information
            </p>
            <div className="mt-5 flex flex-col gap-3 text-sm text-[#321f1c]/70">
              <Link href="/customer-care">Customer care</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <span>Bangladesh</span>
              <span>BDT pricing</span>
            </div>
          </div>
        </div>

        <div className="store-footer-bottom mt-10 flex flex-col gap-3 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Aloyri. All rights reserved.</p>
          <p>Let Your Skin Glow.</p>
        </div>
      </div>
    </footer>
  );
}
