"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { readCart } from "@/lib/cart";

export function CustomerGoogleLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function navigate(event: MouseEvent<HTMLAnchorElement>) {
    // Preserve native open-in-new-tab, modifier keys and keyboard semantics.
    if (event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const cart = readCart();
    if (!cart.length) return;
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/customer-auth/cart-handoff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ items: cart }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error("HANDOFF_FAILED");
      // This deliberately navigates to the existing PKCE Google OAuth start.
      window.location.assign(href);
    } catch {
      setBusy(false);
      setError("We could not secure your cart for sign-in. Please try again; your cart is still here.");
    }
  }

  return (
    <div>
      <a href={href} className={className}
        aria-disabled={busy || undefined}
        onClick={(event) => void navigate(event)}
      >
        {children}
        {busy ? <span className="sr-only"> Preparing your cart</span> : null}
      </a>
      {error ? <p role="alert" className="mt-3 text-xs leading-5 text-red-700">{error}</p> : null}
    </div>
  );
}
