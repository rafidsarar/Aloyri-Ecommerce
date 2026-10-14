import type { Product } from "@/lib/catalog";

/**
 * The homepage scrolling collection is the entire live, purchasable CRM catalog.
 * Never limit it to bestseller, featured, or a configured maxProducts count.
 */
export function sellingProducts(products: readonly Product[]): Product[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (!product.id || product.active === false ||
        (product.availableStock ?? 0) <= 0 || seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}
