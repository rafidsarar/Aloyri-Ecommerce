export const CUSTOMER_PROFILE_KEY = "aloyri_customer_profile_v1";
export const CUSTOMER_PROFILE_EVENT = "aloyri:customer-profile";

export type CustomerProfile = {
  fullName: string;
  email: string;
  phone: string;
  district: string;
};

export const emptyCustomerProfile: CustomerProfile = {
  fullName: "",
  email: "",
  phone: "",
  district: "",
};

function cleanText(value: unknown, max: number) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, max)
    : "";
}

function cleanProfile(value: unknown): CustomerProfile {
  if (!value || typeof value !== "object") return emptyCustomerProfile;
  const input = value as Record<string, unknown>;
  return {
    fullName: cleanText(input.fullName, 120),
    email: cleanText(input.email, 254).toLowerCase(),
    phone: cleanText(input.phone, 30),
    district: cleanText(input.district, 80),
  };
}

export function readCustomerProfile() {
  if (typeof window === "undefined") return emptyCustomerProfile;
  try {
    return cleanProfile(JSON.parse(localStorage.getItem(CUSTOMER_PROFILE_KEY) || "{}"));
  } catch {
    return emptyCustomerProfile;
  }
}

export function writeCustomerProfile(profile: CustomerProfile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(cleanProfile(profile)));
    window.dispatchEvent(new Event(CUSTOMER_PROFILE_EVENT));
  } catch {
    // Customer profile is an optional device-local convenience.
  }
}

export function clearCustomerProfile() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CUSTOMER_PROFILE_KEY);
    window.dispatchEvent(new Event(CUSTOMER_PROFILE_EVENT));
  } catch {
    // Customer profile is optional.
  }
}

export function customerProfileSnapshot() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(CUSTOMER_PROFILE_KEY) || "";
  } catch {
    return "";
  }
}

export function customerProfileServerSnapshot() {
  return "";
}

export function subscribeCustomerProfile(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === CUSTOMER_PROFILE_KEY) listener();
  };
  window.addEventListener(CUSTOMER_PROFILE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CUSTOMER_PROFILE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
