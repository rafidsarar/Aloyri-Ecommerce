"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { volatileStorage } from "@/lib/volatile-storage";
import { writeSavedProductIds } from "@/lib/product-preferences";
import { BrandMark } from "@/components/brand-mark";
import { CartLink } from "@/components/cart-link";
import { useCatalog } from "@/components/catalog-provider";
import { buildCategoryDirectory } from "@/lib/storefront-categories";
import { CloseIcon, MenuIcon, SearchIcon } from "@/components/icons";

import { defaultPresentation, type StorefrontPresentation } from "@/lib/storefront-presentation";

export function Header({ announcement, presentation = defaultPresentation }: { announcement: string; presentation?: StorefrontPresentation }) {
  const links = presentation.navigation.map(item=>[item.label,item.href]);
  const pathname = usePathname();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
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

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const response = await fetch("/api/customer-auth/status", { cache: "no-store", credentials: "same-origin" });
        if (!response.ok) throw new Error("Session check failed");
        const data: { authenticated?: boolean } = await response.json();
        if (!cancelled) setSignedIn(data.authenticated === true);
      } catch {
        if (!cancelled) setSignedIn(false);
      }
    };
    void refresh();
    const onFocus = () => void refresh();
    const onSignedOut = () => { setSignedIn(false); setAccountOpen(false); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("aloyri:customer-signed-out", onSignedOut);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("aloyri:customer-signed-out", onSignedOut);
    };
  }, [pathname]);

  async function signOutFromHeader() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError("");
    try {
      const response = await fetch("/api/customer-auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("Sign out failed");
      volatileStorage.clear();
      writeSavedProductIds([]);
      window.dispatchEvent(new Event("aloyri:customer-signed-out"));
      window.dispatchEvent(new Event("aloyri-cart-updated"));
      setSignedIn(false);
      setAccountOpen(false);
      router.replace("/");
      router.refresh();
    } catch {
      setSignOutError("Unable to sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

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
                className="store-icon-link inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--store-border)] bg-[var(--store-panel)] transition hover:border-[var(--store-border)] hover:bg-[var(--store-surface)]">
                <svg className="h-5 w-5" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c0-3.3 2.7-6 6.5-6s6.5 2.7 6.5 6" />
                </svg>
              </button>
              {accountOpen ? (
                <nav id="header-account-menu" aria-label="Account shortcuts"
                  className="absolute right-0 top-full z-50 mt-3 w-64 max-w-[calc(100vw-1rem)] rounded-2xl border border-[var(--store-border)] bg-[var(--store-surface)] p-3 shadow-2xl">
                  <p className="border-b border-[var(--store-border)] px-4 pb-3 pt-2 text-xs font-semibold uppercase tracking-widest text-[var(--store-accent)]">Your Aloyri account</p>
                  {[
                    ["My account", "/account"],
                    ["My orders & returns", "/account?section=orders"],
                    ["Wishlist", "/account?section=wishlist"],
                    ["Settings", "/account?section=preferences"],
                    ["Track order", "/track-order"],
                    ["My cart", "/cart"],
                  ].map(([label, href]) => (
                    <Link key={href} href={href} onClick={() => setAccountOpen(false)}
                      className="block rounded-xl px-4 py-3 text-sm font-medium text-[var(--store-ink)] transition hover:bg-[var(--store-panel)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#713a35]">
                      {label}
                    </Link>
                  ))}
                  {signedIn ? (
                    <button type="button" onClick={() => void signOutFromHeader()} disabled={signingOut}
                      className="mt-2 block w-full rounded-xl border-t border-[var(--store-border)] px-4 py-3 text-left text-sm font-semibold text-[var(--store-accent)] transition hover:bg-[var(--store-panel)] disabled:opacity-60">
                      {signingOut ? "Signing out…" : "Sign out"}
                    </button>
                  ) : null}
                  {signOutError ? <p role="alert" className="px-4 py-2 text-xs text-red-700">{signOutError}</p> : null}
                </nav>
              ) : null}
            </div>

            <button type="button"
              onClick={() => {
                setAccountOpen(false);
                window.dispatchEvent(new Event("aloyri:open-global-search"));
              }}
              className="store-icon-link inline-flex h-10 w-10 items-center justify-center rounded-full border transition sm:h-11 sm:w-11"
              aria-label="Search products"
              aria-haspopup="dialog"
              aria-controls="global-storefront-search"
            >
              <SearchIcon />
            </button>
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
            className="store-mobile-nav store-navigation-drawer absolute inset-y-0 left-0 flex w-[min(88vw,390px)] flex-col overflow-y-auto overscroll-contain border-r border-[var(--store-border)] px-5 pb-7 pt-4 shadow-xl sm:px-6">
            <div className="store-drawer-heading flex items-center justify-between gap-4 border-b border-[var(--store-border)] pb-4">
              <BrandMark compact />
              <button ref={closeButtonRef} type="button" onClick={closeMenu}
                className="store-icon-link inline-flex h-11 w-11 items-center justify-center rounded-full border"
                aria-label="Close menu"><CloseIcon /></button>
            </div>
            <p className="mt-6 px-2 text-[10px] font-semibold uppercase tracking-[.18em] text-[var(--store-muted)]">Explore</p>
            <nav className="mt-3 flex flex-col" aria-label="Store navigation">
              {links.map(([label, href]) => (
                <Link key={label} href={href} aria-current={current(href) ? "page" : undefined}
                  onClick={closeMenu}
                  className="store-mobile-link flex min-h-12 items-center justify-between border-b py-3 text-[15px] font-medium transition hover:bg-[var(--store-panel)] hover:text-[var(--store-accent)]">
                  <span>{label}</span><span aria-hidden="true" className="text-[var(--store-muted)]">›</span>
                </Link>
              ))}
            </nav>
            <div className="mt-6 border-b border-[var(--store-border)] pb-4">
              <button type="button" onClick={() => setCategoriesExpanded(value => !value)}
                aria-expanded={categoriesExpanded} aria-controls="drawer-categories"
                className="flex min-h-11 w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[.14em] transition hover:bg-[var(--store-panel)]">
                Shop by category <span aria-hidden="true" className="text-lg font-normal text-[var(--store-muted)]">{categoriesExpanded ? "−" : "+"}</span>
              </button>
              {categoriesExpanded ? <div id="drawer-categories" className="mt-2 grid grid-cols-2 gap-2">
                {synced && publicCategories.length
                  ? publicCategories.map(item => (
                    <Link key={item.slug} href={item.href} onClick={closeMenu}
                      aria-current={current(item.href) ? "page" : undefined}
                      className="store-mobile-tool rounded-lg px-3 py-2.5 text-[13px] transition hover:brightness-95">{item.name}</Link>
                  ))
                  : <Link href="/shop" onClick={closeMenu} className="store-mobile-tool col-span-2 rounded-lg p-3 text-[13px]">Browse all categories</Link>}
                <Link href="/shop?stock=in-stock" onClick={closeMenu} className="store-mobile-tool rounded-lg px-3 py-2.5 text-[13px]">Available now</Link>
              </div> : null}
            </div>
            <div className="mt-auto pt-6">
              <Link href="/shop" onClick={closeMenu}
                className="flex min-h-11 items-center justify-between rounded-lg bg-[var(--store-panel)] px-4 py-3 text-sm font-medium text-[var(--store-ink)] transition hover:text-[var(--store-accent)]">
                Browse all products <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
