import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export function Footer() {
  return (
    <footer id="about" className="border-t border-[#713a35]/10 bg-[#f5e8e2]">
      <div className="shell py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.45fr_.55fr_.55fr]">
          <div>
            <BrandMark className="items-start" />
            <p className="mt-6 max-w-md text-sm leading-7 text-[#321f1c]/58">
              Aloyri is a skincare destination built around considered selection,
              clear product information and a calmer way to build an everyday routine.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#713a35]/55">
              Shop
            </p>
            <div className="mt-5 flex flex-col gap-3 text-sm">
              <Link href="/shop">All skincare</Link>
              <Link href="/shop?category=Cleanser">Cleansers</Link>
              <Link href="/shop?category=Moisturizer">Moisturizers</Link>
              <Link href="/shop?category=Sunscreen">Sunscreen</Link>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#713a35]/55">
              Store
            </p>
            <div className="mt-5 flex flex-col gap-3 text-sm text-[#321f1c]/70">
              <Link href="/cart">Cart</Link>
              <span>Bangladesh</span>
              <span>BDT pricing</span>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-[#713a35]/10 pt-6 text-xs text-[#321f1c]/42 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Aloyri. All rights reserved.</p>
          <p>Let Your Skin Glow.</p>
        </div>
      </div>
    </footer>
  );
}
