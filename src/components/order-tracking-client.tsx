"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowIcon } from "@/components/icons";
import { formatPrice } from "@/lib/catalog";
import {
  isValidBangladeshPhone,
  normalizeBangladeshPhone,
} from "@/lib/checkout";
import { trackStorefrontEvent } from "@/lib/analytics";
import { rememberCustomerOrder } from "@/lib/customer-orders";
import type {
  PublicTrackedOrder,
  TrackingStatus,
} from "@/lib/crm-tracking-integration";

const progress: Array<{
  status: TrackingStatus;
  label: string;
  detail: string;
}> = [
  { status: "New", label: "Order received", detail: "Your order is in Aloyri CRM." },
  { status: "Confirmed", label: "Confirmed", detail: "Aloyri has confirmed the order." },
  {
    status: "Ready to pack",
    label: "Preparing",
    detail: "Your order is being prepared for packing.",
  },
  { status: "Packed", label: "Packed", detail: "Your parcel is packed and ready." },
  { status: "Shipped", label: "Shipped", detail: "The parcel has left Aloyri." },
  {
    status: "Out for delivery",
    label: "Out for delivery",
    detail: "The courier is taking your parcel to you.",
  },
  { status: "Delivered", label: "Delivered", detail: "Your order has been delivered." },
];

