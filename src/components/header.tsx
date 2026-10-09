"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { CartLink } from "@/components/cart-link";
import { useCatalog } from "@/components/catalog-provider";
import { buildCategoryDirectory } from "@/lib/storefront-categories";
import { CloseIcon, MenuIcon, SearchIcon } from "@/components/icons";

import { defaultPresentation, type StorefrontPresentation } from "@/lib/storefront-presentation";

export function Header({ announcement, presentation = defaultPresentation }: { announcement: string; presentation?: StorefrontPresentation }) {
  const links = presentation.navigation.map(item=>[item.label,item.href]);
  const pathname = usePathname();
  const { categories: crmCategories, products, synced } = useCatalog();
  const publicCategories = buildCategoryDirectory(crmCategories, products);
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuDialogRef = useRef<HTMLDivElement>(null);

  function closeMenu() {
    setOpen(false);
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  }

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        return;
      }

      if (event.key === "Tab" && menuDialogRef.current) {
        const focusable = Array.from(
          menuDialogRef.current.querySelectorAll<HTMLElement>(
            'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => !element.hasAttribute("hidden"));

        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const current = (href: string) =>
    pathname === href || (href !== "/shop" && pathname.startsWith(href));

  return (
    <>
      {presentation.showAnnouncement && announcement ? <div className="store-announcement px-4 py-2.5 text-center text-[10px] font-medium uppercase tracking-[0.15em] sm:text-[11px]">
        {announcement}
      </div> : null}

      <header className={`store-header top-0 z-40 border-b backdrop-blur-xl ${presentation.stickyHeader ? "sticky" : "relative"}`}>
        <div className="shell grid min-h-[68px] min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-2.5 sm:min-h-[76px] sm:gap-3">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setOpen(true)}
            className="store-icon-link inline-flex h-11 w-11 items-center justify-center justify-self-start rounded-full border transition hover:-translate-y-0.5"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="storefront-navigation"
          >
            <MenuIcon />
          </button>

          <div className="justify-self-center"><BrandMark compact /></div>

          <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-2">
            <Link href="/account" aria-current={current("/account") ? "page" : undefined} className="store-utility-link hidden rounded-full px-3 py-2 text-sm font-semibold sm:block">Account</Link>
            <Link href="/account" aria-label="Customer account and sign in"
              className="store-icon-link inline-flex h-11 w-11 items-center justify-center rounded-full border sm:hidden"
              aria-current={current("/account") ? "page" : undefined}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5.5 20c0-3.3 2.7-6 6.5-6s6.5 2.7 6.5 6" />
              </svg>
            </Link>
            <Link
              href="/shop"
              className="store-icon-link hidden h-11 w-11 items-center justify-center rounded-full border transition min-[380px]:inline-flex"
              aria-label="Search products"
            >
              <SearchIcon />
            </Link>
            <CartLink />
          </div>
        </div>
      </header>

      {open ? (
        <div
          id="storefront-navigation"
          className="fixed inset-0 z-[60]"
        >
          <button type="button" tabIndex={-1} aria-label="Close navigation backdrop" onClick={closeMenu} className="absolute inset-0 h-full w-full bg-[#2f1d1a]/40 backdrop-blur-[3px]" />
          <div
            ref={menuDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="store-mobile-nav absolute inset-y-0 left-0 flex w-[min(100vw,460px)] flex-col overflow-y-auto overscroll-contain border-r border-[#713a35]/10 px-5 pb-10 pt-5 shadow-2xl sm:px-8 sm:pt-7"
          >
          <div className="flex items-center justify-between gap-4 border-b border-[#713a35]/10 pb-5">
            <BrandMark />
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeMenu}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#713a35]/15"
              aria-label="Close menu"
            >
              <CloseIcon />
            </button>
          </div>

          <p className="mt-7 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8d5f56]">Discover Aloyri</p>
          <nav className="mt-1 flex flex-col" aria-label="Primary navigation">
            <Link href="/shop" onClick={() => setOpen(false)} aria-current={current("/shop") ? "page" : undefined} className="store-mobile-link display group flex items-center justify-between border-b py-3 text-2xl transition-all hover:pl-2 sm:text-[1.8rem]">
              Explore skincare <span aria-hidden="true" className="text-base font-sans">↗</span>
            </Link>
            {links.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                aria-current={current(href) ? "page" : undefined}
                onClick={() => setOpen(false)}
                className="store-mobile-link display group flex items-center justify-between border-b py-3 text-2xl transition-all hover:pl-2 sm:text-[1.8rem]"
              >
                {label} <span aria-hidden="true" className="text-base font-sans opacity-50 transition-transform group-hover:translate-x-1">↗</span>
              </Link>
            ))}
          </nav>

          <Link href="/shop" onClick={() => setOpen(false)}
            className="store-mobile-tool mt-6 flex min-h-12 items-center justify-between rounded-2xl px-4 text-sm font-semibold transition hover:brightness-95">
            Search skincare and brands <SearchIcon />
          </Link>
          <div className="store-discovery-strip mt-6 rounded-2xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[.18em]">Shop by category</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {synced && publicCategories.length
                ? publicCategories.map(item => <Link key={item.slug} href={item.href} onClick={() => setOpen(false)} className="rounded-lg px-2 py-2 transition hover:bg-white/70">{item.name}</Link>)
                : <Link href="/shop" onClick={() => setOpen(false)}>Browse all categories</Link>}
              <Link href="/shop?stock=in-stock" onClick={() => setOpen(false)}>Available now</Link>
            </div>
          </div>
          <nav aria-label="Customer tools" className="mt-6 grid grid-cols-2 gap-3">
            <Link href="/account" onClick={() => setOpen(false)} className="store-mobile-tool rounded-2xl p-4 text-sm font-semibold">My account</Link>
            <Link href="/track-order" onClick={() => setOpen(false)} className="rounded-2xl bg-[#f5e8e2] p-4 text-sm font-semibold">Track order</Link>
          </nav>

          <div className="store-mobile-tool mt-8 rounded-3xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[#8d5f56]">Aloyri edit</p>
            <p className="mt-2 text-sm leading-6 text-[#321f1c]/62">
              Discover the categories, products and routines that fit your skincare needs.
            </p>
          </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
