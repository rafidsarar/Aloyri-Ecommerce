"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import { useCatalog } from "@/components/catalog-provider";
import { trackStorefrontEvent } from "@/lib/analytics";
import { readCart, writeCart } from "@/lib/cart";
import { formatPrice } from "@/lib/catalog";
import {
  isValidBangladeshPhone,
  normalizeBangladeshPhone,
} from "@/lib/checkout";
import {
  customerOrdersServerSnapshot,
  customerOrdersSnapshot,
  forgetCustomerOrder,
  readCustomerOrders,
  rememberCustomerOrder,
  subscribeCustomerOrders,
} from "@/lib/customer-orders";
import type {
  PostPurchaseBatchResponse,
  PostPurchaseOrderResult,
  PostPurchaseProduct,
  PostPurchaseSuggestion,
} from "@/lib/post-purchase-types";

function dateLabel(value: string) {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value + "T12:00:00Z"
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-BD", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function statusClass(status: string) {
  if (status === "Delivered") return "bg-emerald-50 text-emerald-700";
  if (status === "Returned") return "bg-amber-50 text-amber-700";
  if (status === "Cancelled") return "bg-red-50 text-red-700";
  return "bg-[#f5e8e2] text-[#713a35]";
}

function replenishmentCopy(product: PostPurchaseProduct) {
  const estimate = product.replenishment;
  if (!estimate) return "";
  if (estimate.status === "due") {
    return "Estimated reorder window has arrived.";
  }
  if (estimate.status === "soon") {
    return (
      "Likely reorder window: " +
      dateLabel(estimate.estimatedFrom) +
      " – " +
      dateLabel(estimate.estimatedTo)
    );
  }
  return "Estimated reorder from " + dateLabel(estimate.estimatedFrom);
}

