import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export function Footer({ description }: { description: string }) {
  return (
    <footer id="about" className="border-t border-[#713a35]/10 bg-[#f5e8e2]">
      <div className="shell py-10 md:py-14">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-[1.3fr_.55fr_.7fr_.65fr]">
          <div className="col-span-2 lg:col-span-1">
            <BrandMark className="items-start" />
            <p className="mt-6 max-w-md text-sm leading-7 text-[#321f1c]/58">
              {description}
            </p>
            <Link
              href="/about"
              className="mt-5 inline-flex text-sm font-semibold text-[#713a35] underline decoration-[#713a35]/25 underline-offset-4"
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
              <Link href="/category/cleansers">Cleansers</Link>
              <Link href="/category/moisturizers">Moisturizers</Link>
              <Link href="/category/sunscreen">Sunscreen</Link>
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

        <div className="mt-10 flex flex-col gap-3 border-t border-[#713a35]/10 pt-6 text-xs text-[#321f1c]/42 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Aloyri. All rights reserved.</p>
          <p>Let Your Skin Glow.</p>
        </div>
      </div>
    </footer>
  );
}
