"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BagIcon } from "@/components/icons";

const CART_KEY = "aloyri_cart";

function readCount() {
  try {
    const items = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as Array<{ qty: number }>;
    return items.reduce((total, item) => total + item.qty, 0);
  } catch {
    return 0;
  }
}

export function CartLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = () => setCount(readCount());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("aloyri-cart-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("aloyri-cart-updated", refresh);
    };
  }, []);

  return (
    <Link href="/cart" className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/55 transition hover:bg-white" aria-label="Cart">
      <BagIcon />
      {count > 0 ? <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#211d1a] px-1 text-center text-[10px] leading-5 text-white">{count}</span> : null}
    </Link>
  );
}
