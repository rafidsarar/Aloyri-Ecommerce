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

const sections = [
  { id: "orders", label: "Orders", subtitle: "Your purchases" },
  { id: "addresses", label: "Addresses", subtitle: "Delivery details" },
  { id: "wishlist", label: "Wishlist", subtitle: "Saved products" },
  { id: "support", label: "Support", subtitle: "Help and returns" },
  { id: "preferences", label: "Preferences", subtitle: "Profile and security" },
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
      <div className="account-dashboard-intro mb-7 flex flex-wrap items-start justify-between gap-5 rounded-[1.75rem] p-6 sm:p-9">
        <div className="min-w-0">
          <p className="account-overline">Your Aloyri space</p>
          <h1 className="account-display display mt-3 text-3xl leading-tight sm:text-5xl">
            {displayName.trim() ? "Hello, " + displayName.trim() + "." : "Welcome back."}
          </h1>
          <p className="account-muted mt-3 max-w-xl text-sm leading-6">
            Your purchases, personal information and customer care — all together.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={signingOut}
          aria-label="Sign out of customer account"
          className="account-outline-button inline-flex min-h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold disabled:opacity-60"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
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

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[245px_minmax(0,1fr)] lg:gap-9">
        <aside className="account-panel min-w-0 w-full overflow-hidden rounded-[1.4rem] border p-3 lg:sticky lg:top-28 lg:p-4">
          <p className="account-overline px-3 pb-2 pt-2">Account menu</p>
          <nav aria-label="Account sections" className="account-section-navigation flex w-full min-w-0 max-w-full gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                aria-current={section === item.id ? "page" : undefined}
                onClick={() => router.replace("/account?section=" + item.id, { scroll: false })}
                className={
                  "account-section-link flex min-h-12 shrink-0 items-center justify-between gap-4 rounded-xl px-4 py-3 text-left transition lg:w-full " +
                  (section === item.id ? "is-active" : "")
                }
              >
                <span>
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="account-section-caption mt-0.5 hidden text-[11px] lg:block">{item.subtitle}</span>
                </span>
                <span className="hidden text-sm lg:block" aria-hidden="true">→</span>
              </button>
            ))}
          </nav>
          <div className="account-menu-help mt-3 hidden border-t px-3 pt-4 lg:block">
            <Link href="/track-order" className="account-inline-link text-xs font-semibold underline underline-offset-4">
              Track an order without signing in ↗
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
                {selectedSection.label === "Preferences" ? "Profile & settings" : selectedSection.label}
              </h2>
            </div>
            <Link
              href="/track-order"
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
