"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { CartLink } from "@/components/cart-link";
import { CloseIcon, MenuIcon, SearchIcon } from "@/components/icons";

const links = [
  ["Shop", "/shop"],
  ["Cleansers", "/category/cleansers"],
  ["Moisturizers", "/category/moisturizers"],
  ["Sunscreen", "/category/sunscreen"],
  ["Track order", "/track-order"],
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="bg-[#713a35] px-4 py-2.5 text-center text-[10px] font-medium uppercase tracking-[0.22em] text-[#fff8f5] sm:text-[11px]">
        Let Your Skin Glow. · Curated skincare for Bangladesh
      </div>

      <header className="sticky top-0 z-40 border-b border-[#713a35]/10 bg-[#fffaf7]/92 backdrop-blur-xl">
        <div className="shell grid h-[76px] grid-cols-[1fr_auto_1fr] items-center sm:h-[82px]">
          <nav className="hidden items-center gap-6 xl:flex">
            {links.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="text-[13px] text-[#321f1c]/68 transition hover:text-[#713a35]"
              >
                {label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#713a35]/15 bg-white/55 xl:hidden"
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>

          <BrandMark />

          <div className="flex items-center justify-end gap-2">
            <Link
              href="/shop"
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-[#713a35]/15 bg-white/70 transition hover:bg-white sm:inline-flex"
              aria-label="Search products"
            >
              <SearchIcon />
            </Link>
            <CartLink />
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 bg-[#fffaf7] p-6 xl:hidden">
          <div className="flex items-center justify-between">
            <BrandMark />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#713a35]/15"
              aria-label="Close menu"
            >
              <CloseIcon />
            </button>
          </div>

          <nav className="mt-14 flex flex-col">
            {links.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="display border-b border-[#713a35]/10 py-5 text-4xl text-[#321f1c]"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="absolute bottom-8 left-6 right-6 rounded-3xl bg-[#f6e9e3] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[#8d5f56]">Aloyri edit</p>
            <p className="mt-2 text-sm leading-6 text-[#321f1c]/62">
              Cleansers, moisturizers and daily SPF selected for simple routines.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
