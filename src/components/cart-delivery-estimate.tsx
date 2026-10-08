"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/catalog";

type Rates = { "inside-dhaka": number; "outside-dhaka": number };

function validRates(value: unknown): value is Rates {
  if (!value || typeof value !== "object") return false;
  const rates = value as Partial<Rates>;
  return ["inside-dhaka", "outside-dhaka"].every((zone) => {
    const fee = rates[zone as keyof Rates];
    return typeof fee === "number" && Number.isFinite(fee) && fee >= 0;
  });
}

export function CartDeliveryEstimate({ subtotal }: { subtotal: number }) {
  const [rates, setRates] = useState<Rates | null>(null);
  const [zone, setZone] = useState<keyof Rates | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/store-status", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Rates not available");
        const status = (await response.json()) as { deliveryRates?: unknown };
        if (validRates(status.deliveryRates)) setRates(status.deliveryRates);
      })
      .catch(() => {
        if (!controller.signal.aborted) setRates(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return <section aria-label="Estimated delivery charge" className="border-b border-[#713a35]/10 py-5 text-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-medium">Delivery estimate</p>
        <p className="mt-1 text-xs leading-5 text-[#321f1c]/55">Choose a zone to estimate your total before checkout.</p>
      </div>
      <span className="shrink-0 text-xs text-[#321f1c]/60">{loading ? "Checking…" : rates ? "Live rates" : "At checkout"}</span>
    </div>
    {rates ? (
      <>
        <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Estimate shipping by zone">
          {([["inside-dhaka", "Inside Dhaka"], ["outside-dhaka", "Outside Dhaka"]] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={zone === value} onClick={() => setZone(value)}
              className={`min-h-14 min-w-0 rounded-xl border px-2 py-3 text-left text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 ${zone === value ? "border-[#713a35] bg-white" : "border-[#713a35]/12 bg-white/50"}`}>
              <span className="block font-semibold">{label}</span>
              <span className="mt-1 block">{formatPrice(rates[value])}</span>
            </button>
          ))}
        </div>
        {zone ? <p role="status" className="mt-3 flex justify-between gap-2 text-sm font-semibold"><span>Estimated total</span><span>{formatPrice(subtotal + rates[zone])}</span></p> : null}
        <p className="mt-2 text-[11px] leading-5 text-[#321f1c]/55">Estimate before promotional discounts. Select your delivery zone again at checkout, where the final total is verified.</p>
      </>
    ) : <p className="mt-3 text-xs text-[#321f1c]/60">Delivery fees and your final total will be confirmed at checkout.</p>}
  </section>;
}
