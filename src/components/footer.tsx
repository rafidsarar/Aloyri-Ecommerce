"use client";

import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { useCatalog } from "@/components/catalog-provider";
import { buildCategoryDirectory } from "@/lib/storefront-categories";

export function Footer({ description }: { description: string }) {
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
