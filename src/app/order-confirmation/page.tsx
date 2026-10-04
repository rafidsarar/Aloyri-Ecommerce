"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowIcon } from "@/components/icons";

function ConfirmationContent() {
  const params = useSearchParams();
  const orderNumber = params.get("order") || "";

  return (
    <main className="shell min-h-[65vh] py-16 md:py-24">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-[#713a35]/10 bg-[#f5e8e2] p-7 text-center sm:p-10 md:p-14">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#713a35] text-2xl text-white">
          ✓
        </div>
        <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#713a35]/50">
          Order received
        </p>
        <h1 className="display mt-3 text-5xl leading-[.95] sm:text-6xl">
          Thank you for choosing Aloyri.
        </h1>
        {orderNumber ? (
          <p className="mt-6 text-sm text-[#321f1c]/58">
            Order reference{" "}
            <strong className="text-[#321f1c]">{orderNumber}</strong>
          </p>
        ) : null}
        <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-[#321f1c]/52">
          Your Cash on Delivery order has been created. The Aloyri team can now
          process it through the normal CRM fulfillment workflow.
        </p>
        <Link
          href="/shop"
          className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white"
        >
          Continue shopping <ArrowIcon />
        </Link>
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
