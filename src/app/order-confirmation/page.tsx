"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowIcon } from "@/components/icons";
import { formatPrice } from "@/lib/catalog";
import { deliveryZoneLabels, type DeliveryZone } from "@/lib/checkout";

type ConfirmationSnapshot = {
  savedAt: number;
  orderNumber: string;
  itemCount: number;
  deliveryZone: DeliveryZone;
  deliveryCharge: number;
  total: number;
  paymentMethod: "COD";
};

function ConfirmationContent() {
  const params = useSearchParams();
  const orderNumber = params.get("order") || "";
  const [copied, setCopied] = useState(false);
  const [snapshot, setSnapshot] = useState<ConfirmationSnapshot | null>(null);

  useEffect(() => {
    const initialize = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem("aloyri_last_order_confirmation");
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<ConfirmationSnapshot>;
        if (
          parsed.orderNumber === orderNumber &&
          typeof parsed.savedAt === "number" &&
          Date.now() - parsed.savedAt < 24 * 60 * 60 * 1000 &&
          typeof parsed.itemCount === "number" &&
          typeof parsed.deliveryCharge === "number" &&
          typeof parsed.total === "number" &&
          (parsed.deliveryZone === "inside-dhaka" ||
            parsed.deliveryZone === "outside-dhaka") &&
          parsed.paymentMethod === "COD"
        ) {
          setSnapshot(parsed as ConfirmationSnapshot);
        }
      } catch {
        // The confirmation page remains useful without browser storage.
      }
    }, 0);

    return () => window.clearTimeout(initialize);
  }, [orderNumber]);

  async function copyOrderNumber() {
    if (!orderNumber) return;
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="shell min-h-[65vh] py-12 md:py-20">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-[#713a35]/10 bg-[#f5e8e2] p-6 text-center sm:p-10 md:p-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#713a35] text-2xl text-white" aria-hidden="true">
          ✓
        </div>
        <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#713a35]/50">
          Order received
        </p>
        <h1 className="display mt-3 text-5xl leading-[.95] sm:text-6xl">
          Thank you for choosing Aloyri.
        </h1>

        {orderNumber ? (
          <div className="mx-auto mt-7 max-w-md rounded-[1rem] bg-white/65 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#321f1c]/40">
              Order reference
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <strong className="text-sm">{orderNumber}</strong>
              <button
                type="button"
                onClick={() => void copyOrderNumber()}
                className="rounded-full border border-[#713a35]/15 bg-white px-3 py-2 text-xs font-semibold text-[#713a35]"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <span className="sr-only" aria-live="polite">
              {copied ? "Order number copied." : ""}
            </span>
          </div>
        ) : null}

        {snapshot ? (
          <div className="mx-auto mt-5 grid max-w-xl gap-3 text-left sm:grid-cols-3">
            <div className="rounded-[1rem] bg-white/55 p-4">
              <p className="text-[9px] uppercase tracking-[0.14em] text-[#321f1c]/40">Items</p>
              <p className="mt-2 text-sm font-semibold">{snapshot.itemCount}</p>
            </div>
            <div className="rounded-[1rem] bg-white/55 p-4">
              <p className="text-[9px] uppercase tracking-[0.14em] text-[#321f1c]/40">Delivery</p>
              <p className="mt-2 text-sm font-semibold">{deliveryZoneLabels[snapshot.deliveryZone]}</p>
            </div>
            <div className="rounded-[1rem] bg-white/55 p-4">
              <p className="text-[9px] uppercase tracking-[0.14em] text-[#321f1c]/40">Cash due</p>
              <p className="mt-2 text-sm font-semibold">{formatPrice(snapshot.total)}</p>
            </div>
          </div>
        ) : null}

        <p className="mx-auto mt-6 max-w-lg text-sm leading-7 text-[#321f1c]/52">
          Your Cash on Delivery order has been created. No online payment was
          collected. Aloyri can now confirm, prepare and ship the order through
          the normal fulfillment workflow.
        </p>

        <div className="mx-auto mt-7 grid max-w-xl gap-3 text-left sm:grid-cols-3">
          {[
            ["1", "Order received", "The order is now in Aloyri."],
            ["2", "Confirmation", "The team reviews and confirms fulfillment."],
            ["3", "Delivery", "Track shipment progress with your order number."],
          ].map(([number, title, copy]) => (
            <div key={number} className="rounded-[1rem] border border-[#713a35]/10 bg-white/45 p-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#713a35] text-[10px] font-semibold text-white">
                {number}
              </span>
              <p className="mt-3 text-xs font-semibold">{title}</p>
              <p className="mt-1 text-[11px] leading-5 text-[#321f1c]/45">{copy}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {orderNumber ? (
            <Link
              href={"/track-order?order=" + encodeURIComponent(orderNumber)}
              className="inline-flex items-center gap-3 rounded-full bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white"
            >
              Track this order <ArrowIcon />
            </Link>
          ) : null}
          <Link
            href="/shop"
            className="inline-flex items-center gap-3 rounded-full border border-[#713a35]/15 bg-white/60 px-6 py-3.5 text-sm font-semibold text-[#713a35]"
          >
            Continue shopping
          </Link>
        </div>

        {orderNumber ? (
          <p className="mt-5 text-xs leading-5 text-[#321f1c]/42">
            Keep the order number and use the same mobile number entered at
            checkout to view live status or request a return review after delivery.
          </p>
        ) : null}
      </div>
    </main>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <main className="shell min-h-[65vh] py-16">
          <div className="h-64 animate-pulse rounded-[2rem] bg-[#f5e8e2]" />
        </main>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
