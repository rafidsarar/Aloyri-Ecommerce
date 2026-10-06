export const CUSTOMER_ORDERS_KEY = "aloyri_customer_orders_v1";
export const CUSTOMER_ORDERS_EVENT = "aloyri:customer-orders";

export type StoredCustomerOrder = {
  orderNumber: string;
  phone: string;
  createdAt: string;
  items: Array<{ productId: string; qty: number }>;
  total?: number;
};

const MAX_ORDERS = 12;
const MAX_AGE_MS = 395 * 24 * 60 * 60 * 1000;

function cleanOrder(value: unknown): StoredCustomerOrder | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const orderNumber =
    typeof input.orderNumber === "string" ? input.orderNumber.trim().toUpperCase() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim().slice(0, 30) : "";
  const createdAt =
    typeof input.createdAt === "string" && !Number.isNaN(Date.parse(input.createdAt))
      ? new Date(input.createdAt).toISOString()
      : new Date().toISOString();

  if (!/^WEB-[A-Z0-9-]{8,90}$/.test(orderNumber) || !/^\+?\d{10,15}$/.test(phone.replace(/[\s-]/g, ""))) {
    return null;
  }

  const items = Array.isArray(input.items)
    ? input.items
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          if (
            typeof row.productId !== "string" ||
            !/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(row.productId) ||
            typeof row.qty !== "number" ||
            !Number.isInteger(row.qty) ||
            row.qty < 1 ||
            row.qty > 100
          ) {
            return null;
          }
          return { productId: row.productId, qty: row.qty };
        })
        .filter((item): item is { productId: string; qty: number } => Boolean(item))
        .slice(0, 50)
    : [];

  const total =
    typeof input.total === "number" && Number.isFinite(input.total) && input.total >= 0
      ? Math.round(input.total * 100) / 100
      : undefined;

  return {
    orderNumber,
    phone: phone.replace(/[\s-]/g, ""),
    createdAt,
    items,
    ...(total !== undefined ? { total } : {}),
  };
}

function cleanOrders(value: unknown) {
  if (!Array.isArray(value)) return [] as StoredCustomerOrder[];
  const cutoff = Date.now() - MAX_AGE_MS;
  const seen = new Set<string>();
  return value
    .map(cleanOrder)
    .filter((order): order is StoredCustomerOrder => Boolean(order))
    .filter((order) => Date.parse(order.createdAt) >= cutoff)
    .filter((order) => {
      if (seen.has(order.orderNumber)) return false;
      seen.add(order.orderNumber);
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_ORDERS);
}

export function readCustomerOrders() {
  if (typeof window === "undefined") return [] as StoredCustomerOrder[];
  try {
    return cleanOrders(JSON.parse(localStorage.getItem(CUSTOMER_ORDERS_KEY) || "[]"));
  } catch {
    return [] as StoredCustomerOrder[];
  }
}

export function writeCustomerOrders(orders: StoredCustomerOrder[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOMER_ORDERS_KEY, JSON.stringify(cleanOrders(orders)));
    window.dispatchEvent(new Event(CUSTOMER_ORDERS_EVENT));
  } catch {
    // Recent order history is an optional device-local convenience.
  }
}

export function rememberCustomerOrder(order: StoredCustomerOrder) {
  const cleaned = cleanOrder(order);
  if (!cleaned) return;
  const current = readCustomerOrders().filter(
    (item) => item.orderNumber !== cleaned.orderNumber,
  );
  writeCustomerOrders([cleaned, ...current]);
}

export function forgetCustomerOrder(orderNumber: string) {
  writeCustomerOrders(
    readCustomerOrders().filter((order) => order.orderNumber !== orderNumber),
  );
}

export function customerOrdersSnapshot() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(CUSTOMER_ORDERS_KEY) || "[]";
  } catch {
    return "";
  }
}

export function customerOrdersServerSnapshot() {
  return "";
}

export function subscribeCustomerOrders(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === CUSTOMER_ORDERS_KEY) listener();
  };
  window.addEventListener(CUSTOMER_ORDERS_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CUSTOMER_ORDERS_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
