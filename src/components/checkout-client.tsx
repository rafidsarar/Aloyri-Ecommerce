"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowIcon } from "@/components/icons";
import { ProductArtwork } from "@/components/product-artwork";
import { readCart, type CartItem } from "@/lib/cart";
import {
  bangladeshDistricts,
  CHECKOUT_DRAFT_KEY,
  deliveryZoneLabels,
  initialCheckoutDraft,
  isValidBangladeshPhone,
  normalizeBangladeshPhone,
  paymentMethodLabels,
  type CheckoutDraft,
  type DeliveryZone,
  type PaymentMethod,
} from "@/lib/checkout";
import { formatPrice, products } from "@/lib/catalog";

type FieldErrors = Partial<Record<keyof CheckoutDraft, string>>;

const inputClass =
  "mt-2 h-12 w-full rounded-[.9rem] border border-[#713a35]/14 bg-white px-4 text-sm text-[#321f1c] outline-none transition placeholder:text-[#321f1c]/30 focus:border-[#b9725f]/60 focus:ring-2 focus:ring-[#b9725f]/10";

const textareaClass =
  "mt-2 min-h-28 w-full resize-y rounded-[.9rem] border border-[#713a35]/14 bg-white px-4 py-3 text-sm text-[#321f1c] outline-none transition placeholder:text-[#321f1c]/30 focus:border-[#b9725f]/60 focus:ring-2 focus:ring-[#b9725f]/10";

