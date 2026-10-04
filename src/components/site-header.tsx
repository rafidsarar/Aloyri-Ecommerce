"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BagIcon, CloseIcon, MenuIcon, SearchIcon } from "@/components/icons";

const CART_KEY = "aloyri_cart";

type StoredItem = { productId: string; qty: number };

function cartCount() {
  try {
    const items = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as StoredItem[];
    return items.reduce((total, item) => total + item.qty, 0);
  } catch {
    return 0;
  }
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = () => setCount(cartCount());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("aloyri-cart-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("aloyri-cart-updated", refresh);
    };
  }, []);

  return (
    <>
      <div className="announcement">Complimentary delivery in Dhaka on selected orders</div>
      <header className="site-header">
        <div className="shell flex h-[76px] items-center justify-between gap-5">
          <button className="icon-button md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <MenuIcon />
          </button>

          <Link href="/" className="brand-mark" aria-label="Aloyri home">ALOYRI</Link>

          <nav className="hidden items-center gap-8 text-[13px] font-medium tracking-wide md:flex">
            <Link href="/shop">Shop</Link>
            <Link href="/shop?collection=new">New arrivals</Link>
            <Link href="/shop?collection=essentials">Essentials</Link>
            <Link href="/#about">Our edit</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/shop" className="icon-button hidden sm:inline-flex" aria-label="Search products"><SearchIcon /></Link>
            <Link href="/cart" className="icon-button relative" aria-label="Shopping bag">
              <BagIcon />
              {count > 0 && <span className="cart-count">{count}</span>}
            </Link>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 bg-[#f7f3ee] p-6 md:hidden">
          <div className="flex items-center justify-between">
            <Link href="/" className="brand-mark" onClick={() => setOpen(false)}>ALOYRI</Link>
            <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close menu"><CloseIcon /></button>
          </div>
          <nav className="mt-16 flex flex-col gap-7 text-4xl font-medium tracking-[-0.03em]">
            <Link href="/shop" onClick={() => setOpen(false)}>Shop</Link>
            <Link href="/shop?collection=new" onClick={() => setOpen(false)}>New arrivals</Link>
            <Link href="/shop?collection=essentials" onClick={() => setOpen(false)}>Essentials</Link>
            <Link href="/#about" onClick={() => setOpen(false)}>Our edit</Link>
          </nav>
          <p className="absolute bottom-8 left-6 text-sm text-black/45">Curated skincare for Bangladesh.</p>
        </div>
      )}
    </>
  );
}
