
// Temporary UI state only. Never persisted to localStorage or sessionStorage.
const values = new Map<string, string>();
export const volatileStorage = {
  getItem(key: string) { return typeof window === "undefined" ? null : values.get(key) ?? null; },
  setItem(key: string, value: string) { if (typeof window !== "undefined") values.set(key, value); },
  removeItem(key: string) { if (typeof window !== "undefined") values.delete(key); },
  clear() { if (typeof window !== "undefined") values.clear(); },
};
