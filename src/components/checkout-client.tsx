"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCatalog } from "@/components/catalog-provider";
import { ArrowIcon } from "@/components/icons";
import { ProductMedia } from "@/components/product-media";
import {
  CART_UPDATED_EVENT,
  readCart,
  type CartItem,
  writeCart,
} from "@/lib/cart";
import {
  bangladeshDistricts,
  CHECKOUT_ATTEMPT_KEY,
  CHECKOUT_DRAFT_KEY,
  CHECKOUT_DRAFT_TTL_MS,
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
import { trackStorefrontEvent } from "@/lib/analytics";
import { salePriceFor, type PromotionQuote } from "@/lib/promotions";

type FieldErrors = Partial<Record<keyof CheckoutDraft, string>>;
type DeliveryRates = Record<DeliveryZone, number>;
type OrderFailure = {
  message: string;
  code: string;
  recoverable: boolean;
  cartAction: boolean;
  uncertain: boolean;
};

const inputClass =
  "mt-2 h-12 w-full rounded-[.9rem] border border-[#713a35]/14 bg-white px-4 text-sm text-[#321f1c] outline-none transition placeholder:text-[#321f1c]/30 focus:border-[#b9725f]/60 focus:ring-2 focus:ring-[#b9725f]/10";

const textareaClass =
  "mt-2 min-h-28 w-full resize-y rounded-[.9rem] border border-[#713a35]/14 bg-white px-4 py-3 text-sm text-[#321f1c] outline-none transition placeholder:text-[#321f1c]/30 focus:border-[#b9725f]/60 focus:ring-2 focus:ring-[#b9725f]/10";

function safeDraft(value: unknown): CheckoutDraft | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<CheckoutDraft>;
  if (
    typeof input.fullName !== "string" ||
    typeof input.phone !== "string" ||
    typeof input.email !== "string" ||
    typeof input.district !== "string" ||
    typeof input.area !== "string" ||
    typeof input.address !== "string" ||
    typeof input.landmark !== "string" ||
    typeof input.notes !== "string"
  ) {
    return null;
  }

  const deliveryZone =
    input.deliveryZone === "inside-dhaka" ||
    input.deliveryZone === "outside-dhaka"
      ? input.deliveryZone
      : "";
  const paymentMethod: PaymentMethod = "COD";

  return {
    fullName: input.fullName.slice(0, 120),
    phone: input.phone.slice(0, 30),
    email: input.email.slice(0, 254),
    district: input.district.slice(0, 80),
    area: input.area.slice(0, 160),
    address: input.address.slice(0, 500),
    landmark: input.landmark.slice(0, 200),
    notes: input.notes.slice(0, 1000),
    deliveryZone,
    paymentMethod,
  };
}

