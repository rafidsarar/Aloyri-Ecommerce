"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BagIcon } from "@/components/icons";
import { CART_UPDATED_EVENT, cartCount, readCart } from "@/lib/cart";

export function CartLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = () => setCount(cartCount(readCart()));
    const initialize = window.setTimeout(refresh, 0);
    window.addEventListener("storage", refresh);
    window.addEventListener(CART_UPDATED_EVENT, refresh);
    return () => {
      window.clearTimeout(initialize);
      window.removeEventListener("storage", refresh);
      window.removeEventListener(CART_UPDATED_EVENT, refresh);
    };
  }, []);

  return (
    <Link
      href="/cart"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#713a35]/15 bg-white/70 transition hover:border-[#713a35]/30 hover:bg-white"
      aria-label={count > 0 ? `Cart with ${count} item${count === 1 ? "" : "s"}` : "Cart"}
    >
      <BagIcon />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#713a35] px-1 text-center text-[10px] font-semibold leading-5 text-white">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
