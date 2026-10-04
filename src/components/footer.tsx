import Link from "next/link";

export function Footer() {
  return (
    <footer id="about" className="border-t border-black/10 bg-[#eee7df]">
      <div className="shell py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_.6fr_.6fr]">
          <div>
            <p className="display text-5xl">Aloyri</p>
            <p className="mt-5 max-w-md text-sm leading-7 text-black/55">
              A modern skincare destination built around thoughtful curation, useful product information and uncomplicated routines.
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-black/45">Shop</p>
            <div className="mt-5 flex flex-col gap-3 text-sm">
              <Link href="/shop">All products</Link>
              <Link href="/#new">New arrivals</Link>
              <Link href="/cart">Cart</Link>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-black/45">Aloyri</p>
            <div className="mt-5 flex flex-col gap-3 text-sm text-black/70">
              <span>Bangladesh</span>
              <span>Customer care coming soon</span>
            </div>
          </div>
        </div>
        <div className="mt-16 flex flex-col gap-3 border-t border-black/10 pt-6 text-xs text-black/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Aloyri. All rights reserved.</p>
          <p>Storefront foundation · CRM remains separate</p>
        </div>
      </div>
    </footer>
  );
}
