"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowIcon } from "@/components/icons";
import { formatPrice } from "@/lib/catalog";
import {
  isValidBangladeshPhone,
  normalizeBangladeshPhone,
} from "@/lib/checkout";
import type { PublicTrackedOrder } from "@/lib/crm-tracking-integration";
import { trackStorefrontEvent } from "@/lib/analytics";

const reasons = [
  "Wrong product delivered",
  "Damaged on arrival",
  "Missing item",
  "Product issue",
  "Changed mind",
  "Other",
] as const;

const conditions = [
  "Unopened",
  "Opened",
  "Damaged in delivery",
  "Not received",
  "Other",
] as const;

const resolutions = ["Refund", "Replacement", "Store credit", "Other"] as const;

export function ReturnRequestClient({
  initialOrder = "",
}: {
  initialOrder?: string;
}) {
  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<PublicTrackedOrder | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [reason, setReason] = useState<(typeof reasons)[number]>("Damaged on arrival");
  const [condition, setCondition] =
    useState<(typeof conditions)[number]>("Damaged in delivery");
  const [resolution, setResolution] =
    useState<(typeof resolutions)[number]>("Refund");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{
    requestId: string;
    orderNumber: string;
    duplicate: boolean;
  } | null>(null);

  const selected = useMemo(
    () =>
      Object.entries(quantities)
        .map(([line, qty]) => ({ line: Number(line), qty }))
        .filter((item) => item.qty > 0),
    [quantities],
  );

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setOrder(null);
    setSuccess(null);

    if (!orderNumber.trim() || !isValidBangladeshPhone(phone)) {
      setError("Enter your website order number and the mobile number used at checkout.");
      return;
    }

    setChecking(true);
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

      if (!["Delivered", "Returned"].includes(body.status)) {
        setError(
          "This order is not yet eligible for a return request. Returns can be requested after delivery.",
        );
        return;
      }

      setOrder(body);
      setOrderNumber(body.orderNumber);
      setQuantities(
        Object.fromEntries(body.items.map((_, index) => [index, 0])),
      );
    } catch {
      setError("Return verification is temporarily unavailable. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!order || selected.length === 0) {
      setError("Select at least one product and quantity for review.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/return-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderNumber: order.orderNumber,
          phone: normalizeBangladeshPhone(phone),
          reason,
          condition,
          preferredResolution: resolution,
          note,
          items: selected,
        }),
        cache: "no-store",
      });
      const body = (await response.json()) as {
        requestId?: string;
        orderNumber?: string;
        duplicate?: boolean;
        error?: string;
      };

      if (!response.ok || !body.requestId || !body.orderNumber) {
        setError(body.error || "Could not submit this return request.");
        return;
      }

      setSuccess({
        requestId: body.requestId,
        orderNumber: body.orderNumber,
        duplicate: body.duplicate === true,
      });
      trackStorefrontEvent("return_request_submitted", {
        itemCount: selected.reduce((sum, item) => sum + item.qty, 0),
        reason,
        resolution,
        orderStatus: order.status,
      });
    } catch {
      setError("Return requests are temporarily unavailable. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="shell min-h-[62vh] py-16 md:py-20">
        <div className="mx-auto max-w-2xl rounded-[1.7rem] border border-[#713a35]/10 bg-white/70 p-7 text-center sm:p-10">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-700">
            ✓
          </span>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#713a35]/48">
            Return review
          </p>
          <h1 className="display mt-2 text-4xl">
            {success.duplicate ? "Request already received." : "Request received."}
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#321f1c]/55">
            Aloyri has received the request for order{" "}
            <strong>{success.orderNumber}</strong>. This is a review request only:
            it does not automatically create a refund, restock a product, or mark
            the order as returned.
          </p>
          <div className="mt-7 rounded-[1rem] bg-[#f5e8e2] p-4 text-left">
            <p className="text-xs font-semibold text-[#713a35]">What happens next</p>
            <p className="mt-2 text-xs leading-6 text-[#321f1c]/55">
              Aloyri reviews the request and confirms the next step. If a physical
              return is accepted, wait for return instructions before sending the
              product back.
            </p>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href={"/track-order?order=" + encodeURIComponent(success.orderNumber)}
              className="rounded-full bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white"
            >
              Track order
            </Link>
            <Link
              href="/customer-care"
              className="rounded-full border border-[#713a35]/15 px-6 py-3.5 text-sm font-semibold text-[#713a35]"
            >
              Customer care
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="shell py-12 md:py-18">
      <div className="mx-auto max-w-5xl">
        <div className="max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/48">
            Returns & refunds
          </p>
          <h1 className="display mt-3 text-5xl leading-[.94] sm:text-6xl">
            Request a return review.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#321f1c]/52">
            Verify the delivered website order first. A request is reviewed by
            Aloyri before any refund, exchange, stock inspection or restocking
            decision is made.
          </p>
        </div>

        {!order ? (
          <form
            onSubmit={verify}
            className="mt-9 grid gap-4 rounded-[1.5rem] border border-[#713a35]/10 bg-[#f5e8e2] p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6"
          >
            <label className="text-sm font-medium">
              Order number
              <input
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value)}
                placeholder="WEB-..."
                autoComplete="off"
                className="mt-2 h-12 w-full rounded-[.9rem] border border-[#713a35]/14 bg-white px-4 text-sm uppercase outline-none focus:border-[#b9725f]/60"
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
                className="mt-2 h-12 w-full rounded-[.9rem] border border-[#713a35]/14 bg-white px-4 text-sm outline-none focus:border-[#b9725f]/60"
              />
            </label>
            <button
              type="submit"
              disabled={checking}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#713a35] px-6 text-sm font-semibold text-white disabled:opacity-60"
            >
              {checking ? "Checking…" : "Verify order"}
              {!checking ? <ArrowIcon /> : null}
            </button>
          </form>
        ) : (
          <form onSubmit={submit} className="mt-9 grid gap-6 lg:grid-cols-[1.08fr_.92fr]">
            <section className="rounded-[1.5rem] border border-[#713a35]/10 bg-white/70 p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#713a35]/10 pb-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/48">
                    Verified order
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">{order.orderNumber}</h2>
                  <p className="mt-1 text-xs text-[#321f1c]/45">
                    {order.status} · {formatPrice(order.total)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOrder(null);
                    setQuantities({});
                    setError("");
                  }}
                  className="text-xs font-semibold text-[#713a35] underline underline-offset-4"
                >
                  Use another order
                </button>
              </div>

              <fieldset className="mt-6">
                <legend className="text-sm font-semibold">Products to review</legend>
                <p className="mt-1 text-xs leading-5 text-[#321f1c]/45">
                  Select only the affected products and quantities.
                </p>
                <div className="mt-4 space-y-3">
                  {order.items.map((item, index) => {
                    const qty = quantities[index] || 0;
                    return (
                      <div
                        key={item.name + index}
                        className="grid gap-3 rounded-[1rem] border border-[#713a35]/10 bg-[#fffaf7] p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                      >
                        <div>
                          <p className="text-sm font-semibold">{item.name}</p>
                          <p className="mt-1 text-xs text-[#321f1c]/45">
                            {item.brand}
                            {item.size ? " · " + item.size : ""}
                            {" · Ordered " + item.qty}
                          </p>
                        </div>
                        <label className="flex items-center gap-2 text-xs font-medium text-[#321f1c]/55">
                          Qty
                          <select
                            aria-label={"Return quantity for " + item.name}
                            value={qty}
                            onChange={(event) =>
                              setQuantities((current) => ({
                                ...current,
                                [index]: Number(event.target.value),
                              }))
                            }
                            className="h-11 min-w-20 rounded-full border border-[#713a35]/14 bg-white px-3 text-sm"
                          >
                            {Array.from({ length: item.qty + 1 }, (_, value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            </section>

            <aside className="h-fit rounded-[1.5rem] border border-[#713a35]/10 bg-[#f5e8e2] p-5 sm:p-6">
              <label className="block text-sm font-medium">
                Reason
                <select
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value as (typeof reasons)[number])
                  }
                  className="mt-2 h-12 w-full rounded-[.9rem] border border-[#713a35]/14 bg-white px-4 text-sm"
                >
                  {reasons.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label className="mt-5 block text-sm font-medium">
                Product condition
                <select
                  value={condition}
                  onChange={(event) =>
                    setCondition(event.target.value as (typeof conditions)[number])
                  }
                  className="mt-2 h-12 w-full rounded-[.9rem] border border-[#713a35]/14 bg-white px-4 text-sm"
                >
                  {conditions.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>

              <fieldset className="mt-5">
                <legend className="text-sm font-medium">Preferred outcome</legend>
                <p className="mt-1 text-xs leading-5 text-[#321f1c]/45">
                  This is your preference, not an automatic approval.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {resolutions.map((item) => (
                    <label
                      key={item}
                      className={
                        "cursor-pointer rounded-[.9rem] border p-3 text-xs font-semibold focus-within:ring-2 focus-within:ring-[#713a35]/45 focus-within:ring-offset-2 " +
                        (resolution === item
                          ? "border-[#713a35] bg-white text-[#713a35]"
                          : "border-[#713a35]/10 bg-white/45 text-[#321f1c]/55")
                      }
                    >
                      <input
                        type="radio"
                        name="resolution"
                        value={item}
                        checked={resolution === item}
                        onChange={() => setResolution(item)}
                        className="sr-only"
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="mt-5 block text-sm font-medium">
                Details
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={2000}
                  rows={5}
                  placeholder="Tell us what happened. Do not include passwords, payment PINs or other sensitive information."
                  className="mt-2 w-full rounded-[.9rem] border border-[#713a35]/14 bg-white p-4 text-sm leading-6 outline-none focus:border-[#b9725f]/60"
                />
              </label>

              <div className="mt-5 rounded-[1rem] bg-white/60 p-4 text-xs leading-6 text-[#321f1c]/52">
                Do not send a product back until Aloyri confirms the next step.
                A return request does not automatically create a refund or put
                the product back into sellable stock.
              </div>

              <button
                type="submit"
                disabled={submitting || selected.length === 0}
                className="mt-6 w-full rounded-full bg-[#713a35] px-6 py-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? "Submitting…" : "Submit return request"}
              </button>
            </aside>
          </form>
        )}

        {error ? (
          <p
            role="alert"
            aria-live="polite"
            className="mt-4 rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
