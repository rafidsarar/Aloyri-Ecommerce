"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useCatalog } from "@/components/catalog-provider";
import { ArrowIcon } from "@/components/icons";
import { ProductMedia } from "@/components/product-media";
import { readCart, type CartItem, writeCart } from "@/lib/cart";
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
import { formatPrice, getProductById } from "@/lib/catalog";
import type { PromotionQuote } from "@/lib/promotions";

type FieldErrors = Partial<Record<keyof CheckoutDraft, string>>;
type DeliveryRates = Record<DeliveryZone, number>;

const inputClass =
  "mt-2 h-12 w-full rounded-[.9rem] border border-[#713a35]/14 bg-white px-4 text-sm text-[#321f1c] outline-none transition placeholder:text-[#321f1c]/30 focus:border-[#b9725f]/60 focus:ring-2 focus:ring-[#b9725f]/10";

const textareaClass =
  "mt-2 min-h-28 w-full resize-y rounded-[.9rem] border border-[#713a35]/14 bg-white px-4 py-3 text-sm text-[#321f1c] outline-none transition placeholder:text-[#321f1c]/30 focus:border-[#b9725f]/60 focus:ring-2 focus:ring-[#b9725f]/10";

export function CheckoutClient() {
  const router = useRouter();
  const {
    products: liveProducts,
    synced: catalogSynced,
    error: catalogError,
    refresh: refreshCatalog,
  } = useCatalog();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [draft, setDraft] = useState<CheckoutDraft>(initialCheckoutDraft);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [step, setStep] = useState<"details" | "review">("details");
  const [hydrated, setHydrated] = useState(false);
  const [orderingEnabled, setOrderingEnabled] = useState(false);
  const [deliveryRates, setDeliveryRates] = useState<DeliveryRates | null>(null);
  const [orderingStatusLoaded, setOrderingStatusLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [promotionCode, setPromotionCode] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [promotionQuote, setPromotionQuote] = useState<PromotionQuote | null>(null);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [promotionError, setPromotionError] = useState("");

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

    void fetch("/api/store-status", { cache: "no-store" })
      .then((response) => response.json())
      .then(
        (status: {
          orderingEnabled?: boolean;
          deliveryRates?: DeliveryRates | null;
        }) => {
          const rates = status.deliveryRates ?? null;
          setDeliveryRates(rates);
          setOrderingEnabled(status.orderingEnabled === true && Boolean(rates));
          setDraft((current) =>
          current.paymentMethod === "COD"
            ? current
            : { ...current, paymentMethod: "COD" },
          );
        },
      )
      .catch(() => {
        setDeliveryRates(null);
        setOrderingEnabled(false);
      })
      .finally(() => setOrderingStatusLoaded(true));
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
      cartItems.map((item) => {
        const liveProduct = liveProducts.find(
          (product) => product.id === item.productId,
        );
        return {
          ...item,
          liveProduct,
          product: liveProduct ?? getProductById(item.productId),
        };
      }),
    [cartItems, liveProducts],
  );

  const hasUnavailable = rows.some(
    (row) =>
      !row.liveProduct ||
      (row.liveProduct.availableStock ?? 0) < row.qty,
  );

  const subtotal = rows.reduce(
    (sum, row) =>
      sum + (row.liveProduct ? row.liveProduct.price * row.qty : 0),
    0,
  );
  const deliveryCharge =
    draft.deliveryZone && deliveryRates
      ? deliveryRates[draft.deliveryZone]
      : 0;
  const payableTotal = subtotal + deliveryCharge;
  const quotedSubtotal = promotionQuote?.productsSubtotal ?? subtotal;
  const quotedDiscount = promotionQuote?.discount ?? 0;
  const quotedShippingDiscount = promotionQuote?.shippingDiscount ?? 0;
  const quotedDelivery =
    promotionQuote?.deliveryCharge ??
    (draft.deliveryZone && deliveryRates ? deliveryCharge : 0);
  const quotedTotal =
    promotionQuote?.total ??
    (draft.deliveryZone && deliveryRates ? payableTotal : subtotal);
  const activePromotion = promotionQuote?.promotion ?? null;

  useEffect(() => {
    if (!catalogSynced || hasUnavailable || cartItems.length === 0) {
      setPromotionQuote(null);
      setPromotionLoading(false);
      return;
    }

    const controller = new AbortController();
    setPromotionLoading(true);
    setPromotionError("");

    void fetch("/api/promotions/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: cartItems.map((item) => ({
          productId: item.productId,
          qty: item.qty,
        })),
        ...(draft.deliveryZone ? { deliveryZone: draft.deliveryZone } : {}),
        code: appliedCode,
      }),
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as PromotionQuote & {
          error?: string;
          code?: string;
        };

        if (!response.ok) {
          throw new Error(
            result.error ||
              "That promotion could not be applied. Check the code and try again.",
          );
        }

        setPromotionQuote(result);
        setPromotionError("");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setPromotionQuote(null);
        if (appliedCode) {
          setPromotionError(
            error instanceof Error
              ? error.message
              : "That promotion could not be applied.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setPromotionLoading(false);
      });

    return () => controller.abort();
  }, [
    appliedCode,
    cartItems,
    catalogSynced,
    draft.deliveryZone,
    hasUnavailable,
  ]);

  function applyPromotionCode() {
    const normalized = promotionCode.trim().toUpperCase();
    if (!normalized) {
      setPromotionError("Enter a promotion code first.");
      return;
    }
    setPromotionCode(normalized);
    setPromotionError("");
    setAppliedCode(normalized);
  }

  function removePromotionCode() {
    setAppliedCode("");
    setPromotionCode("");
    setPromotionError("");
  }

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

    if (!catalogSynced || catalogError || hasUnavailable) {
      setSubmitError(
        "Live stock changed or could not be verified. Return to your cart and review the available quantities.",
      );
      return;
    }

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

  async function placeOrder() {
    if (
      !orderingEnabled ||
      !catalogSynced ||
      Boolean(catalogError) ||
      hasUnavailable ||
      submitting ||
      promotionLoading ||
      Boolean(appliedCode && promotionError) ||
      draft.paymentMethod !== "COD" ||
      !draft.deliveryZone
    ) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    let externalOrderId = "";
    try {
      externalOrderId = sessionStorage.getItem("aloyri_checkout_id") || "";
      if (!externalOrderId) {
        externalOrderId = crypto.randomUUID();
        sessionStorage.setItem("aloyri_checkout_id", externalOrderId);
      }
    } catch {
      externalOrderId = crypto.randomUUID();
    }

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          externalOrderId,
          customer: {
            name: draft.fullName.trim(),
            phone: normalizeBangladeshPhone(draft.phone),
            email: draft.email.trim().toLowerCase(),
            address: draft.address.trim(),
            district: draft.district,
            area: draft.area.trim(),
            landmark: draft.landmark.trim(),
            notes: draft.notes.trim(),
          },
          items: rows.map((row) => ({
            productId: row.liveProduct!.id,
            qty: row.qty,
          })),
          promotionCode: appliedCode,
          deliveryZone: draft.deliveryZone,
          paymentMethod: "COD",
        }),
      });

      const result = (await response.json()) as {
        orderNumber?: string;
        error?: string;
      };

      if (!response.ok || !result.orderNumber) {
        setSubmitError(
          result.error ||
            "The order could not be placed. Please review your cart and try again.",
        );
        return;
      }

      writeCart([]);
      setCartItems([]);
      try {
        sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
        sessionStorage.removeItem("aloyri_checkout_id");
      } catch {
        // Confirmation can continue without browser storage.
      }

      router.push(
        `/order-confirmation?order=${encodeURIComponent(result.orderNumber)}`,
      );
    } catch {
      setSubmitError(
        "The order service is temporarily unavailable. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return (
      <main className="shell min-h-[65vh] py-10 md:py-14">
        <div className="h-72 animate-pulse rounded-[1.8rem] bg-[#f5e8e2]" />
      </main>
    );
  }

  if (cartItems.length > 0 && !catalogSynced) {
    return (
      <main className="shell min-h-[62vh] py-20 text-center">
        <p className="display text-4xl">
          {catalogError
            ? "We can’t verify live stock right now."
            : "Checking live price and stock…"}
        </p>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[#321f1c]/50">
          Checkout only continues after Aloyri CRM confirms current prices and
          available quantities.
        </p>
        {catalogError ? (
          <button
            type="button"
            onClick={() => void refreshCatalog()}
            className="mt-7 rounded-full bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white"
          >
            Try again
          </button>
        ) : null}
      </main>
    );
  }

  if (catalogSynced && hasUnavailable) {
    return (
      <main className="shell min-h-[62vh] py-20 text-center">
        <p className="display text-4xl">Your cart needs an update.</p>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[#321f1c]/50">
          One or more products are out of stock or the selected quantity is
          higher than current CRM availability.
        </p>
        <Link
          href="/cart"
          className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white"
        >
          Review cart <ArrowIcon />
        </Link>
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
                ) : (
                  <span className="mt-2 block text-xs font-normal leading-5 text-[#321f1c]/40">
                    Used only for order confirmation and delivery-status updates.
                  </span>
                )}
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
                          {deliveryRates
                            ? `${formatPrice(deliveryRates[value])} delivery`
                            : "Checking delivery fee…"}
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
                    ["COD", "Cash on Delivery", "Place the order now and pay when it is delivered."],
                    ["bKash", "bKash", "Online payment verification will be added in a later payment cycle."],
                    ["Nagad", "Nagad", "Online payment verification will be added in a later payment cycle."],
                  ] as Array<[PaymentMethod, string, string]>
                ).map(([value, label, description]) => {
                  const active = draft.paymentMethod === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        value === "COD" && setField("paymentMethod", value)
                      }
                      disabled={value !== "COD"}
                      className={`flex items-center gap-4 rounded-[1rem] border p-4 text-left transition ${
                        value !== "COD"
                          ? "cursor-not-allowed border-[#713a35]/8 bg-[#f7f3f1] opacity-55"
                          : active
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
                    <ProductMedia
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

            <div className="mt-6 rounded-[1rem] border border-[#713a35]/10 bg-white/65 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#713a35]/48">
                    Promotion
                  </p>
                  <p className="mt-1 text-xs text-[#321f1c]/45">
                    Add a code, or eligible automatic offers apply by themselves.
                  </p>
                </div>
                {promotionLoading ? (
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[#321f1c]/38">
                    Checking…
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={promotionCode}
                  onChange={(event) => {
                    setPromotionCode(event.target.value.toUpperCase());
                    setPromotionError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyPromotionCode();
                    }
                  }}
                  placeholder="Promotion code"
                  maxLength={40}
                  className="h-11 min-w-0 flex-1 rounded-full border border-[#713a35]/14 bg-white px-4 text-sm uppercase tracking-[0.08em] outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-[#321f1c]/30 focus:border-[#b9725f]/60"
                />
                <button
                  type="button"
                  onClick={applyPromotionCode}
                  disabled={promotionLoading}
                  className="rounded-full bg-[#713a35] px-4 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Apply
                </button>
              </div>

              {promotionError ? (
                <p role="alert" className="mt-2 text-xs leading-5 text-red-700">
                  {promotionError}
                </p>
              ) : null}

              {activePromotion ? (
                <div className="mt-3 flex items-start justify-between gap-3 rounded-[.8rem] bg-[#f7ebe6] p-3">
                  <div>
                    <p className="text-xs font-semibold text-[#713a35]">
                      {activePromotion.badgeText || activePromotion.name}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[#321f1c]/48">
                      {promotionQuote?.savings
                        ? `${formatPrice(promotionQuote.savings)} saved on this order.`
                        : "Promotion applied."}
                    </p>
                  </div>
                  {appliedCode ? (
                    <button
                      type="button"
                      onClick={removePromotionCode}
                      className="text-[11px] font-semibold text-[#713a35] underline decoration-[#713a35]/25 underline-offset-4"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-6 border-t border-[#713a35]/10 pt-5">
              <div className="flex justify-between text-sm">
                <span className="text-[#321f1c]/55">Products subtotal</span>
                <span className="font-semibold">{formatPrice(quotedSubtotal)}</span>
              </div>
              {quotedDiscount > 0 ? (
                <div className="mt-3 flex justify-between text-sm text-[#713a35]">
                  <span>Promotion discount</span>
                  <span className="font-semibold">−{formatPrice(quotedDiscount)}</span>
                </div>
              ) : null}
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-[#321f1c]/55">Delivery</span>
                <span className="font-semibold">
                  {draft.deliveryZone && deliveryRates
                    ? quotedShippingDiscount > 0
                      ? (
                          <span className="inline-flex items-center gap-2">
                            <span>{formatPrice(quotedDelivery)}</span>
                            <span className="text-[11px] font-normal text-[#321f1c]/35 line-through">
                              {formatPrice(deliveryCharge)}
                            </span>
                          </span>
                        )
                      : formatPrice(quotedDelivery)
                    : "Select zone"}
                </span>
              </div>
              <div className="mt-5 flex justify-between border-t border-[#713a35]/10 pt-5 text-base">
                <span className="font-semibold">Total</span>
                <span className="font-semibold">
                  {draft.deliveryZone && deliveryRates
                    ? formatPrice(quotedTotal)
                    : formatPrice(promotionQuote?.discountedSubtotal ?? subtotal)}
                </span>
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
                Cash on Delivery is the first live payment method. No online
                payment is charged during checkout.
              </p>
            </section>

            <section className="rounded-[1.5rem] border border-[#b9725f]/20 bg-[#fff4ef] p-5 sm:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/55">
                Ordering status
              </p>
              <h2 className="display mt-2 text-3xl">
                {!orderingStatusLoaded
                  ? "Checking order service…"
                  : orderingEnabled
                    ? "Cash on Delivery ordering is ready."
                    : "Awaiting delivery-rate setup."}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#321f1c]/55">
                Delivery is configured at ৳80 inside Dhaka and ৳150 outside
                Dhaka. The CRM rechecks the authoritative charge, product price
                and available stock when the order is submitted.
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

              {activePromotion ? (
                <div className="mt-4 rounded-[.9rem] bg-[#f7ebe6] p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-[#713a35]">
                        {activePromotion.badgeText || activePromotion.name}
                      </p>
                      {activePromotion.code ? (
                        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#321f1c]/40">
                          Code {activePromotion.code}
                        </p>
                      ) : (
                        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#321f1c]/40">
                          Automatic offer
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-[#713a35]">
                      Save {formatPrice(promotionQuote?.savings ?? 0)}
                    </span>
                  </div>
                </div>
              ) : null}

            <div className="mt-6 border-t border-[#713a35]/10 pt-5">
              <div className="flex justify-between text-sm">
                <span className="text-[#321f1c]/55">Products subtotal</span>
                <span className="font-semibold">{formatPrice(quotedSubtotal)}</span>
              </div>
              {quotedDiscount > 0 ? (
                <div className="mt-3 flex justify-between text-sm text-[#713a35]">
                  <span>Promotion discount</span>
                  <span className="font-semibold">−{formatPrice(quotedDiscount)}</span>
                </div>
              ) : null}
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-[#321f1c]/55">Delivery</span>
                <span className="font-semibold">
                  {quotedShippingDiscount > 0 ? (
                    <span className="inline-flex items-center gap-2">
                      <span>{formatPrice(quotedDelivery)}</span>
                      <span className="text-[11px] font-normal text-[#321f1c]/35 line-through">
                        {formatPrice(deliveryCharge)}
                      </span>
                    </span>
                  ) : (
                    formatPrice(quotedDelivery)
                  )}
                </span>
              </div>
              <div className="mt-5 flex justify-between border-t border-[#713a35]/10 pt-5 text-base">
                <span className="font-semibold">Total</span>
                <span className="font-semibold">{formatPrice(quotedTotal)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void placeOrder()}
              disabled={
                !orderingEnabled ||
                !catalogSynced ||
                Boolean(catalogError) ||
                hasUnavailable ||
                submitting ||
                promotionLoading ||
                Boolean(appliedCode && promotionError)
              }
              className={`mt-6 w-full rounded-full px-6 py-4 text-sm font-semibold text-white transition ${
                orderingEnabled &&
                catalogSynced &&
                !catalogError &&
                !hasUnavailable &&
                !submitting &&
                !promotionLoading &&
                !Boolean(appliedCode && promotionError)
                  ? "bg-[#713a35] hover:-translate-y-0.5 hover:bg-[#60312d]"
                  : "cursor-not-allowed bg-[#713a35]/30"
              }`}
            >
              {submitting
                ? "Creating order…"
                : orderingEnabled && catalogSynced && !catalogError && !hasUnavailable
                  ? "Place Cash on Delivery order"
                  : "Live stock verification required"}
            </button>

            {submitError ? (
              <p
                role="alert"
                className="mt-4 rounded-[.9rem] border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-800"
              >
                {submitError}
              </p>
            ) : null}

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
              Orders are created only after this final confirmation. Online
              payment is not enabled yet.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
