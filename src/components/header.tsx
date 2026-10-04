"use client";

import Link from "next/link";
import { useState } from "react";
import { CartLink } from "@/components/cart-link";
import { CloseIcon, MenuIcon, SearchIcon } from "@/components/icons";

const links = [
  ["Shop", "/shop"],
  ["New in", "/#new"],
  ["Our edit", "/#new"],
  ["About", "/#about"],
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="bg-[#211d1a] px-4 py-2.5 text-center text-[11px] uppercase tracking-[0.18em] text-white/75">
        Thoughtfully curated skincare for Bangladesh
      </div>
      <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f5f1eb]/90 backdrop-blur-xl">
        <div className="shell grid h-20 grid-cols-[1fr_auto_1fr] items-center">
          <nav className="hidden items-center gap-7 lg:flex">
            {links.map(([label, href]) => <Link key={label} href={href} className="text-sm text-black/70 transition hover:text-black">{label}</Link>)}
          </nav>
          <button onClick={() => setOpen(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 lg:hidden" aria-label="Open menu"><MenuIcon /></button>

          <Link href="/" className="display text-3xl tracking-[-0.06em]" aria-label="Aloyri home">Aloyri</Link>

          <div className="flex items-center justify-end gap-2">
            <Link href="/shop" className="hidden h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/55 sm:inline-flex" aria-label="Search products"><SearchIcon /></Link>
            <CartLink />
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 bg-[#f5f1eb] p-6 lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/" onClick={() => setOpen(false)} className="display text-3xl">Aloyri</Link>
            <button onClick={() => setOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10" aria-label="Close menu"><CloseIcon /></button>
          </div>
          <nav className="mt-16 flex flex-col">
            {links.map(([label, href]) => (
              <Link key={label} href={href} onClick={() => setOpen(false)} className="display border-b border-black/10 py-5 text-4xl">{label}</Link>
            ))}
          </nav>
          <p className="absolute bottom-8 left-6 max-w-xs text-sm leading-6 text-black/45">Curated skincare, clear routines and a calmer way to shop.</p>
        </div>
      ) : null}
    </>
  );
}
