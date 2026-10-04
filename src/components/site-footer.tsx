import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-black/10 bg-[#171714] text-[#f5f0e8]">
      <div className="shell grid gap-12 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:py-16">
        <div>
          <p className="brand-mark text-[#f5f0e8]">ALOYRI</p>
          <p className="mt-5 max-w-sm text-sm leading-6 text-white/55">
            A considered skincare destination built around clarity, authenticity and products worth returning to.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-4 text-xs uppercase tracking-[0.18em] text-white/40">Explore</p>
          <div className="flex flex-col gap-3 text-white/75">
            <Link href="/shop">Shop all</Link>
            <Link href="/shop?collection=new">New arrivals</Link>
            <Link href="/cart">Your bag</Link>
          </div>
        </div>
        <div className="text-sm">
          <p className="mb-4 text-xs uppercase tracking-[0.18em] text-white/40">Aloyri</p>
          <div className="flex flex-col gap-3 text-white/75">
            <Link href="/#about">Our edit</Link>
            <span>Dhaka, Bangladesh</span>
            <span>Customer care coming soon</span>
          </div>
        </div>
      </div>
      <div className="shell border-t border-white/10 py-5 text-xs text-white/35">© 2026 Aloyri. Storefront foundation.</div>
    </footer>
  );
}