function dateLabel(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date(value + "T12:00:00Z").toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function paymentLabel(payment: PublicTrackedOrder["paymentMethod"]) {
  return payment === "COD" ? "Cash on Delivery" : payment;
}

function dateTimeLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function OrderTrackingClient({
  initialOrder = "",
}: {
  initialOrder?: string;
}) {
  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<PublicTrackedOrder | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!orderNumber.trim() || !isValidBangladeshPhone(phone)) {
      setError("Enter your website order number and the mobile number used at checkout.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/track-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          phone: normalizeBangladeshPhone(phone),
        }),
        cache: "no-store",
      });

      const body = (await response.json()) as
        | PublicTrackedOrder
        | { error?: string };

      if (!response.ok || !("orderNumber" in body)) {
        setError(
          "error" in body && body.error
            ? body.error
            : "Check the order number and mobile number and try again.",
        );
        return;
      }

      setResult(body);
      rememberCustomerOrder({
        orderNumber: body.orderNumber,
        phone: normalizeBangladeshPhone(phone),
        createdAt: body.created,
        items: [],
        total: body.total,
      });
      trackStorefrontEvent("order_tracking_success", {
        orderStatus: body.status,
      });
    } catch {
      setError("Order tracking is temporarily unavailable. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const currentIndex = result
    ? progress.findIndex((item) => item.status === result.status)
    : -1;
  const terminal =
    result?.status === "Cancelled" || result?.status === "Returned";

  return (
    <main className="shell py-12 md:py-18">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/48">
            Order tracking
          </p>
          <h1 className="display mt-3 text-5xl leading-[.94] sm:text-6xl">
            Follow your Aloyri order.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-[#321f1c]/52">
            Enter the website order number and the Bangladesh mobile number used
            during checkout. We&apos;ll show the latest status directly from Aloyri CRM.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="mt-9 grid gap-4 rounded-[1.5rem] border border-[#713a35]/10 bg-[#f5e8e2] p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6"
        >
          <label className="text-sm font-medium">
            Order number
            <input
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              placeholder="WEB-..."
              autoComplete="off"
              className="mt-2 h-12 w-full rounded-[.9rem] border border-[#713a35]/14 bg-white px-4 text-sm uppercase outline-none transition placeholder:normal-case placeholder:text-[#321f1c]/30 focus:border-[#b9725f]/60"
            />
          </label>

          <label className="text-sm font-medium">
            Mobile number
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="01XXXXXXXXX"
              inputMode="tel"
              autoComplete="tel"
              className="mt-2 h-12 w-full rounded-[.9rem] border border-[#713a35]/14 bg-white px-4 text-sm outline-none transition placeholder:text-[#321f1c]/30 focus:border-[#b9725f]/60"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#713a35] px-6 text-sm font-semibold text-white transition hover:bg-[#60312d] disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? "Checking…" : "Track order"}
            {!submitting ? <ArrowIcon /> : null}
          </button>
        </form>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.12fr_.88fr]">
            <section className="rounded-[1.6rem] border border-[#713a35]/10 bg-white/70 p-5 sm:p-7">
              <div className="flex flex-col gap-4 border-b border-[#713a35]/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
                    {result.orderNumber}
                  </p>
                  <h2 className="display mt-2 text-4xl">{result.status}</h2>
                  <p className="mt-2 text-xs text-[#321f1c]/45">
                    Ordered {dateLabel(result.created)}
                  </p>
                </div>
                <span
                  className={
                    "w-fit rounded-full px-4 py-2 text-xs font-semibold " +
                    (result.status === "Cancelled"
                      ? "bg-red-50 text-red-700"
                      : result.status === "Returned"
                        ? "bg-amber-50 text-amber-700"
                        : result.status === "Delivered"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-[#f5e8e2] text-[#713a35]")
                  }
                >
                  Live CRM status
                </span>
              </div>

              {terminal ? (
                <div className="mt-6 rounded-[1.1rem] bg-[#fff4ef] p-5">
                  <p className="text-sm font-semibold">
                    {result.status === "Cancelled"
                      ? "This order was cancelled."
                      : "This order was returned."}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#321f1c]/52">
                    {result.status === "Returned" && result.returnedDate
                      ? "Return recorded " + dateLabel(result.returnedDate) + "."
                      : "Contact Aloyri customer care if you need help with this order."}
                  </p>
                </div>
              ) : (
                <div className="mt-7">
                  {progress.map((step, index) => {
                    const reached = index <= currentIndex;
                    const current = index === currentIndex;

                    return (
                      <div
                        key={step.status}
                        className="grid grid-cols-[32px_1fr] gap-4 pb-6 last:pb-0"
                      >
                        <div className="relative flex justify-center">
                          <span
                            className={
                              "relative z-10 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-semibold " +
                              (reached
                                ? "border-[#713a35] bg-[#713a35] text-white"
                                : "border-[#713a35]/14 bg-white text-[#713a35]/35")
                            }
                          >
                            {reached ? "✓" : index + 1}
                          </span>
                          {index < progress.length - 1 ? (
                            <span
                              className={
                                "absolute top-7 h-[calc(100%+1px)] w-px " +
                                (index < currentIndex
                                  ? "bg-[#713a35]"
                                  : "bg-[#713a35]/12")
                              }
                            />
                          ) : null}
                        </div>
                        <div>
                          <p
                            className={
                              "text-sm font-semibold " +
                              (current ? "text-[#713a35]" : "text-[#321f1c]")
                            }
                          >
                            {step.label}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#321f1c]/45">
                            {step.detail}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {result.shipment ? (
                <div className="mt-7 rounded-[1rem] bg-[#f5e8e2] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
                        Courier update
                      </p>
                      <p className="mt-2 text-sm font-semibold">{result.shipment.statusLabel}</p>
                      <p className="mt-1 text-xs leading-5 text-[#321f1c]/50">{result.shipment.latestMessage}</p>
                    </div>
                    <span className="w-fit rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-[#713a35]">
                      {result.shipment.provider}
                    </span>
                  </div>
                  {result.shipment.exceptionMessage ? (
                    <p className="mt-3 rounded-[.8rem] border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                      {result.shipment.exceptionMessage}
                    </p>
                  ) : null}
                  {result.shipment.reattemptAt ? (
                    <p className="mt-3 text-xs text-[#321f1c]/50">
                      Reattempt: {dateTimeLabel(result.shipment.reattemptAt)}
                    </p>
                  ) : null}
                  {(result.shipment.trackingReference || result.trackingReference) ? (
                    <div className="mt-3 border-t border-[#713a35]/10 pt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#713a35]/45">Tracking reference</p>
                      <p className="mt-1 break-all text-sm font-semibold">{result.shipment.trackingReference || result.trackingReference}</p>
                    </div>
                  ) : null}
                </div>
              ) : result.trackingReference ? (
                <div className="mt-7 rounded-[1rem] bg-[#f5e8e2] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
                    Courier tracking reference
                  </p>
                  <p className="mt-2 break-all text-sm font-semibold">
                    {result.trackingReference}
                  </p>
                </div>
              ) : null}

              {result.deliveredDate ? (
                <p className="mt-5 text-xs text-[#321f1c]/45">
                  Delivered {dateLabel(result.deliveredDate)}
                </p>
              ) : null}
            </section>

            <aside className="h-fit rounded-[1.6rem] border border-[#713a35]/10 bg-[#f5e8e2] p-5 sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
                Order summary
              </p>

              <div className="mt-5 space-y-4">
                {result.items.map((item, index) => (
                  <div
                    key={item.name + index}
                    className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#713a35]/10 pb-4 last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="mt-1 text-xs text-[#321f1c]/45">
                        {item.brand}
                        {item.size ? " · " + item.size : ""}
                        {" · Qty " + item.qty}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatPrice(item.unitPrice * item.qty)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-[#713a35]/10 pt-5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#321f1c]/55">Products</span>
                  <span>{formatPrice(result.productsSubtotal)}</span>
                </div>
                {result.discount > 0 ? (
                  <div className="mt-3 flex justify-between">
                    <span className="text-[#321f1c]/55">Discount</span>
                    <span>-{formatPrice(result.discount)}</span>
                  </div>
                ) : null}
                <div className="mt-3 flex justify-between">
                  <span className="text-[#321f1c]/55">Delivery</span>
                  <span>{formatPrice(result.deliveryCharge)}</span>
                </div>
                <div className="mt-5 flex justify-between border-t border-[#713a35]/10 pt-5 text-base font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(result.total)}</span>
                </div>
              </div>

              <div className="mt-6 rounded-[1rem] bg-white/60 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#713a35]/45">
                  Payment
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {paymentLabel(result.paymentMethod)}
                </p>
              </div>

              {["Delivered", "Returned"].includes(result.status) ? (
                <Link
                  href={"/return-request?order=" + encodeURIComponent(result.orderNumber)}
                  className="mt-5 block w-full rounded-full bg-[#713a35] px-5 py-3 text-center text-sm font-semibold text-white"
                >
                  Request return / refund review
                </Link>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setError("");
                }}
                className="mt-3 w-full rounded-full border border-[#713a35]/14 bg-white/60 px-5 py-3 text-sm font-semibold text-[#713a35]"
              >
                Track another order
              </button>
            </aside>
          </div>
        ) : null}
      </div>
    </main>
  );
}
