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
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuDialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) setAccountOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

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
        ).filter((element) => !element.hasAttribute("hidden") && element.getClientRects().length > 0);

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
        <div className="shell store-header-grid">

          <div className="store-header-leading flex items-center gap-1">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setOpen(true)}
            className="store-icon-link inline-flex h-11 w-11 items-center justify-center rounded-full border"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="mobile-navigation"
          >
            <MenuIcon />
          </button>

          </div>
          <div className="store-header-brand"><BrandMark compact /></div>

          <div className="store-header-actions flex min-w-0 items-center justify-end gap-1 sm:gap-2">
            <div ref={accountRef} className="relative">
              <button type="button" aria-label="Account menu" aria-expanded={accountOpen} aria-controls="header-account-menu"
                onClick={() => setAccountOpen(value => !value)}
                className="store-utility-link inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold">
                <span className="hidden sm:inline">Account</span>
                <svg className="sm:hidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c0-3.3 2.7-6 6.5-6s6.5 2.7 6.5 6" />
                </svg>
                <span aria-hidden="true" className="text-xs">{accountOpen ? "⌃" : "⌄"}</span>
              </button>
              {accountOpen ? (
                <nav id="header-account-menu" aria-label="Account shortcuts"
                  className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-[#713a35]/15 bg-[#fffaf7] p-2 shadow-xl">
                  {[
                    ["My account", "/account"],
                    ["My orders", "/account#orders"],
                    ["Track order", "/track-order"],
                    ["My cart", "/cart"],
                  ].map(([label, href]) => (
                    <Link key={href} href={href} onClick={() => setAccountOpen(false)}
                      className="block rounded-xl px-4 py-3 text-sm font-medium text-[#321f1c] transition hover:bg-[#f5e8e2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#713a35]">
                      {label}
                    </Link>
                  ))}
                </nav>
              ) : null}
            </div>

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
        <div className="fixed inset-0 z-50" role="presentation">
          <button type="button" aria-label="Close navigation overlay"
            onClick={closeMenu} className="absolute inset-0 bg-[#241512]/55 backdrop-blur-[3px]" />
          <div ref={menuDialogRef} id="mobile-navigation" role="dialog" aria-modal="true"
            aria-label="Store navigation menu"
            className="store-mobile-nav store-navigation-drawer absolute inset-y-0 left-0 flex w-[min(92vw,440px)] flex-col overflow-y-auto overscroll-contain border-r border-[#713a35]/10 px-5 pb-7 pt-5 shadow-2xl sm:px-7">
            <div className="store-drawer-heading flex items-center justify-between gap-4 border-b border-[#713a35]/10 pb-5">
              <BrandMark compact />
              <button ref={closeButtonRef} type="button" onClick={closeMenu}
                className="store-icon-link inline-flex h-11 w-11 items-center justify-center rounded-full border"
                aria-label="Close menu"><CloseIcon /></button>
            </div>
            <Link href="/shop" onClick={closeMenu}
              className="store-drawer-search store-mobile-tool mt-5 flex min-h-12 items-center justify-between gap-3 rounded-xl px-4 text-sm font-semibold">
              Search products and brands <SearchIcon />
            </Link>
            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[.22em] text-[#8d5f56]">Discover Aloyri</p>
            <nav className="mt-3 flex flex-col" aria-label="Store navigation">
              {links.map(([label, href]) => (
                <Link key={label} href={href} aria-current={current(href) ? "page" : undefined}
                  onClick={closeMenu}
                  className="store-mobile-link flex min-h-12 items-center justify-between border-b py-3 text-[17px] font-medium transition hover:pl-2 hover:text-[#713a35]">
                  <span>{label}</span><span aria-hidden="true" className="text-[#a77d73]">↗</span>
                </Link>
              ))}
            </nav>
            <div className="mt-7 border-b border-[#713a35]/10 pb-4">
              <button type="button" onClick={() => setCategoriesExpanded(value => !value)}
                aria-expanded={categoriesExpanded} aria-controls="drawer-categories"
                className="flex w-full items-center justify-between py-2 text-left text-[11px] font-semibold uppercase tracking-[.17em]">
                Shop by category <span aria-hidden="true" className="text-xl">{categoriesExpanded ? "−" : "+"}</span>
              </button>
              {categoriesExpanded ? <div id="drawer-categories" className="mt-3 grid grid-cols-2 gap-2">
                {synced && publicCategories.length
                  ? publicCategories.map(item => (
                    <Link key={item.slug} href={item.href} onClick={closeMenu}
                      aria-current={current(item.href) ? "page" : undefined}
                      className="store-mobile-tool rounded-xl px-3 py-3 text-sm transition hover:brightness-95">{item.name}</Link>
                  ))
                  : <Link href="/shop" onClick={closeMenu} className="store-mobile-tool col-span-2 rounded-xl p-3 text-sm">Browse all categories</Link>}
                <Link href="/shop?stock=in-stock" onClick={closeMenu} className="store-mobile-tool rounded-xl px-3 py-3 text-sm">Available now</Link>
              </div> : null}
            </div>
            <div className="mt-auto pt-7">
              <div className="rounded-2xl border border-[#713a35]/10 bg-[#f5e8e2] p-4">
                <p className="text-xs font-semibold tracking-[.1em] text-[#713a35]">ALOYRI SKINCARE</p>
                <p className="mt-2 text-sm leading-6 text-[#321f1c]/70">Find the right products for your everyday skincare routine.</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