function failureFor(status: number, code: string, fallback: string): OrderFailure {
  if (["OUT_OF_STOCK", "PRODUCT_UNAVAILABLE", "STOCK_CHANGED"].includes(code)) {
    return {
      message:
        fallback ||
        "Stock changed while you were checking out. Review the cart before trying again.",
      code,
      recoverable: true,
      cartAction: true,
      uncertain: false,
    };
  }

  if (code === "RATE_LIMITED") {
    return {
      message: "Too many order attempts were received. Wait a moment, then retry this checkout.",
      code,
      recoverable: true,
      cartAction: false,
      uncertain: false,
    };
  }

  if (code === "IDEMPOTENCY_CONFLICT") {
    return {
      message:
        "This checkout reference may already have been used. To avoid creating a duplicate order, do not start a new attempt from this screen.",
      code,
      recoverable: false,
      cartAction: false,
      uncertain: true,
    };
  }

  if (
    status >= 500 ||
    ["ORDER_SERVICE_UNAVAILABLE", "ORDER_CREATE_FAILED"].includes(code)
  ) {
    return {
      message:
        "We could not confirm whether the order was created. Your checkout is locked to the same reference so you can retry safely without creating a duplicate.",
      code,
      recoverable: true,
      cartAction: false,
      uncertain: true,
    };
  }

  return {
    message: fallback || "The order could not be placed. Review the checkout and try again.",
    code,
    recoverable: true,
    cartAction: false,
    uncertain: false,
  };
}

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
  const [submitFailure, setSubmitFailure] = useState<OrderFailure | null>(null);
  const [draftNotice, setDraftNotice] = useState("");
  const [storeStatusError, setStoreStatusError] = useState(false);
  const [promotionCode, setPromotionCode] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [promotionQuote, setPromotionQuote] = useState<PromotionQuote | null>(null);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [promotionError, setPromotionError] = useState("");
  const checkoutTracked = useRef(false);

  const loadStoreStatus = useCallback(async () => {
    setStoreStatusError(false);
    try {
      const response = await fetch("/api/store-status", { cache: "no-store" });
      const status = (await response.json()) as {
        orderingEnabled?: boolean;
        deliveryRates?: DeliveryRates | null;
      };
      if (!response.ok) throw new Error("Store status unavailable.");
      const rates = status.deliveryRates ?? null;
      setDeliveryRates(rates);
      setOrderingEnabled(status.orderingEnabled === true && Boolean(rates));
      setDraft((current) =>
        current.paymentMethod === "COD"
          ? current
          : { ...current, paymentMethod: "COD" },
      );
    } catch {
      setDeliveryRates(null);
      setOrderingEnabled(false);
      setStoreStatusError(true);
    } finally {
      setOrderingStatusLoaded(true);
    }
  }, []);

  useEffect(() => {
    setCartItems(readCart());

    try {
      const saved = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          savedAt?: unknown;
          draft?: unknown;
        } & Partial<CheckoutDraft>;

        if (
          typeof parsed.savedAt === "number" &&
          Date.now() - parsed.savedAt > CHECKOUT_DRAFT_TTL_MS
        ) {
          sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
          sessionStorage.removeItem(CHECKOUT_ATTEMPT_KEY);
          setDraftNotice(
            "Your previous checkout details expired for privacy and accuracy. Please enter them again.",
          );
        } else {
          const restored = safeDraft(parsed.draft ?? parsed);
          if (restored) setDraft(restored);
        }
      }
    } catch {
      try {
        sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
      } catch {
        // Checkout still works without browser storage.
      }
    }

    const syncCart = () => setCartItems(readCart());
    window.addEventListener(CART_UPDATED_EVENT, syncCart);
    window.addEventListener("storage", syncCart);

    setHydrated(true);
    void loadStoreStatus();

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, [loadStoreStatus]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(
        CHECKOUT_DRAFT_KEY,
        JSON.stringify({ savedAt: Date.now(), draft }),
      );
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

  const itemCount = rows.reduce((sum, row) => sum + row.qty, 0);
  const hasUnavailable = rows.some(
    (row) =>
      !row.liveProduct ||
      (row.liveProduct.availableStock ?? 0) < row.qty,
  );
  const subtotal = rows.reduce(
    (sum, row) =>
      sum + (row.liveProduct ? salePriceFor(row.liveProduct) * row.qty : 0),
    0,
  );
  const deliveryCharge =
    draft.deliveryZone && deliveryRates
      ? deliveryRates[draft.deliveryZone]
      : 0;
  const payableTotal = subtotal + deliveryCharge;
  const quotedSubtotal = promotionQuote?.productsSubtotal ?? subtotal;
  const quotedDiscount = promotionQuote?.discount ?? 0;
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
        items: cartItems.map((item) => ({ productId: item.productId, qty: item.qty })),
        ...(draft.deliveryZone ? { deliveryZone: draft.deliveryZone } : {}),
        code: appliedCode,
      }),
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as PromotionQuote & { error?: string };
        if (!response.ok) {
          throw new Error(result.error || "That promotion could not be applied.");
        }
        setPromotionQuote(result);
        setPromotionError("");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setPromotionQuote(null);
        if (appliedCode) {
          setPromotionError(error instanceof Error ? error.message : "That promotion could not be applied.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setPromotionLoading(false);
      });
    return () => controller.abort();
  }, [appliedCode, cartItems, catalogSynced, draft.deliveryZone, hasUnavailable]);

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

  useEffect(() => {
    if (hydrated && rows.length > 0 && !checkoutTracked.current) {
      checkoutTracked.current = true;
      trackStorefrontEvent("checkout_start", { itemCount });
    }
  }, [hydrated, itemCount, rows.length]);

  function clearAttemptReference() {
    try {
      sessionStorage.removeItem(CHECKOUT_ATTEMPT_KEY);
    } catch {
      // A fresh checkout reference can still be created in memory.
    }
  }

  function setField<K extends keyof CheckoutDraft>(
    field: K,
    value: CheckoutDraft[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitFailure(null);
    setDraftNotice("");
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
    return next;
  }

  function focusFirstError(next: FieldErrors) {
    const field = Object.keys(next)[0] as keyof CheckoutDraft | undefined;
    if (!field) return;
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-checkout-field="${field}"]`)?.focus();
    });
  }

  function reviewOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitFailure(null);

    if (!orderingStatusLoaded || !orderingEnabled || !deliveryRates) {
      setSubmitFailure({
        message: "Checkout is not ready yet. Refresh the delivery and ordering status, then try again.",
        code: "STORE_STATUS_UNAVAILABLE",
        recoverable: true,
        cartAction: false,
        uncertain: false,
      });
      return;
    }

    if (!catalogSynced || catalogError || hasUnavailable) {
      setSubmitFailure({
        message:
          "Live stock changed or could not be verified. Review the current cart before continuing.",
        code: "STOCK_CHANGED",
        recoverable: true,
        cartAction: true,
        uncertain: false,
      });
      return;
    }

    const next = validate();
    if (Object.keys(next).length > 0) {
      focusFirstError(next);
      return;
    }

    clearAttemptReference();
    setDraft((current) => ({
      ...current,
      phone: normalizeBangladeshPhone(current.phone),
    }));
    trackStorefrontEvent("checkout_review", {
      itemCount,
      deliveryZone: draft.deliveryZone || undefined,
      paymentMethod: "COD",
      totalBdt: quotedTotal,
    });
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
    setSubmitFailure(null);

    let externalOrderId = "";
    try {
      externalOrderId = sessionStorage.getItem(CHECKOUT_ATTEMPT_KEY) || "";
      if (!externalOrderId) {
        externalOrderId = crypto.randomUUID();
        sessionStorage.setItem(CHECKOUT_ATTEMPT_KEY, externalOrderId);
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
        deliveryCharge?: number;
        total?: number;
        savings?: number;
        error?: string;
        code?: string;
      };

      if (!response.ok || !result.orderNumber) {
        const failure = failureFor(
          response.status,
          result.code || "ORDER_FAILED",
          result.error || "",
        );
        setSubmitFailure(failure);

        if (!failure.uncertain) {
          clearAttemptReference();
        }

        if (failure.cartAction) {
          await refreshCatalog();
        }
        return;
      }

      const finalDeliveryCharge =
        typeof result.deliveryCharge === "number" &&
        Number.isFinite(result.deliveryCharge)
          ? result.deliveryCharge
          : quotedDelivery;
      const finalTotal =
        typeof result.total === "number" && Number.isFinite(result.total)
          ? result.total
          : quotedTotal;

      trackStorefrontEvent("order_created", {
        itemCount,
        deliveryZone: draft.deliveryZone || undefined,
        paymentMethod: "COD",
        totalBdt: finalTotal,
      });

      writeCart([]);
      setCartItems([]);

      try {
        sessionStorage.setItem(
          "aloyri_last_order_confirmation",
          JSON.stringify({
            savedAt: Date.now(),
            orderNumber: result.orderNumber,
            itemCount,
            deliveryZone: draft.deliveryZone,
            deliveryCharge: finalDeliveryCharge,
            total: finalTotal,
            paymentMethod: "COD",
          }),
        );
        sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
        sessionStorage.removeItem(CHECKOUT_ATTEMPT_KEY);
      } catch {
        // Confirmation can continue without browser storage.
      }

      router.push(
        `/order-confirmation?order=${encodeURIComponent(result.orderNumber)}`,
      );
    } catch {
      setSubmitFailure(
        failureFor(
          503,
          "ORDER_SERVICE_UNAVAILABLE",
          "The order service is temporarily unavailable.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function editDetails() {
    if (submitFailure?.uncertain) return;
    clearAttemptReference();
    setSubmitFailure(null);
    setStep("details");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
          Checkout continues only after Aloyri confirms current prices and
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
          One or more products are unavailable or the selected quantity is now
          higher than current availability.
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

  const zoneLabel = draft.deliveryZone
    ? deliveryZoneLabels[draft.deliveryZone]
    : "Not selected";

  return (
    <main className="shell pb-32 pt-8 md:pb-16 md:pt-12">
      <nav aria-label="Checkout progress" className="mb-8">
        <ol className="grid grid-cols-3 gap-2 rounded-[1.2rem] border border-[#713a35]/10 bg-white/55 p-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] sm:max-w-xl">
          <li>
            <Link
              href="/cart"
              className="block rounded-[.8rem] px-3 py-2.5 text-[#713a35]"
            >
              ✓ Cart
            </Link>
          </li>
          <li
            aria-current={step === "details" ? "step" : undefined}
            className={
              step === "details"
                ? "rounded-[.8rem] bg-[#713a35] px-3 py-2.5 text-white"
                : "rounded-[.8rem] px-3 py-2.5 text-[#713a35]"
            }
          >
            {step === "review" ? "✓ " : ""}Delivery
          </li>
          <li
            aria-current={step === "review" ? "step" : undefined}
            className={
              step === "review"
                ? "rounded-[.8rem] bg-[#713a35] px-3 py-2.5 text-white"
                : "rounded-[.8rem] px-3 py-2.5 text-[#321f1c]/35"
            }
          >
            Review
          </li>
        </ol>
      </nav>

      <div className="mb-9 flex flex-col gap-4 border-b border-[#713a35]/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/48">
            Secure Aloyri checkout
          </p>
          <h1 className="display mt-3 text-5xl sm:text-6xl">
            {step === "details" ? "Delivery details." : "Review everything."}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[#321f1c]/48">
            {step === "details"
              ? "Your cart is live-stock checked. Add the delivery details, then review the final total before placing the order."
              : "Nothing is charged online. Check the customer, address, products and Cash on Delivery total before the final confirmation."}
          </p>
        </div>
        <div className="rounded-full bg-[#f5e8e2] px-4 py-2 text-xs font-semibold text-[#713a35]">
          {itemCount} {itemCount === 1 ? "item" : "items"} · {formatPrice(payableTotal)}
        </div>
      </div>

      {draftNotice ? (
        <p
          role="status"
          className="mb-6 rounded-[1rem] border border-[#713a35]/10 bg-[#f5e8e2] px-4 py-3 text-xs leading-6 text-[#321f1c]/58"
        >
          {draftNotice}
        </p>
      ) : null}

      {step === "details" ? (
        <form
          id="checkout-details-form"
          onSubmit={reviewOrder}
          className="grid gap-8 lg:grid-cols-[1fr_390px] lg:gap-12"
          noValidate
        >
          <div className="space-y-6">
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
                    data-checkout-field="fullName"
                    value={draft.fullName}
                    onChange={(event) => setField("fullName", event.target.value)}
                    className={inputClass}
                    placeholder="Customer name"
                    autoComplete="name"
                    aria-invalid={Boolean(errors.fullName)}
                    aria-describedby={errors.fullName ? "fullName-error" : undefined}
                  />
                  {errors.fullName ? (
                    <span id="fullName-error" className="mt-2 block text-xs text-red-700">
                      {errors.fullName}
                    </span>
                  ) : null}
                </label>

                <label className="text-sm font-medium">
                  Mobile number
                  <input
                    data-checkout-field="phone"
                    value={draft.phone}
                    onChange={(event) => setField("phone", event.target.value)}
                    className={inputClass}
                    placeholder="01XXXXXXXXX"
                    inputMode="tel"
                    autoComplete="tel"
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? "phone-error" : "phone-help"}
                  />
                  {errors.phone ? (
                    <span id="phone-error" className="mt-2 block text-xs text-red-700">
                      {errors.phone}
                    </span>
                  ) : (
                    <span id="phone-help" className="mt-2 block text-xs font-normal text-[#321f1c]/40">
                      Used to verify tracking and return requests.
                    </span>
                  )}
                </label>
              </div>

              <label className="mt-5 block text-sm font-medium">
                Email <span className="font-normal text-[#321f1c]/38">(optional)</span>
                <input
                  data-checkout-field="email"
                  value={draft.email}
                  onChange={(event) => setField("email", event.target.value)}
                  className={inputClass}
                  placeholder="name@example.com"
                  inputMode="email"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : "email-help"}
                />
                {errors.email ? (
                  <span id="email-error" className="mt-2 block text-xs text-red-700">
                    {errors.email}
                  </span>
                ) : (
                  <span id="email-help" className="mt-2 block text-xs font-normal leading-5 text-[#321f1c]/40">
                    Reserved for transactional order updates when branded email delivery is available.
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

              <fieldset>
                <legend className="text-sm font-medium">Delivery zone</legend>
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
                        data-checkout-field={
                          value === "inside-dhaka" ? "deliveryZone" : undefined
                        }
                        aria-pressed={active}
                        onClick={() => setField("deliveryZone", value)}
                        className={`min-h-20 rounded-[1rem] border p-4 text-left transition ${
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
                  <span className="mt-2 block text-xs text-red-700">
                    {errors.deliveryZone}
                  </span>
                ) : null}
              </fieldset>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  District
                  <select
                    data-checkout-field="district"
                    value={draft.district}
                    onChange={(event) => setField("district", event.target.value)}
                    className={inputClass}
                    autoComplete="address-level1"
                    aria-invalid={Boolean(errors.district)}
                    aria-describedby={errors.district ? "district-error" : undefined}
                  >
                    <option value="">Select district</option>
                    {bangladeshDistricts.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                  {errors.district ? (
                    <span id="district-error" className="mt-2 block text-xs text-red-700">
                      {errors.district}
                    </span>
                  ) : null}
                </label>

                <label className="text-sm font-medium">
                  Area / thana / upazila
                  <input
                    data-checkout-field="area"
                    value={draft.area}
                    onChange={(event) => setField("area", event.target.value)}
                    className={inputClass}
                    placeholder="Area or thana"
                    autoComplete="address-level2"
                    aria-invalid={Boolean(errors.area)}
                    aria-describedby={errors.area ? "area-error" : undefined}
                  />
                  {errors.area ? (
                    <span id="area-error" className="mt-2 block text-xs text-red-700">
                      {errors.area}
                    </span>
                  ) : null}
                </label>
              </div>

              <label className="mt-5 block text-sm font-medium">
                Full delivery address
                <textarea
                  data-checkout-field="address"
                  value={draft.address}
                  onChange={(event) => setField("address", event.target.value)}
                  className={textareaClass}
                  placeholder="House / road / building / village and delivery details"
                  autoComplete="street-address"
                  aria-invalid={Boolean(errors.address)}
                  aria-describedby={errors.address ? "address-error" : undefined}
                />
                {errors.address ? (
                  <span id="address-error" className="mt-2 block text-xs text-red-700">
                    {errors.address}
                  </span>
                ) : null}
              </label>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Landmark <span className="font-normal text-[#321f1c]/38">(optional)</span>
                  <input
                    value={draft.landmark}
                    onChange={(event) => setField("landmark", event.target.value)}
                    className={inputClass}
                    placeholder="Nearby landmark"
                  />
                </label>

                <label className="text-sm font-medium">
                  Delivery note <span className="font-normal text-[#321f1c]/38">(optional)</span>
                  <input
                    value={draft.notes}
                    onChange={(event) => setField("notes", event.target.value)}
                    className={inputClass}
                    placeholder="Useful delivery instruction"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-[#713a35]/10 bg-white/60 p-5 sm:p-7">
              <div className="mb-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
                  Payment
                </p>
                <h2 className="display mt-2 text-3xl">How will you pay?</h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {(["COD", "bKash", "Nagad"] as PaymentMethod[]).map((value) => {
                  const active = draft.paymentMethod === value;
                  const enabled = value === "COD";
                  return (
                    <button
                      key={value}
                      type="button"
                      data-checkout-field={value === "COD" ? "paymentMethod" : undefined}
                      aria-pressed={active}
                      onClick={() => enabled && setField("paymentMethod", value)}
                      disabled={!enabled}
                      className={`min-h-20 rounded-[1rem] border p-4 text-left transition ${
                        active && enabled
                          ? "border-[#713a35] bg-[#f7ebe6]"
                          : "border-[#713a35]/10 bg-white"
                      } disabled:cursor-not-allowed disabled:opacity-45`}
                    >
                      <span className="block text-sm font-semibold">
                        {paymentMethodLabels[value]}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[#321f1c]/45">
                        {value === "COD"
                          ? "Pay the courier when the parcel arrives."
                          : "Coming later"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 rounded-[.9rem] bg-[#f5e8e2] p-3 text-xs leading-6 text-[#321f1c]/52">
                No card, bKash or Nagad payment is collected on this website yet.
              </p>
            </section>
          </div>

          <aside className="h-fit rounded-[1.5rem] border border-[#713a35]/10 bg-[#f5e8e2] p-5 sm:p-6 lg:sticky lg:top-32">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
                Order summary
              </p>
              <span className="text-[10px] text-[#321f1c]/38">
                Live stock verified
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {rows.map((row) => (
                <div key={row.productId} className="grid grid-cols-[52px_1fr_auto] items-center gap-3">
                  {row.product ? (
                    <ProductMedia product={row.product} className="aspect-[4/5] rounded-[.8rem]" />
                  ) : (
                    <div className="aspect-[4/5] rounded-[.8rem] bg-white" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{row.product?.name || "Product"}</p>
                    <p className="mt-1 text-[10px] text-[#321f1c]/42">Qty {row.qty}</p>
                  </div>
                  <p className="text-xs font-semibold">
                    {formatPrice(row.liveProduct ? salePriceFor(row.liveProduct) * row.qty : 0)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1rem] border border-[#713a35]/10 bg-white/65 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#713a35]/48">Promotion</p>
                  <p className="mt-1 text-xs text-[#321f1c]/45">Add a code, or eligible automatic offers apply by themselves.</p>
                </div>
                {promotionLoading ? <span className="text-[10px] uppercase tracking-[0.12em] text-[#321f1c]/38">Checking…</span> : null}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={promotionCode}
                  onChange={(event) => { setPromotionCode(event.target.value.toUpperCase()); setPromotionError(""); }}
                  onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); applyPromotionCode(); } }}
                  aria-label="Promotion code"
                  placeholder="Promotion code"
                  maxLength={40}
                  className="h-11 min-w-0 flex-1 rounded-full border border-[#713a35]/14 bg-white px-4 text-sm uppercase tracking-[0.08em] outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-[#321f1c]/30 focus:border-[#b9725f]/60"
                />
                <button type="button" onClick={applyPromotionCode} disabled={promotionLoading}
                  className="rounded-full bg-[#713a35] px-4 text-xs font-semibold text-white disabled:opacity-50">
                  Apply
                </button>
              </div>
              {promotionError ? <p role="alert" aria-live="polite" className="mt-2 text-xs leading-5 text-red-700">{promotionError}</p> : null}
              {activePromotion ? (
                <div className="mt-3 flex items-start justify-between gap-3 rounded-[.8rem] bg-[#f7ebe6] p-3">
                  <div>
                    <p className="text-xs font-semibold text-[#713a35]">{activePromotion.badgeText || activePromotion.name}</p>
                    <p className="mt-1 text-[11px] leading-5 text-[#321f1c]/48">
                      {promotionQuote?.savings ? `${formatPrice(promotionQuote.savings)} saved on this order.` : "Promotion applied."}
                    </p>
                  </div>
                  {appliedCode ? (
                    <button type="button" onClick={removePromotionCode}
                      className="text-[11px] font-semibold text-[#713a35] underline decoration-[#713a35]/25 underline-offset-4">
                      Remove
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-6 border-t border-[#713a35]/10 pt-5 text-sm">
              <div className="flex justify-between py-1.5">
                <span className="text-[#321f1c]/55">Products</span>
                <span>{formatPrice(quotedSubtotal)}</span>
              </div>
              {quotedDiscount > 0 ? (
                <div className="flex justify-between py-1.5 text-[#713a35]">
                  <span>Promotion discount</span>
                  <span>−{formatPrice(quotedDiscount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between py-1.5">
                <span className="text-[#321f1c]/55">Delivery</span>
                <span>{draft.deliveryZone ? formatPrice(quotedDelivery) : "Choose zone"}</span>
              </div>
              <div className="mt-3 flex justify-between border-t border-[#713a35]/10 pt-4 text-base font-semibold">
                <span>Total</span>
                <span>{formatPrice(quotedTotal)}</span>
              </div>
            </div>

            {!orderingStatusLoaded ? (
              <p className="mt-5 rounded-[.9rem] bg-white/60 p-3 text-xs leading-5 text-[#321f1c]/48">
                Checking ordering and delivery configuration…
              </p>
            ) : storeStatusError || !orderingEnabled ? (
              <div className="mt-5 rounded-[.9rem] border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                <p>Checkout configuration could not be verified.</p>
                <button
                  type="button"
                  onClick={() => void loadStoreStatus()}
                  className="mt-2 font-semibold underline underline-offset-4"
                >
                  Try again
                </button>
              </div>
            ) : null}

            {submitFailure ? (
              <CheckoutFailure
                failure={submitFailure}
                onRetryStore={() => void loadStoreStatus()}
              />
            ) : null}

            <button
              type="submit"
              disabled={!orderingStatusLoaded || !orderingEnabled}
              className="mt-6 hidden w-full items-center justify-center gap-3 rounded-full bg-[#713a35] px-6 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-[#713a35]/30 lg:inline-flex"
            >
              Continue to review <ArrowIcon />
            </button>

            <p className="mt-4 text-center text-[10px] leading-5 text-[#321f1c]/38">
              Final price, stock and delivery charge are validated again when the order is created.
            </p>
          </aside>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#713a35]/10 bg-[#fffaf7]/96 p-3 backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-xl items-center gap-3">
              <div className="min-w-0 flex-1 pl-1">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[#321f1c]/40">Estimated total</p>
                <p className="font-semibold">{formatPrice(quotedTotal)}</p>
              </div>
              <button
                type="submit"
                disabled={!orderingStatusLoaded || !orderingEnabled}
                className="min-h-12 rounded-full bg-[#713a35] px-6 text-sm font-semibold text-white disabled:bg-[#713a35]/30"
              >
                Review order
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_390px] lg:gap-12">
          <div className="space-y-5">
            <section className="rounded-[1.5rem] border border-[#713a35]/10 bg-white/65 p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
                    Customer
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">{draft.fullName.trim()}</h2>
                  <p className="mt-1 text-sm text-[#321f1c]/52">{normalizeBangladeshPhone(draft.phone)}</p>
                  {draft.email.trim() ? (
                    <p className="mt-1 text-sm text-[#321f1c]/52">{draft.email.trim().toLowerCase()}</p>
                  ) : null}
                </div>
                {!submitFailure?.uncertain ? (
                  <button
                    type="button"
                    onClick={editDetails}
                    className="text-xs font-semibold text-[#713a35] underline underline-offset-4"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-[#713a35]/10 bg-white/65 p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
                    Delivery
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">{zoneLabel}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-[#321f1c]/55">
                    {draft.address.trim()}
                    <br />
                    {draft.area.trim()}, {draft.district}
                    {draft.landmark.trim() ? (
                      <>
                        <br />
                        Landmark: {draft.landmark.trim()}
                      </>
                    ) : null}
                  </p>
                  {draft.notes.trim() ? (
                    <p className="mt-3 rounded-[.8rem] bg-[#f5e8e2] p-3 text-xs leading-6 text-[#321f1c]/52">
                      Delivery note: {draft.notes.trim()}
                    </p>
                  ) : null}
                </div>
                {!submitFailure?.uncertain ? (
                  <button
                    type="button"
                    onClick={editDetails}
                    className="text-xs font-semibold text-[#713a35] underline underline-offset-4"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-[#713a35]/10 bg-white/65 p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
                    Payment
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">Cash on Delivery</h2>
                  <p className="mt-1 text-sm text-[#321f1c]/52">
                    Pay {formatPrice(quotedTotal)} to the courier when the parcel is delivered.
                  </p>
                </div>
                <span className="rounded-full bg-[#f5e8e2] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#713a35]">
                  No online charge
                </span>
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-[#713a35]/10 bg-white/65 p-5 sm:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
                Products
              </p>
              <div className="mt-5 divide-y divide-[#713a35]/10">
                {rows.map((row) => (
                  <div key={row.productId} className="grid grid-cols-[64px_1fr_auto] items-center gap-4 py-4 first:pt-0 last:pb-0">
                    {row.product ? (
                      <ProductMedia product={row.product} className="aspect-[4/5] rounded-[.9rem]" />
                    ) : (
                      <div className="aspect-[4/5] rounded-[.9rem] bg-[#f5e8e2]" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{row.product?.name || "Product"}</p>
                      <p className="mt-1 text-[10px] text-[#321f1c]/42">
                        {row.product?.brand || "Aloyri"} · Qty {row.qty}
                      </p>
                    </div>
                    <p className="text-xs font-semibold">
                      {formatPrice((row.liveProduct?.price || 0) * row.qty)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-[1.5rem] border border-[#713a35]/10 bg-[#f5e8e2] p-5 sm:p-6 lg:sticky lg:top-32">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
              Final total
            </p>

            <div className="mt-5 text-sm">
              <div className="flex justify-between py-2">
                <span className="text-[#321f1c]/55">Products</span>
                <span>{formatPrice(quotedSubtotal)}</span>
              </div>
              {quotedDiscount > 0 ? (
                <div className="flex justify-between py-2 text-[#713a35]">
                  <span>Promotion discount</span>
                  <span>−{formatPrice(quotedDiscount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between py-2">
                <span className="text-[#321f1c]/55">Delivery · {zoneLabel}</span>
                <span>{formatPrice(quotedDelivery)}</span>
              </div>
              {activePromotion ? (
                <div className="my-3 rounded-[.8rem] bg-white/60 p-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-[#713a35]">{activePromotion.badgeText || activePromotion.name}</span>
                    <span className="font-semibold text-[#713a35]">Save {formatPrice(promotionQuote?.savings ?? 0)}</span>
                  </div>
                </div>
              ) : null}
              <div className="mt-3 flex justify-between border-t border-[#713a35]/10 pt-5 text-lg font-semibold">
                <span>Cash due</span>
                <span>{formatPrice(quotedTotal)}</span>
              </div>
            </div>

            <div className="mt-5 rounded-[.9rem] bg-white/65 p-4 text-xs leading-6 text-[#321f1c]/52">
              By placing the order, you confirm the delivery details above and request Aloyri to create a Cash on Delivery order. You can review the{" "}
              <Link href="/terms" className="font-semibold text-[#713a35] underline underline-offset-4">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/returns-refunds" className="font-semibold text-[#713a35] underline underline-offset-4">
                Returns & Refunds
              </Link>
              .
            </div>

            {submitFailure ? (
              <CheckoutFailure
                failure={submitFailure}
                onRetryStore={() => void loadStoreStatus()}
              />
            ) : null}

            <button
              type="button"
              onClick={() => void placeOrder()}
              disabled={
                submitting ||
                promotionLoading ||
                Boolean(appliedCode && promotionError) ||
                !orderingEnabled ||
                Boolean(submitFailure && !submitFailure.recoverable)
              }
              className="mt-6 hidden w-full items-center justify-center rounded-full bg-[#713a35] px-6 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-[#713a35]/30 lg:inline-flex"
            >
              {submitting
                ? "Placing order…"
                : submitFailure?.uncertain
                  ? "Retry same checkout safely"
                  : `Place COD order · ${formatPrice(quotedTotal)}`}
            </button>

            {!submitFailure?.uncertain ? (
              <button
                type="button"
                onClick={editDetails}
                disabled={submitting}
                className="mt-3 hidden w-full rounded-full border border-[#713a35]/14 bg-white/60 px-6 py-3.5 text-sm font-semibold text-[#713a35] disabled:opacity-50 lg:block"
              >
                Edit checkout details
              </button>
            ) : (
              <p className="mt-4 text-center text-[10px] leading-5 text-[#321f1c]/45">
                Editing is temporarily locked because the previous attempt has an uncertain result. Retry the same checkout reference first.
              </p>
            )}

            <p className="mt-4 text-center text-[10px] leading-5 text-[#321f1c]/38">
              Repeated clicks use the same checkout reference, helping prevent duplicate orders.
            </p>
          </aside>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#713a35]/10 bg-[#fffaf7]/96 p-3 backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-xl items-center gap-3">
              {!submitFailure?.uncertain ? (
                <button
                  type="button"
                  onClick={editDetails}
                  disabled={submitting}
                  className="min-h-12 rounded-full border border-[#713a35]/15 bg-white px-4 text-sm font-semibold text-[#713a35]"
                >
                  Edit
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void placeOrder()}
                disabled={
                submitting ||
                promotionLoading ||
                Boolean(appliedCode && promotionError) ||
                !orderingEnabled ||
                Boolean(submitFailure && !submitFailure.recoverable)
              }
                className="min-h-12 flex-1 rounded-full bg-[#713a35] px-5 text-sm font-semibold text-white disabled:bg-[#713a35]/30"
              >
                {submitting
                  ? "Placing order…"
                  : submitFailure?.uncertain
                    ? "Retry same checkout safely"
                    : `Place COD · ${formatPrice(quotedTotal)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function CheckoutFailure({
  failure,
  onRetryStore,
}: {
  failure: OrderFailure;
  onRetryStore: () => void;
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mt-5 rounded-[.9rem] border border-red-200 bg-red-50 p-4 text-xs leading-6 text-red-800"
    >
      <p className="font-semibold">
        {failure.uncertain ? "Order confirmation interrupted" : "Checkout needs attention"}
      </p>
      <p className="mt-1">{failure.message}</p>
      {failure.cartAction ? (
        <Link
          href="/cart"
          className="mt-3 inline-flex font-semibold underline underline-offset-4"
        >
          Review cart
        </Link>
      ) : failure.code === "STORE_STATUS_UNAVAILABLE" ? (
        <button
          type="button"
          onClick={onRetryStore}
          className="mt-3 font-semibold underline underline-offset-4"
        >
          Refresh checkout status
        </button>
      ) : !failure.recoverable ? (
        <Link
          href="/customer-care"
          className="mt-3 inline-flex font-semibold underline underline-offset-4"
        >
          Open customer care
        </Link>
      ) : null}
    </div>
  );
}
