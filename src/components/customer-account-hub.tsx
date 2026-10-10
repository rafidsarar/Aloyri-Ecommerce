"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CustomerAuthPanel } from "@/components/customer-auth-panel";
import { CustomerAuthLanding } from "@/components/customer-auth-landing";
import { volatileStorage } from "@/lib/volatile-storage";
import { writeSavedProductIds } from "@/lib/product-preferences";
import { CustomerPostPurchaseCenter } from "@/components/customer-post-purchase-center";
import { SavedProductsClient } from "@/components/saved-products-client";
import { AccountSectionIcon } from "@/components/icons";

const sections = [
  { id: "orders", label: "Orders & returns", subtitle: "Purchases and tracking", icon: "orders" },
  { id: "addresses", label: "Saved addresses", subtitle: "Delivery details", icon: "addresses" },
  { id: "wishlist", label: "Wishlist", subtitle: "Products you love", icon: "wishlist" },
  { id: "support", label: "Customer care", subtitle: "Help and returns", icon: "support" },
  { id: "preferences", label: "Profile & settings", subtitle: "Personal details", icon: "preferences" },
] as const;

export function CustomerAccountHub({
  authenticated,
  displayName,
  profileComplete,
}: {
  authenticated: boolean;
  displayName: string;
  profileComplete: boolean;
}) {
  const [signedOut, setSignedOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const handleSignedOut = () => setSignedOut(true);
    window.addEventListener("aloyri:customer-signed-out", handleSignedOut);
    return () => window.removeEventListener("aloyri:customer-signed-out", handleSignedOut);
  }, []);

  const signedIn = authenticated && !signedOut;
  const requested = params.get("section") || "orders";
  const section = sections.some((item) => item.id === requested) ? requested : "orders";
  const selectedSection = sections.find((item) => item.id === section) || sections[0];
  const returnTo = section === "orders" ? "/account" : "/account?section=" + section;

  async function signOut() {
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
      setSignedOut(true);
      router.replace("/account");
      router.refresh();
    } catch {
      setSignOutError("Unable to sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  if (!signedIn) {
    return (
      <main className="shell min-h-[65vh] max-w-6xl py-10 md:py-16">
        <CustomerAuthLanding
          returnTo={returnTo}
          authError={params.get("auth") || undefined}
        />
      </main>
    );
  }

  return (
    <main className="shell min-h-[65vh] py-9 md:py-14">
      <div className="mb-5 flex items-center gap-2 text-xs text-[var(--store-muted)]">
        <Link href="/" className="hover:text-[var(--store-accent)]">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="font-semibold text-[var(--store-ink)]">My account</span>
      </div>
      <div className="account-dashboard-intro relative mb-6 overflow-hidden rounded-[1.75rem] border border-[var(--store-border)] p-5 sm:p-8">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <div aria-hidden="true" className="account-avatar flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-semibold sm:h-16 sm:w-16">
              {(displayName.trim().charAt(0) || "A").toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="account-overline">Your Aloyri account</p>
              <h1 className="account-display display mt-1 break-words text-3xl leading-tight sm:text-4xl">
                {displayName.trim() ? "Welcome, " + displayName.trim() : "Welcome back"}
              </h1>
              <p className="account-muted mt-2 text-sm">Your skincare journey, all in one place.</p>
            </div>
          </div>
          <button type="button" onClick={() => void signOut()} disabled={signingOut}
            aria-label="Sign out of customer account"
            className="account-outline-button inline-flex min-h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold disabled:opacity-60">
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
      <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { id: "orders", label: "Track orders", detail: "See order progress", icon: "orders" },
          { id: "addresses", label: "My addresses", detail: "Manage delivery", icon: "addresses" },
          { id: "support", label: "Get help", detail: "Returns and support", icon: "support" },
        ].map((shortcut) => (
          <button key={shortcut.id} type="button" onClick={() => router.replace("/account?section=" + shortcut.id, { scroll: false })}
            className="account-quick-action group flex min-h-28 flex-col items-start justify-between gap-3 rounded-2xl border p-4 text-left transition sm:min-h-32 sm:p-5">
            <span aria-hidden="true" className="account-quick-icon inline-flex h-9 w-9 items-center justify-center rounded-full text-lg"><AccountSectionIcon section={shortcut.icon} /></span>
            <span className="block">
              <span className="block text-sm font-semibold">{shortcut.label}</span>
              <span className="account-muted mt-1 block text-xs">{shortcut.detail}</span>
            </span>
          </button>
        ))}
      </div>

      {signOutError ? (
        <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          {signOutError}
        </p>
      ) : null}
      {!profileComplete ? (
        <div className="account-info-strip mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4">
          <div>
            <p className="text-sm font-semibold">Finish setting up your account</p>
            <p className="account-muted mt-1 text-xs leading-5">
              Add your full name and mobile number before placing an order.
            </p>
          </div>
          <Link
            href={"/account/setup?next=" + encodeURIComponent(returnTo)}
            className="account-primary-button inline-flex min-h-11 items-center rounded-full px-5 text-xs font-semibold"
          >
            Complete profile →
          </Link>
        </div>
      ) : null}

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-7">
        <aside className="account-panel min-w-0 w-full overflow-hidden rounded-[1.4rem] border p-3 lg:sticky lg:top-28 lg:p-4">
          <p className="account-overline px-3 pb-2 pt-2">Account menu</p>
          <nav aria-label="Account sections" className="account-section-navigation flex w-full min-w-0 max-w-full gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                aria-current={section === item.id ? "page" : undefined}
                onClick={() => router.replace("/account?section=" + item.id, { scroll: false })}
                className={
                  "account-section-link flex min-h-12 shrink-0 items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition lg:w-full " +
                  (section === item.id ? "is-active" : "")
                }
              >
                <span aria-hidden="true" className="account-nav-icon hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg lg:inline-flex"><AccountSectionIcon section={item.icon} /></span>
              <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="account-section-caption mt-0.5 hidden text-[11px] lg:block">{item.subtitle}</span>
                </span>
                <span className="hidden text-sm lg:block" aria-hidden="true">→</span>
              </button>
            ))}
          </nav>
          <div className="account-menu-help mt-3 hidden border-t px-3 pt-4 lg:block">
            <Link href="/account?section=orders" className="account-inline-link text-xs font-semibold underline underline-offset-4">
              Track my orders ↗
            </Link>
            <Link href="/shop" className="account-inline-link mt-4 block text-xs font-semibold underline underline-offset-4">
              Continue shopping ↗
            </Link>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="account-overline">My account</p>
              <h2 className="account-display display mt-1 text-2xl sm:text-3xl">
                {selectedSection.label}
              </h2>
            </div>
            <Link
              href="/account?section=orders"
              className="account-inline-link text-xs font-semibold underline underline-offset-4 lg:hidden"
            >
              Track order ↗
            </Link>
          </div>
          {section === "wishlist" ? <SavedProductsClient /> : null}
          {section === "preferences" ? <CustomerAuthPanel /> : null}
          <CustomerPostPurchaseCenter section={section} />
        </div>
      </div>
    </main>
  );
}
