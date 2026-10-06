"use client";

import { FormEvent, useEffect, useState } from "react";

type AlertStatus = {
  enabled?: boolean;
  authenticated?: boolean;
  email?: string;
};

export function ProductAlertSignup({
  productId,
  productName,
  outOfStock,
}: {
  productId: string;
  productName: string;
  outOfStock: boolean;
}) {
  const [status, setStatus] = useState<AlertStatus | null>(null);
  const [backInStock, setBackInStock] = useState(outOfStock);
  const [priceDrop, setPriceDrop] = useState(!outOfStock);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/product-alerts/status", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as AlertStatus;
        setStatus(body);
        if (body.email) setEmail(body.email);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!status?.enabled) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const kinds = [
      ...(outOfStock && backInStock ? ["back-in-stock"] : []),
      ...(priceDrop ? ["price-drop"] : []),
    ];
    if (!kinds.length) {
      setError("Choose at least one alert.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/product-alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          productId,
          kinds,
          ...(status.authenticated ? {} : { email }),
        }),
      });
      const body = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        setError(body.error || "Unable to save this alert.");
        return;
      }
      setMessage(body.message || "Your product alert is active.");
    } catch {
      setError("Unable to save this alert.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 rounded-[1.1rem] border border-[#713a35]/10 bg-[#fffaf7] p-4"
    >
      <p className="text-xs font-semibold">Email product alerts</p>
      <p className="mt-1 text-[11px] leading-5 text-[#321f1c]/45">
        One-shot alerts use current CRM price and stock as the baseline.
      </p>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
        {outOfStock ? (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={backInStock}
              onChange={(event) => setBackInStock(event.target.checked)}
            />
            Back in stock
          </label>
        ) : null}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={priceDrop}
            onChange={(event) => setPriceDrop(event.target.checked)}
          />
          Price drop
        </label>
      </div>
      {!status.authenticated ? (
        <label className="mt-3 block text-xs font-medium">
          Email address
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="mt-2 h-11 w-full rounded-xl border border-[#713a35]/12 bg-white px-3 text-sm"
          />
        </label>
      ) : (
        <p className="mt-3 text-xs text-[#321f1c]/50">
          Alert will be sent to your signed-in Aloyri account email.
        </p>
      )}
      <button
        disabled={saving}
        className="mt-3 rounded-full bg-[#713a35] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Create alert"}
      </button>
      {message ? (
        <p className="mt-3 text-xs text-emerald-700" aria-live="polite">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <span className="sr-only">{productName}</span>
    </form>
  );
}