export function CheckoutClient() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [draft, setDraft] = useState<CheckoutDraft>(initialCheckoutDraft);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [step, setStep] = useState<"details" | "review">("details");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCartItems(readCart());

    try {
      const saved = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (saved) {
        setDraft({
          ...initialCheckoutDraft,
          ...(JSON.parse(saved) as Partial<CheckoutDraft>),
        });
      }
    } catch {
      // Ignore invalid or unavailable browser storage.
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    try {
      sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Checkout still works when browser storage is unavailable.
    }
  }, [draft, hydrated]);

  const rows = useMemo(
    () =>
      cartItems
        .map((item) => ({
          ...item,
          product: products.find((product) => product.id === item.productId),
        }))
        .filter((row) => row.product),
    [cartItems],
  );

  const subtotal = rows.reduce(
    (sum, row) => sum + (row.product?.price ?? 0) * row.qty,
    0,
  );

  function setField<K extends keyof CheckoutDraft>(
    field: K,
    value: CheckoutDraft[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate() {
    const next: FieldErrors = {};

    if (draft.fullName.trim().length < 2) {
      next.fullName = "Enter the customer's full name.";
    }

    if (!isValidBangladeshPhone(draft.phone)) {
      next.phone = "Enter a valid Bangladesh mobile number.";
    }

    if (
      draft.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())
    ) {
      next.email = "Enter a valid email address or leave it blank.";
    }

    if (!draft.deliveryZone) {
      next.deliveryZone = "Choose a delivery zone.";
    }

    if (!draft.district) {
      next.district = "Choose a district.";
    }

    if (draft.area.trim().length < 2) {
      next.area = "Enter the area, thana or upazila.";
    }

    if (draft.address.trim().length < 8) {
      next.address = "Enter a complete delivery address.";
    }

    if (!draft.paymentMethod) {
      next.paymentMethod = "Choose a payment method.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function reviewOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validate()) {
      const firstError = document.querySelector("[data-checkout-error='true']");
      firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setDraft((current) => ({
      ...current,
      phone: normalizeBangladeshPhone(current.phone),
    }));
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!hydrated) {
    return (
      <main className="shell min-h-[65vh] py-10 md:py-14">
        <div className="h-72 animate-pulse rounded-[1.8rem] bg-[#f5e8e2]" />
      </main>
    );
  }

  if (rows.length === 0) {
    return (
      <main className="shell min-h-[62vh] py-20 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/48">
          Checkout
        </p>
        <h1 className="display mt-4 text-5xl sm:text-6xl">Your cart is empty.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#321f1c]/50">
          Add something to your routine before continuing to checkout.
        </p>
        <Link
          href="/shop"
          className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white"
        >
          Shop skincare <ArrowIcon />
        </Link>
      </main>
    );
  }

  return (
    <main className="shell py-10 md:py-14">
      <div className="mb-9 flex flex-col gap-5 border-b border-[#713a35]/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/48">
            Secure checkout foundation
          </p>
          <h1 className="display mt-3 text-5xl sm:text-6xl">
            {step === "details" ? "Delivery details." : "Review your order."}
          </h1>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
          <span
            className={
              step === "details"
                ? "rounded-full bg-[#713a35] px-3 py-2 text-white"
                : "rounded-full bg-[#f5e8e2] px-3 py-2 text-[#713a35]"
            }
          >
            1 · Details
          </span>
          <span className="h-px w-6 bg-[#713a35]/20" />
          <span
            className={
              step === "review"
                ? "rounded-full bg-[#713a35] px-3 py-2 text-white"
                : "rounded-full bg-[#f5e8e2] px-3 py-2 text-[#713a35]/45"
            }
          >
            2 · Review
          </span>
        </div>
      </div>

      {step === "details" ? (
        <form
          onSubmit={reviewOrder}
          className="grid gap-10 lg:grid-cols-[1fr_390px] lg:gap-14"
          noValidate
        >
          <div className="space-y-8">
            <section className="rounded-[1.5rem] border border-[#713a35]/10 bg-white/60 p-5 sm:p-7">
              <div className="mb-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
                  Contact
                </p>
                <h2 className="display mt-2 text-3xl">Who should receive the order?</h2>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Full name
                  <input
                    value={draft.fullName}
                    onChange={(event) => setField("fullName", event.target.value)}
                    className={inputClass}
                    placeholder="Customer name"
                    autoComplete="name"
                    aria-invalid={Boolean(errors.fullName)}
                  />
                  {errors.fullName ? (
                    <span
                      data-checkout-error="true"
                      className="mt-2 block text-xs text-red-700"
                    >
                      {errors.fullName}
                    </span>
                  ) : null}
                </label>

                <label className="text-sm font-medium">
                  Mobile number
                  <input
                    value={draft.phone}
                    onChange={(event) => setField("phone", event.target.value)}
                    className={inputClass}
                    placeholder="01XXXXXXXXX"
                    inputMode="tel"
                    autoComplete="tel"
                    aria-invalid={Boolean(errors.phone)}
                  />
                  {errors.phone ? (
                    <span
                      data-checkout-error="true"
                      className="mt-2 block text-xs text-red-700"
                    >
                      {errors.phone}
                    </span>
                  ) : (
                    <span className="mt-2 block text-xs font-normal text-[#321f1c]/40">
                      Bangladesh mobile numbers only.
                    </span>
                  )}
                </label>
              </div>

              <label className="mt-5 block text-sm font-medium">
                Email <span className="font-normal text-[#321f1c]/38">(optional)</span>
                <input
                  value={draft.email}
                  onChange={(event) => setField("email", event.target.value)}
                  className={inputClass}
                  placeholder="name@example.com"
                  inputMode="email"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email ? (
                  <span
                    data-checkout-error="true"
                    className="mt-2 block text-xs text-red-700"
                  >
                    {errors.email}
                  </span>
                ) : null}
              </label>
            </section>

            <section className="rounded-[1.5rem] border border-[#713a35]/10 bg-white/60 p-5 sm:p-7">
              <div className="mb-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
                  Delivery
                </p>
                <h2 className="display mt-2 text-3xl">Where should it go?</h2>
              </div>

              <div>
                <p className="text-sm font-medium">Delivery zone</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["inside-dhaka", "Inside Dhaka"],
                      ["outside-dhaka", "Outside Dhaka"],
                    ] as Array<[DeliveryZone, string]>
                  ).map(([value, label]) => {
                    const active = draft.deliveryZone === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setField("deliveryZone", value)}
                        className={`rounded-[1rem] border p-4 text-left transition ${
                          active
                            ? "border-[#713a35] bg-[#f7ebe6]"
                            : "border-[#713a35]/12 bg-white hover:border-[#713a35]/28"
                        }`}
                      >
                        <span className="text-sm font-semibold">{label}</span>
                        <span className="mt-1 block text-xs leading-5 text-[#321f1c]/45">
                          Delivery fee will be configured before live ordering.
                        </span>
                      </button>
                    );
                  })}
                </div>
                {errors.deliveryZone ? (
                  <span
                    data-checkout-error="true"
                    className="mt-2 block text-xs text-red-700"
                  >
                    {errors.deliveryZone}
                  </span>
                ) : null}
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  District
                  <select
                    value={draft.district}
                    onChange={(event) => setField("district", event.target.value)}
                    className={inputClass}
                    autoComplete="address-level1"
                    aria-invalid={Boolean(errors.district)}
                  >
                    <option value="">Select district</option>
                    {bangladeshDistricts.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                  {errors.district ? (
                    <span
                      data-checkout-error="true"
                      className="mt-2 block text-xs text-red-700"
                    >
                      {errors.district}
                    </span>
                  ) : null}
                </label>

                <label className="text-sm font-medium">
                  Area / thana / upazila
                  <input
                    value={draft.area}
                    onChange={(event) => setField("area", event.target.value)}
                    className={inputClass}
                    placeholder="e.g. Dhanmondi"
                    autoComplete="address-level2"
                    aria-invalid={Boolean(errors.area)}
                  />
                  {errors.area ? (
                    <span
                      data-checkout-error="true"
                      className="mt-2 block text-xs text-red-700"
                    >
                      {errors.area}
                    </span>
                  ) : null}
                </label>
              </div>

              <label className="mt-5 block text-sm font-medium">
                Full delivery address
                <textarea
                  value={draft.address}
                  onChange={(event) => setField("address", event.target.value)}
                  className={textareaClass}
                  placeholder="House/flat, road, block, area and any other delivery details"
                  autoComplete="street-address"
                  aria-invalid={Boolean(errors.address)}
                />
                {errors.address ? (
                  <span
                    data-checkout-error="true"
                    className="mt-2 block text-xs text-red-700"
                  >
                    {errors.address}
                  </span>
                ) : null}
              </label>

              <label className="mt-5 block text-sm font-medium">
                Landmark <span className="font-normal text-[#321f1c]/38">(optional)</span>
                <input
                  value={draft.landmark}
                  onChange={(event) => setField("landmark", event.target.value)}
                  className={inputClass}
                  placeholder="Nearby landmark"
                />
              </label>

              <label className="mt-5 block text-sm font-medium">
                Delivery note <span className="font-normal text-[#321f1c]/38">(optional)</span>
                <textarea
                  value={draft.notes}
                  onChange={(event) => setField("notes", event.target.value)}
                  className={textareaClass}
                  placeholder="Anything the delivery team should know"
                />
              </label>
            </section>

            <section className="rounded-[1.5rem] border border-[#713a35]/10 bg-white/60 p-5 sm:p-7">
              <div className="mb-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
                  Payment
                </p>
                <h2 className="display mt-2 text-3xl">How would you like to pay?</h2>
              </div>

              <div className="grid gap-3">
                {(
                  [
                    ["COD", "Cash on Delivery", "Pay when the order is delivered."],
                    ["bKash", "bKash", "Mobile payment preference. No payment is taken yet."],
                    ["Nagad", "Nagad", "Mobile payment preference. No payment is taken yet."],
                  ] as Array<[PaymentMethod, string, string]>
                ).map(([value, label, description]) => {
                  const active = draft.paymentMethod === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setField("paymentMethod", value)}
                      className={`flex items-center gap-4 rounded-[1rem] border p-4 text-left transition ${
                        active
                          ? "border-[#713a35] bg-[#f7ebe6]"
                          : "border-[#713a35]/12 bg-white hover:border-[#713a35]/28"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          active ? "border-[#713a35]" : "border-[#713a35]/25"
                        }`}
                      >
                        {active ? (
                          <span className="h-2.5 w-2.5 rounded-full bg-[#713a35]" />
                        ) : null}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{label}</span>
                        <span className="mt-1 block text-xs leading-5 text-[#321f1c]/45">
                          {description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-[1.5rem] border border-[#713a35]/10 bg-[#f5e8e2] p-5 sm:p-6 lg:sticky lg:top-32">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
              Order summary
            </p>

            <div className="mt-5 space-y-4">
              {rows.map(({ product, qty, productId }) =>
                product ? (
                  <div key={productId} className="grid grid-cols-[58px_1fr_auto] gap-3">
                    <ProductArtwork
                      product={product}
                      className="aspect-[4/5] rounded-[.75rem]"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{product.name}</p>
                      <p className="mt-1 text-[11px] text-[#321f1c]/42">
                        {product.brand} · Qty {qty}
                      </p>
                    </div>
                    <p className="text-xs font-semibold">
                      {formatPrice(product.price * qty)}
                    </p>
                  </div>
                ) : null,
              )}
            </div>

            <div className="mt-6 border-t border-[#713a35]/10 pt-5">
              <div className="flex justify-between text-sm">
                <span className="text-[#321f1c]/55">Products subtotal</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-[#321f1c]/55">Delivery</span>
                <span className="text-xs text-[#321f1c]/42">Not configured</span>
              </div>
              <div className="mt-5 border-t border-[#713a35]/10 pt-5">
                <p className="text-xs leading-5 text-[#321f1c]/45">
                  Final payable amount will include the delivery fee once live
                  delivery pricing is configured.
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#713a35] px-6 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#60312d]"
            >
              Review order <ArrowIcon />
            </button>

            <p className="mt-4 text-center text-[10px] leading-5 text-[#321f1c]/38">
              Nothing is sent to Aloyri or the CRM at this stage.
            </p>
          </aside>
        </form>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_390px] lg:gap-14">
          <div className="space-y-6">
            <section className="rounded-[1.5rem] border border-[#713a35]/10 bg-white/60 p-5 sm:p-7">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
                    Contact & delivery
                  </p>
                  <h2 className="display mt-2 text-3xl">{draft.fullName}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className="rounded-full border border-[#713a35]/14 bg-white px-4 py-2 text-xs font-semibold text-[#713a35]"
                >
                  Edit
                </button>
              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#713a35]/45">
                    Contact
                  </p>
                  <p className="mt-2 text-sm">{draft.phone}</p>
                  {draft.email ? (
                    <p className="mt-1 text-sm text-[#321f1c]/55">{draft.email}</p>
                  ) : null}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#713a35]/45">
                    Delivery zone
                  </p>
                  <p className="mt-2 text-sm">
                    {draft.deliveryZone
                      ? deliveryZoneLabels[draft.deliveryZone]
                      : ""}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-[1rem] bg-[#f7ebe6] p-4">
                <p className="text-sm leading-6">
                  {draft.address}
                  <br />
                  {draft.area}, {draft.district}
                  {draft.landmark ? (
                    <>
                      <br />
                      Landmark: {draft.landmark}
                    </>
                  ) : null}
                </p>
              </div>

              {draft.notes ? (
                <div className="mt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#713a35]/45">
                    Delivery note
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#321f1c]/58">
                    {draft.notes}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="rounded-[1.5rem] border border-[#713a35]/10 bg-white/60 p-5 sm:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
                Payment preference
              </p>
              <h2 className="display mt-2 text-3xl">
                {paymentMethodLabels[draft.paymentMethod]}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#321f1c]/50">
                This is only a checkout preference for now. No payment is charged
                and no financial record is created.
              </p>
            </section>

            <section className="rounded-[1.5rem] border border-[#b9725f]/20 bg-[#fff4ef] p-5 sm:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/55">
                Foundation status
              </p>
              <h2 className="display mt-2 text-3xl">Ready for order integration.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#321f1c]/55">
                Customer details, Bangladesh address handling, payment preference,
                validation and order review are complete. The final order button
                remains disabled until live stock, delivery pricing and secure CRM
                order creation are connected.
              </p>
            </section>
          </div>

          <aside className="h-fit rounded-[1.5rem] border border-[#713a35]/10 bg-[#f5e8e2] p-5 sm:p-6 lg:sticky lg:top-32">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
              Final review
            </p>

            <div className="mt-5 space-y-4">
              {rows.map(({ product, qty, productId }) =>
                product ? (
                  <div key={productId} className="grid grid-cols-[1fr_auto] gap-4">
                    <div>
                      <p className="text-xs font-semibold">{product.name}</p>
                      <p className="mt-1 text-[11px] text-[#321f1c]/42">
                        Qty {qty} · {product.size}
                      </p>
                    </div>
                    <p className="text-xs font-semibold">
                      {formatPrice(product.price * qty)}
                    </p>
                  </div>
                ) : null,
              )}
            </div>

            <div className="mt-6 border-t border-[#713a35]/10 pt-5">
              <div className="flex justify-between text-sm">
                <span className="text-[#321f1c]/55">Products subtotal</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-[#321f1c]/55">Delivery</span>
                <span className="text-xs text-[#321f1c]/42">Pending setup</span>
              </div>
            </div>

            <button
              type="button"
              disabled
              className="mt-6 w-full cursor-not-allowed rounded-full bg-[#713a35]/30 px-6 py-4 text-sm font-semibold text-white"
            >
              Place order — integration required
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("details");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="mt-3 w-full rounded-full border border-[#713a35]/14 bg-white/60 px-6 py-3.5 text-sm font-semibold text-[#713a35]"
            >
              Edit checkout details
            </button>

            <p className="mt-4 text-center text-[10px] leading-5 text-[#321f1c]/38">
              No order, payment or CRM record has been created.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
