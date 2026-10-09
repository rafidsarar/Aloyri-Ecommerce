"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BagIcon, CloseIcon, ArrowIcon } from "@/components/icons";
import { useCatalog } from "@/components/catalog-provider";
import { ProductMedia } from "@/components/product-media";
import { CART_UPDATED_EVENT, cartCount, readCart, writeCart, type CartItem } from "@/lib/cart";
import { formatPrice } from "@/lib/catalog";
import { salePriceFor } from "@/lib/promotions";
import { trackStorefrontEvent } from "@/lib/analytics";

export function CartLink() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [changed, setChanged] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const { products, synced, error } = useCatalog();
  const pathname = usePathname();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const count = cartCount(items);
  const rows = useMemo(() => items.map(item => ({ ...item, product: products.find(p => p.id === item.productId) })), [items, products]);
  const subtotal = rows.reduce((sum, row) => sum + (row.product ? salePriceFor(row.product) * row.qty : 0), 0);
  const canCheckout = synced && !error && rows.length > 0 && rows.every(row => row.product && row.product.availableStock >= row.qty);
  const previousCount = useRef<number | null>(null);

  useEffect(() => {
    const refresh = () => setItems(readCart());
    const initialize = window.setTimeout(refresh, 0);
    window.addEventListener("storage", refresh);
    window.addEventListener(CART_UPDATED_EVENT, refresh);
    return () => {
      window.clearTimeout(initialize);
      window.removeEventListener("storage", refresh);
      window.removeEventListener(CART_UPDATED_EVENT, refresh);
    };
  }, []);

  useEffect(() => {
    if (previousCount.current !== null && previousCount.current !== count) {
      const begin = window.setTimeout(() => setChanged(true), 0);
      const end = window.setTimeout(() => setChanged(false), 380);
      previousCount.current = count;
      return () => { window.clearTimeout(begin); window.clearTimeout(end); };
    }
    previousCount.current = count;
  }, [count]);

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = Array.from(panel.current.querySelectorAll<HTMLElement>('button:not([disabled]),a[href]')).filter(el => el.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = original; document.removeEventListener("keydown", onKey); };
  }, [open]);

  function removeItem(productId: string, qty: number) {
    if (removing) return;
    setRemoving(productId);
    window.setTimeout(() => {
      writeCart(readCart().filter(item => item.productId !== productId));
      trackStorefrontEvent("cart_remove", { productId, itemCount: cartCount(readCart()), quantityDelta: -qty });
      setRemoving(null);
    }, 180);
  }

  return (
    <>
      <button ref={trigger} type="button" onClick={() => setOpen(true)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#713a35]/15 bg-white/70 transition hover:border-[#713a35]/30 hover:bg-white"
        aria-label={count > 0 ? `Cart with ${count} item${count === 1 ? "" : "s"}` : "Cart"}
        aria-haspopup="dialog" aria-expanded={open} aria-controls="aloyri-cart-drawer">
        <BagIcon />
        {count > 0 ? <span aria-live="polite" className={`absolute -right-1 -top-1 min-w-5 rounded-full bg-[#713a35] px-1 text-center text-[10px] font-semibold leading-5 text-white transition-transform duration-300 ${changed ? "scale-125" : "scale-100"}`}>{count}</span> : null}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[100]" aria-label="Cart overlay">
          <button type="button" aria-label="Close cart overlay" onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full bg-[#241512]/50 backdrop-blur-[2px]" />
          <div ref={panel} id="aloyri-cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping cart"
            className="absolute inset-y-0 right-0 flex h-full w-full max-w-[440px] flex-col border-l border-[#713a35]/15 bg-[#fffaf7] shadow-2xl motion-safe:animate-[aloyri-cart-enter_260ms_ease-out]">
            <div className="flex items-center justify-between border-b border-[#713a35]/10 px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <h2 className="display text-3xl text-[#321f1c]">Shopping cart</h2>
                <span className="rounded-full bg-[#f5e8e2] px-3 py-1 text-xs font-semibold text-[#713a35]">{count} {count === 1 ? "item" : "items"}</span>
              </div>
              <button ref={close} type="button" onClick={() => { setOpen(false); trigger.current?.focus(); }} aria-label="Close cart"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#713a35]/15 text-[#713a35] transition hover:bg-[#f5e8e2]"><CloseIcon /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-7">
              {rows.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <BagIcon className="h-12 w-12 text-[#713a35]/40" />
                  <p className="display mt-5 text-3xl">Your cart is empty.</p>
                  <p className="mt-2 text-sm text-[#321f1c]/60">Discover your next skincare essential.</p>
                  <Link href="/shop" onClick={() => setOpen(false)} className="mt-6 rounded-full bg-[#713a35] px-6 py-3 text-sm font-semibold text-white">Continue shopping</Link>
                </div>
              ) : rows.map(({productId, qty, product}) => (
                <div key={productId} className={`flex gap-4 rounded-2xl border border-[#713a35]/10 bg-white/80 p-3 transition-all duration-200 ${removing === productId ? "scale-95 opacity-0" : "opacity-100"}`}>
                  {product ? <Link href={`/product/${product.slug}`} onClick={() => setOpen(false)} className="shrink-0"><ProductMedia product={product} className="h-24 w-20 rounded-xl" sizes="80px" /></Link> : <div className="h-24 w-20 shrink-0 rounded-xl bg-[#f5e8e2]" />}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-[#321f1c]">{product?.name ?? "Unavailable product"}</p>
                    <p className="mt-2 text-sm font-semibold text-[#713a35]">{product ? formatPrice(salePriceFor(product) * qty) : "Unavailable"}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-xs text-[#321f1c]/65">Qty: {qty}</span>
                      <button type="button" disabled={Boolean(removing)} onClick={() => removeItem(productId, qty)}
                        aria-label={`Remove ${product?.name ?? "product"} from cart`}
                        className="min-h-9 rounded-lg px-3 text-xs font-semibold text-[#713a35] underline underline-offset-4 transition hover:bg-[#f5e8e2] disabled:opacity-40">Remove</button>
                    </div>
                    {!product || product.availableStock < qty ? <p className="mt-2 text-xs text-red-700">Update unavailable quantity in your cart.</p> : null}
                  </div>
                </div>
              ))}
            </div>
            {rows.length > 0 ? <div className="border-t border-[#713a35]/15 bg-[#fffaf7] px-5 py-6 sm:px-7">
              <div className="flex items-center justify-between gap-4 text-sm"><span className="text-[#321f1c]/70">Subtotal</span><span key={subtotal} className="text-lg font-semibold text-[#321f1c] motion-safe:animate-[aloyri-cart-pulse_300ms_ease-out]">{synced ? formatPrice(subtotal) : "Checking prices…"}</span></div>
              <p className="mt-2 text-xs text-[#321f1c]/60">Delivery calculated during checkout.</p>
              {canCheckout ? <Link href="/checkout" onClick={() => setOpen(false)} className="mt-5 flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#713a35] px-5 text-sm font-semibold text-white transition hover:bg-[#60312d]">Proceed to checkout <ArrowIcon /></Link> :
                <Link href="/cart" onClick={() => setOpen(false)} className="mt-5 flex min-h-12 items-center justify-center rounded-full bg-[#713a35] px-5 text-sm font-semibold text-white">Review cart and availability</Link>}
              <Link href="/cart" onClick={() => setOpen(false)} className="mt-3 block text-center text-xs font-medium text-[#713a35] underline underline-offset-4">View full cart</Link>
            </div> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