export function PostPurchaseOrders() {
  const {
    products: liveProducts,
    synced: catalogSynced,
  } = useCatalog();
  useSyncExternalStore(
    subscribeCustomerOrders,
    customerOrdersSnapshot,
    customerOrdersServerSnapshot,
  );

  const storedOrders = readCustomerOrders();
  const orderKey = storedOrders
    .slice(0, 8)
    .map((order) => order.orderNumber + ":" + order.phone)
    .join("|");
  const [results, setResults] = useState<PostPurchaseOrderResult[]>([]);
  const [refreshing, setRefreshing] = useState(Boolean(orderKey));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [adding, setAdding] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    const orders = readCustomerOrders().slice(0, 8);
    if (!orders.length) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setRefreshing(true);
      setError("");
      void fetch("/api/post-purchase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "omit",
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({
          orders: orders.map((order) => ({
            orderNumber: order.orderNumber,
            phone: order.phone,
          })),
        }),
      })
        .then(async (response) => {
          const body = (await response.json()) as PostPurchaseBatchResponse & {
            error?: string;
          };
          if (!response.ok) {
            throw new Error(body.error || "Unable to refresh recent orders.");
          }
          setResults(body.results || []);
          const successful = (body.results || []).filter(
            (row): row is Extract<PostPurchaseOrderResult, { ok: true }> => row.ok,
          );
          if (successful.length) {
            trackStorefrontEvent("post_purchase_view", {
              itemCount: successful.reduce(
                (sum, row) =>
                  sum + row.order.items.reduce((count, item) => count + item.qty, 0),
                0,
              ),
            });
          }
        })
        .catch((reason: unknown) => {
          if (controller.signal.aborted) return;
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to refresh recent orders.",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setRefreshing(false);
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [orderKey, refreshNonce]);

  const successful = results.filter(
    (row): row is Extract<PostPurchaseOrderResult, { ok: true }> => row.ok,
  );
  const purchasedIds = new Set(
    successful.flatMap((row) => row.products.map((product) => product.productId)),
  );
  const suggestions = successful
    .flatMap((row) => row.suggestions)
    .filter(
      (suggestion, index, all) =>
        !purchasedIds.has(suggestion.productId) &&
        all.findIndex((item) => item.productId === suggestion.productId) === index,
    )
    .slice(0, 3);

  function addProducts(products: PostPurchaseProduct[]) {
    if (!catalogSynced) {
      setNotice("Live stock is still loading. Try again in a moment.");
      return;
    }

    const current = readCart();
    const next = [...current];
    let added = 0;

    for (const ordered of products) {
      const live = liveProducts.find((product) => product.id === ordered.productId);
      if (!live || (live.availableStock ?? 0) <= 0) continue;
      const existing = next.find((item) => item.productId === live.id);
      const currentQty = existing?.qty || 0;
      const targetQty = Math.min(
        live.availableStock ?? 0,
        currentQty + Math.max(1, ordered.qty),
      );
      if (targetQty <= currentQty) continue;
      if (existing) existing.qty = targetQty;
      else next.push({ productId: live.id, qty: targetQty });
      added += targetQty - currentQty;
    }

    if (!added) {
      setNotice("None of these products are currently available to reorder.");
      return;
    }

    writeCart(next);
    trackStorefrontEvent("reorder_add_to_cart", {
      itemCount: next.reduce((sum, item) => sum + item.qty, 0),
    });
    setNotice(
      added + (added === 1 ? " item added" : " items added") + " to your cart.",
    );
  }

  async function addPastOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const orderNumber = String(form.get("orderNumber") || "").trim().toUpperCase();
    const phone = String(form.get("phone") || "").trim();

    if (!/^WEB-[A-Z0-9-]{8,90}$/.test(orderNumber) || !isValidBangladeshPhone(phone)) {
      setError("Enter a website order number and the mobile number used at checkout.");
      return;
    }

    setAdding(true);
    try {
      const normalizedPhone = normalizeBangladeshPhone(phone);
      const response = await fetch("/api/post-purchase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "omit",
        cache: "no-store",
        body: JSON.stringify({
          orders: [{ orderNumber, phone: normalizedPhone }],
        }),
      });
      const body = (await response.json()) as PostPurchaseBatchResponse & {
        error?: string;
      };
      const row = body.results?.[0];
      if (!response.ok || !row || !row.ok) {
        setError(
          !row || row.ok
            ? body.error || "Unable to verify this order."
            : row.error,
        );
        return;
      }

      rememberCustomerOrder({
        orderNumber: row.order.orderNumber,
        phone: normalizedPhone,
        createdAt: row.order.created,
        items: row.products.map((product) => ({
          productId: product.productId,
          qty: product.qty,
        })),
        total: row.order.total,
      });
      setNotice("Order added to this device.");
      event.currentTarget.reset();
    } catch {
      setError("Order verification is temporarily unavailable.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <section className="mt-6 rounded-[1.5rem] border border-[#713a35]/10 bg-white/70 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#713a35]/45">
            Post-purchase
          </p>
          <h2 className="display mt-2 text-4xl">Recent orders & routine.</h2>
          <p className="mt-3 max-w-2xl text-xs leading-6 text-[#321f1c]/48">
            Order credentials stay on this device. Each refresh is verified live against Aloyri CRM before status, reorder, review or replenishment guidance is shown.
          </p>
        </div>
        <button
          type="button"
          disabled={refreshing || !storedOrders.length}
          onClick={() => setRefreshNonce((value) => value + 1)}
          className="rounded-full border border-[#713a35]/14 px-4 py-2 text-xs font-semibold text-[#713a35] disabled:opacity-35"
        >
          {refreshing ? "Refreshing…" : "Refresh orders"}
        </button>
      </div>

      {notice ? (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-800" aria-live="polite">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4">
        {successful.map((row) => (
          <article
            key={row.order.orderNumber}
            className="rounded-[1.2rem] border border-[#713a35]/10 bg-[#fffaf7] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#713a35]/45">
                  {row.order.orderNumber}
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {dateLabel(row.order.created)} · {formatPrice(row.order.total)}
                </p>
              </div>
              <span className={"rounded-full px-3 py-1.5 text-xs font-semibold " + statusClass(row.order.status)}>
                {row.order.status}
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              {row.order.items.map((item, index) => {
                const product = row.products.find(
                  (candidate) =>
                    candidate.name === item.name &&
                    candidate.brand === item.brand,
                );
                return (
                  <div
                    key={item.name + index}
                    className="grid gap-3 border-t border-[#713a35]/8 pt-4 sm:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="mt-1 text-xs text-[#321f1c]/45">
                        {item.brand}{item.size ? " · " + item.size : ""} · Qty {item.qty}
                      </p>
                      {product?.replenishment ? (
                        <p className="mt-2 text-xs font-medium text-[#713a35]">
                          {replenishmentCopy(product)}
                        </p>
                      ) : null}
                    </div>
                    {product?.reviewEligible ? (
                      <Link
                        href={"/product/" + product.slug + "#reviews"}
                        className="h-fit text-xs font-semibold text-[#713a35] underline decoration-[#713a35]/20 underline-offset-4"
                      >
                        Write a verified review
                      </Link>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {!row.catalogAvailable ? (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Live catalog is temporarily unavailable, so reorder and routine recommendations are hidden until current stock can be verified.
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={"/track-order?order=" + encodeURIComponent(row.order.orderNumber)}
                className="rounded-full border border-[#713a35]/14 px-4 py-2.5 text-xs font-semibold text-[#713a35]"
              >
                Full tracking
              </Link>
              {row.products.length ? (
                <button
                  type="button"
                  onClick={() => addProducts(row.products)}
                  className="rounded-full bg-[#713a35] px-4 py-2.5 text-xs font-semibold text-white"
                >
                  Buy again
                </button>
              ) : null}
              {["Delivered", "Returned"].includes(row.order.status) ? (
                <Link
                  href={"/return-request?order=" + encodeURIComponent(row.order.orderNumber)}
                  className="rounded-full border border-[#713a35]/14 px-4 py-2.5 text-xs font-semibold text-[#713a35]"
                >
                  Return / refund review
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => forgetCustomerOrder(row.order.orderNumber)}
                className="px-2 py-2.5 text-xs font-semibold text-[#321f1c]/42"
              >
                Remove from this device
              </button>
            </div>
          </article>
        ))}

        {results
          .filter((row): row is Extract<PostPurchaseOrderResult, { ok: false }> => !row.ok)
          .map((row) => (
            <div key={row.orderNumber} className="rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-semibold">{row.orderNumber}</p>
              <p className="mt-1 text-xs leading-5 text-red-800">{row.error}</p>
              <button
                type="button"
                onClick={() => forgetCustomerOrder(row.orderNumber)}
                className="mt-3 text-xs font-semibold text-red-800"
              >
                Remove from this device
              </button>
            </div>
          ))}
      </div>

      {!storedOrders.length ? (
        <div className="mt-6 rounded-[1.2rem] border border-dashed border-[#713a35]/15 p-6 text-center">
          <p className="text-sm font-semibold">No recent orders saved on this device yet.</p>
          <p className="mt-2 text-xs leading-6 text-[#321f1c]/45">
            New website orders will appear here automatically after checkout.
          </p>
        </div>
      ) : null}

      {suggestions.length ? (
        <div className="mt-7 border-t border-[#713a35]/10 pt-6">
          <p className="text-sm font-semibold">Complete your routine</p>
          <p className="mt-1 text-xs text-[#321f1c]/45">
            Current in-stock suggestions avoid products already detected in your recent orders.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {suggestions.map((product: PostPurchaseSuggestion) => (
              <Link
                key={product.productId}
                href={"/product/" + product.slug}
                onClick={() =>
                  trackStorefrontEvent("routine_recommendation_click", {
                    productId: product.productId,
                  })
                }
                className="rounded-xl border border-[#713a35]/10 bg-[#f5e8e2] p-4"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#713a35]/45">
                  {product.category}
                </p>
                <p className="mt-2 text-sm font-semibold">{product.name}</p>
                <p className="mt-1 text-xs text-[#321f1c]/45">{product.brand}</p>
                <p className="mt-3 text-sm font-semibold">
                  {formatPrice(product.salePrice ?? product.price)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <form onSubmit={addPastOrder} className="mt-7 grid gap-3 border-t border-[#713a35]/10 pt-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-xs font-medium">
          Add an older website order
          <input
            name="orderNumber"
            placeholder="WEB-..."
            autoComplete="off"
            className="mt-2 h-11 w-full rounded-xl border border-[#713a35]/12 bg-white px-3 text-sm uppercase"
          />
        </label>
        <label className="text-xs font-medium">
          Checkout mobile number
          <input
            name="phone"
            placeholder="01XXXXXXXXX"
            inputMode="tel"
            autoComplete="tel"
            className="mt-2 h-11 w-full rounded-xl border border-[#713a35]/12 bg-white px-3 text-sm"
          />
        </label>
        <button
          disabled={adding}
          className="h-11 rounded-full bg-[#713a35] px-5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {adding ? "Verifying…" : "Add order"}
        </button>
      </form>

      <p className="mt-5 text-[10px] leading-5 text-[#321f1c]/38">
        Replenishment dates are product-usage estimates based on category and quantity, not medical guidance or automatic purchase scheduling.
      </p>
    </section>
  );
}
