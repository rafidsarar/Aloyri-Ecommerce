"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { readCart, writeCart, type CartItem } from "@/lib/cart";

export function CustomerCartHandoffRestore() {
  const pathname = usePathname();
  useEffect(() => {
    // The full Google redirect returns to account/setup or checkout. Do not
    // request private account state on public catalog and product pages.
    if (!pathname.startsWith("/account") && pathname !== "/checkout") return;

    const controller = new AbortController();
    void fetch("/api/customer-auth/cart-handoff", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => response.ok
        ? await response.json() as { restored?: boolean; items?: CartItem[] }
        : null)
      .then((result) => {
        if (controller.signal.aborted || !result?.restored || !Array.isArray(result.items)) return;
        const byId = new Map(readCart().map((item) => [item.productId, item.qty]));
        for (const item of result.items) {
          if (!item || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(item.productId) ||
              !Number.isSafeInteger(item.qty) || item.qty <= 0) continue;
          byId.set(item.productId, Math.min(20, (byId.get(item.productId) || 0) + item.qty));
        }
        writeCart(Array.from(byId, ([productId, qty]) => ({ productId, qty })));
        window.dispatchEvent(new Event("aloyri:cart-restored-after-google"));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [pathname]);
  return null;
}
