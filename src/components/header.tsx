"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { CartLink } from "@/components/cart-link";
import { ShopDiscoveryMenu } from "@/components/shop-discovery-menu";
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
        <div className="shell grid min-h-[68px] min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 py-2.5 sm:gap-3 xl:grid-cols-[auto_minmax(0,1fr)_auto]">
          <div className="hidden xl:block"><BrandMark /></div>
          <nav className="hidden items-center justify-center gap-4 xl:flex xl:gap-5" aria-label="Primary navigation">
            <ShopDiscoveryMenu />
            {links.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                aria-current={current(href) ? "page" : undefined}
                className="store-nav-link text-[13px] transition aria-[current=page]:font-semibold"
              >
                {label}
              </Link>
            ))}
          </nav>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setOpen(true)}
            className="store-icon-link inline-flex h-11 w-11 items-center justify-center rounded-full border xl:hidden"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="mobile-navigation"
          >
            <MenuIcon />
          </button>

          <div className="justify-self-center xl:hidden"><BrandMark compact /></div>

          <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-2">
            <Link href="/track-order" className="store-utility-link hidden rounded-full px-3 py-2 text-xs font-medium xl:block">Track order</Link>
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
          ref={menuDialogRef}
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="store-mobile-nav fixed inset-0 z-50 overflow-y-auto overscroll-contain p-4 pb-12 sm:p-6 xl:hidden"
        >
          <div className="flex items-center justify-between">
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

          <nav className="mt-8 flex flex-col" aria-label="Mobile navigation">
            {links.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                aria-current={current(href) ? "page" : undefined}
                onClick={() => setOpen(false)}
                className="store-mobile-link display border-b py-4 text-3xl"
              >
                {label}
              </Link>
            ))}
          </nav>

          <Link href="/shop" onClick={() => setOpen(false)}
            className="store-mobile-tool mt-6 flex min-h-12 items-center justify-between rounded-2xl px-4 text-sm font-semibold">
            Search skincare and brands <SearchIcon />
          </Link>
          <div className="store-discovery-strip mt-6 rounded-2xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[.18em]">Shop by category</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {synced && publicCategories.length
                ? publicCategories.map(item => <Link key={item.slug} href={item.href} onClick={() => setOpen(false)}>{item.name}</Link>)
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
              Cleansers, moisturizers and daily SPF selected for simple routines.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
