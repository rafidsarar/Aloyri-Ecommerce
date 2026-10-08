"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const groups = [
  {
    title: "Shop skincare",
    links: [
      { label: "All skincare", href: "/shop" },
      { label: "Bestsellers", href: "/shop?sort=bestseller" },
      { label: "Available now", href: "/shop?stock=in-stock" },
    ],
  },
  {
    title: "Find your step",
    links: [
      { label: "Cleansers", href: "/category/cleansers" },
      { label: "Moisturizers", href: "/category/moisturizers" },
      { label: "Sunscreen & SPF", href: "/category/sunscreen" },
    ],
  },
  {
    title: "Explore by focus",
    links: [
      { label: "Hydration", href: "/shop?focus=hydration" },
      { label: "Light textures", href: "/shop?focus=lightweight" },
      { label: "Simple & gentle", href: "/shop?focus=gentle" },
      { label: "Daily SPF", href: "/shop?focus=spf" },
    ],
  },
  {
    title: "Shopping help",
    links: [
      { label: "Find your routine", href: "/routine-finder" },
      { label: "Shipping & delivery", href: "/shipping-delivery" },
      { label: "Track an order", href: "/track-order" },
    ],
  },
];

export function ShopDiscoveryMenu() {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !wrapper.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        wrapper.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative"
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !event.currentTarget.contains(next)) setOpen(false);
      }}>
      <button
        type="button"
        className="store-nav-link inline-flex min-h-11 items-center gap-1.5 text-[13px] transition"
        aria-expanded={open}
        aria-controls="aloyri-shop-discovery"
        onClick={() => setOpen((value) => !value)}
      >
        Explore <span aria-hidden="true" className={"text-[10px] transition-transform " + (open ? "rotate-180" : "")}>⌄</span>
      </button>
      {open ? (
        <div id="aloyri-shop-discovery" role="group" aria-label="Explore skincare" className="store-discovery-menu absolute left-1/2 -translate-x-[25%] top-full z-50 mt-1 w-[min(78vw,860px)] rounded-[1.6rem] border p-6 shadow-xl">
          <div className="grid gap-6 md:grid-cols-4">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="store-discovery-muted text-[10px] font-semibold uppercase tracking-[.2em]">{group.title}</p>
                <div className="mt-4 flex flex-col gap-1">
                  {group.links.map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="store-discovery-link rounded-xl px-3 py-3 text-sm font-medium">
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="store-discovery-strip mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
            <span className="text-xs">Not sure where to begin? Build a simple routine based on your priorities.</span>
            <Link href="/routine-finder" onClick={() => setOpen(false)} className="shrink-0 text-xs font-semibold underline underline-offset-4">Start the finder →</Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
