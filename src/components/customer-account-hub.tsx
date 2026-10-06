"use client";

import Link from "next/link";
import { FormEvent, useState, useSyncExternalStore } from "react";
import { AnalyticsViewTracker } from "@/components/storefront-analytics-tracker";
import { PostPurchaseOrders } from "@/components/post-purchase-orders";
import {
  clearCustomerProfile,
  customerProfileServerSnapshot,
  customerProfileSnapshot,
  readCustomerProfile,
  subscribeCustomerProfile,
  writeCustomerProfile,
} from "@/lib/customer-profile";
import { cartCount, readCart, CART_UPDATED_EVENT } from "@/lib/cart";
import {
  productPreferencesServerSnapshot,
  productPreferencesSnapshot,
  readCompareProductIds,
  readRecentProductIds,
  readSavedProductIds,
  subscribeProductPreferences,
} from "@/lib/product-preferences";

function cartSnapshot() {
  if (typeof window === "undefined") return "";
  try {
    return JSON.stringify(readCart());
  } catch {
    return "";
  }
}

function subscribeCart(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = () => listener();
  window.addEventListener(CART_UPDATED_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CART_UPDATED_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function CustomerAccountHub() {
  const [message, setMessage] = useState("");
  const profileSnapshot = useSyncExternalStore(
    subscribeCustomerProfile,
    customerProfileSnapshot,
    customerProfileServerSnapshot,
  );
  useSyncExternalStore(
    subscribeProductPreferences,
    productPreferencesSnapshot,
    productPreferencesServerSnapshot,
  );
  useSyncExternalStore(subscribeCart, cartSnapshot, () => "");

  const profile = readCustomerProfile();
  const wishlist = readSavedProductIds();
  const compare = readCompareProductIds();
  const recent = readRecentProductIds();
  const cart = readCart();

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    writeCustomerProfile({
      fullName: String(form.get("fullName") || ""),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      district: String(form.get("district") || ""),
    });
    setMessage("Saved on this device.");
  }

  return (
    <main className="shell py-12 md:py-16">
      <AnalyticsViewTracker event="customer_hub_view" />
      <div className="border-b border-[#713a35]/10 pb-9">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#713a35]/48">
          Your Aloyri
        </p>
        <h1 className="display mt-2 text-5xl sm:text-6xl">Customer account.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#321f1c]/52">
          Your recent orders, reorder guidance, wishlist, cart, compare list and profile basics are organized here on this device. CRM remains the live source for order status, while cloud sign-in stays disabled until Aloyri can support secure email authentication through a verified domain.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Wishlist", wishlist.length, "/wishlist"],
          ["Cart", cartCount(cart), "/cart"],
          ["Compare", compare.length, "/compare"],
          ["Recently viewed", recent.length, recent[0] ? "/wishlist" : "/shop"],
        ].map(([label, value, href]) => (
          <Link
            key={String(label)}
            href={String(href)}
            className="rounded-[1.3rem] border border-[#713a35]/10 bg-white/70 p-5 transition hover:border-[#713a35]/25"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#713a35]/45">
              {label}
            </p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </Link>
        ))}
      </div>

      <PostPurchaseOrders />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-[1.5rem] border border-[#713a35]/10 bg-white/70 p-5 sm:p-7">
          <p className="text-sm font-semibold">Checkout profile</p>
          <p className="mt-1 text-xs leading-5 text-[#321f1c]/45">
            Saved locally in this browser to prefill future checkout. Your delivery address is intentionally not stored here.
          </p>

          <form key={profileSnapshot} onSubmit={saveProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium">
              Name
              <input
                name="fullName"
                defaultValue={profile.fullName}
                maxLength={120}
                autoComplete="name"
                className="mt-2 h-12 w-full rounded-xl border border-[#713a35]/12 bg-white px-4 text-sm"
              />
            </label>
            <label className="text-xs font-medium">
              Mobile number
              <input
                name="phone"
                defaultValue={profile.phone}
                maxLength={30}
                autoComplete="tel"
                inputMode="tel"
                className="mt-2 h-12 w-full rounded-xl border border-[#713a35]/12 bg-white px-4 text-sm"
              />
            </label>
            <label className="text-xs font-medium">
              Email
              <input
                name="email"
                defaultValue={profile.email}
                maxLength={254}
                autoComplete="email"
                inputMode="email"
                className="mt-2 h-12 w-full rounded-xl border border-[#713a35]/12 bg-white px-4 text-sm"
              />
            </label>
            <label className="text-xs font-medium">
              District
              <input
                name="district"
                defaultValue={profile.district}
                maxLength={80}
                autoComplete="address-level1"
                className="mt-2 h-12 w-full rounded-xl border border-[#713a35]/12 bg-white px-4 text-sm"
              />
            </label>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
              <button className="rounded-full bg-[#713a35] px-5 py-3 text-xs font-semibold text-white">
                Save on this device
              </button>
              <button
                type="button"
                onClick={() => {
                  clearCustomerProfile();
                  setMessage("Device profile cleared.");
                }}
                className="rounded-full border border-[#713a35]/14 px-5 py-3 text-xs font-semibold text-[#713a35]"
              >
                Clear profile
              </button>
              {message ? (
                <span className="text-xs text-emerald-700" aria-live="polite">
                  {message}
                </span>
              ) : null}
            </div>
          </form>
        </section>

        <section className="rounded-[1.5rem] border border-[#713a35]/10 bg-[#f5e8e2] p-5 sm:p-7">
          <p className="text-sm font-semibold">Order & aftercare</p>
          <p className="mt-2 text-xs leading-6 text-[#321f1c]/48">
            Orders themselves remain in Aloyri CRM. Use your order number and checkout mobile number for secure customer-facing access.
          </p>
          <div className="mt-5 grid gap-3">
            <Link href="/track-order" className="rounded-xl bg-white/70 px-4 py-3 text-sm font-semibold text-[#713a35]">
              Track an order
            </Link>
            <Link href="/return-request" className="rounded-xl bg-white/70 px-4 py-3 text-sm font-semibold text-[#713a35]">
              Request a return review
            </Link>
            <Link href="/customer-care" className="rounded-xl bg-white/70 px-4 py-3 text-sm font-semibold text-[#713a35]">
              Customer care
            </Link>
          </div>
          <p className="mt-5 text-[11px] leading-5 text-[#321f1c]/40">
            No customer password is created yet. This avoids launching an account system without a secure recovery/sign-in channel.
          </p>
        </section>
      </div>
    </main>
  );
}
