"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

const categories = [
  ["order", "Order question"],
  ["delivery", "Delivery problem"],
  ["payment", "Payment or COD"],
  ["product", "Product question"],
  ["other", "Other"],
] as const;

export function SupportRequestClient() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [caseId, setCaseId] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/support-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerName: form.get("customerName"),
          phone: form.get("phone"),
          email: form.get("email"),
          orderNumber: form.get("orderNumber"),
          category: form.get("category"),
          note: form.get("note"),
        }),
        cache: "no-store",
      });
      const body = (await response.json()) as { caseId?: string; error?: string };
      if (!response.ok || !body.caseId) {
        setError(body.error || "Could not submit your support request.");
        return;
      }
      setCaseId(body.caseId);
    } catch {
      setError("Customer support is temporarily unavailable. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (caseId) {
    return (
      <div className="mx-auto max-w-2xl rounded-[1.7rem] border border-[#713a35]/10 bg-white/70 p-7 text-center sm:p-10">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-700">✓</span>
        <h1 className="display mt-5 text-4xl">Support request received.</h1>
        <p className="mt-4 text-sm leading-7 text-[#321f1c]/55">
          Aloyri Customer Service has a case for your request. Keep the reference below if you need to follow up.
        </p>
        <p className="mt-5 rounded-xl bg-[#f5e8e2] px-4 py-3 font-mono text-xs text-[#713a35]">{caseId}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/track-order" className="rounded-full bg-[#713a35] px-6 py-3 text-sm font-semibold text-white">Track an order</Link>
          <Link href="/customer-care" className="rounded-full border border-[#713a35]/15 px-6 py-3 text-sm font-semibold text-[#713a35]">Customer care</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-8 grid max-w-3xl gap-5 rounded-[1.5rem] border border-[#713a35]/10 bg-white/70 p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Name<input name="customerName" required maxLength={120} className="mt-2 h-12 w-full rounded-xl border border-[#713a35]/14 bg-white px-4" /></label>
        <label className="text-sm font-medium">Mobile<input name="phone" required inputMode="tel" placeholder="01XXXXXXXXX" className="mt-2 h-12 w-full rounded-xl border border-[#713a35]/14 bg-white px-4" /></label>
        <label className="text-sm font-medium">Email <span className="text-black/35">(optional)</span><input name="email" type="email" maxLength={254} className="mt-2 h-12 w-full rounded-xl border border-[#713a35]/14 bg-white px-4" /></label>
        <label className="text-sm font-medium">Website order <span className="text-black/35">(optional)</span><input name="orderNumber" placeholder="WEB-..." maxLength={100} className="mt-2 h-12 w-full rounded-xl border border-[#713a35]/14 bg-white px-4 uppercase" /></label>
      </div>
      <label className="text-sm font-medium">What do you need help with?
        <select name="category" className="mt-2 h-12 w-full rounded-xl border border-[#713a35]/14 bg-white px-4">
          {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium">Details
        <textarea name="note" required minLength={5} maxLength={2000} rows={6} placeholder="Tell us what happened. Do not include passwords, payment PINs or other sensitive information." className="mt-2 w-full rounded-xl border border-[#713a35]/14 bg-white p-4 leading-6" />
      </label>
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
      <button disabled={submitting} className="rounded-full bg-[#713a35] px-6 py-4 text-sm font-semibold text-white disabled:opacity-60">{submitting ? "Submitting…" : "Send support request"}</button>
    </form>
  );
}
