export const SAVED_PRODUCTS_KEY = "aloyri_saved_products";
export const COMPARE_PRODUCTS_KEY = "aloyri_compare_products";
export const RECENT_PRODUCTS_KEY = "aloyri_recent_products";
export const PRODUCT_PREFERENCES_EVENT = "aloyri:product-preferences";

function cleanIds(value: unknown, max: number) {
  if (!Array.isArray(value)) return [] as string[];
  return [...new Set(
    value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(item)),
  )].slice(0, max);
}

function read(key: string, max: number) {
  if (typeof window === "undefined") return [] as string[];
  try {
    return cleanIds(JSON.parse(localStorage.getItem(key) || "[]"), max);
  } catch {
    return [] as string[];
  }
}

function write(key: string, ids: string[], max: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(cleanIds(ids, max)));
    window.dispatchEvent(new Event(PRODUCT_PREFERENCES_EVENT));
  } catch {
    // Product preferences are optional and remain device-local.
  }
}

export function readSavedProductIds() {
  return read(SAVED_PRODUCTS_KEY, 100);
}

export function writeSavedProductIds(ids: string[]) {
  write(SAVED_PRODUCTS_KEY, ids, 100);
}

export function readCompareProductIds() {
  return read(COMPARE_PRODUCTS_KEY, 3);
}

export function writeCompareProductIds(ids: string[]) {
  write(COMPARE_PRODUCTS_KEY, ids, 3);
}

export function readRecentProductIds() {
  return read(RECENT_PRODUCTS_KEY, 12);
}

export function writeRecentProductIds(ids: string[]) {
  write(RECENT_PRODUCTS_KEY, ids, 12);
}
