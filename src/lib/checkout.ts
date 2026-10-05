export type DeliveryZone = "inside-dhaka" | "outside-dhaka";
export type PaymentMethod = "COD" | "bKash" | "Nagad";

export type CheckoutDraft = {
  fullName: string;
  phone: string;
  email: string;
  district: string;
  area: string;
  address: string;
  landmark: string;
  notes: string;
  deliveryZone: DeliveryZone | "";
  paymentMethod: PaymentMethod;
};

export const CHECKOUT_DRAFT_KEY = "aloyri_checkout_draft";
export const CHECKOUT_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
export const CHECKOUT_ATTEMPT_KEY = "aloyri_checkout_id";

export const initialCheckoutDraft: CheckoutDraft = {
  fullName: "",
  phone: "",
  email: "",
  district: "",
  area: "",
  address: "",
  landmark: "",
  notes: "",
  deliveryZone: "",
  paymentMethod: "COD",
};

export const bangladeshDistricts = [
  "Bagerhat",
  "Bandarban",
  "Barguna",
  "Barishal",
  "Bhola",
  "Bogura",
  "Brahmanbaria",
  "Chandpur",
  "Chapainawabganj",
  "Chattogram",
  "Chuadanga",
  "Cox's Bazar",
  "Cumilla",
  "Dhaka",
  "Dinajpur",
  "Faridpur",
  "Feni",
  "Gaibandha",
  "Gazipur",
  "Gopalganj",
  "Habiganj",
  "Jamalpur",
  "Jashore",
  "Jhalokathi",
  "Jhenaidah",
  "Joypurhat",
  "Khagrachhari",
  "Khulna",
  "Kishoreganj",
  "Kurigram",
  "Kushtia",
  "Lakshmipur",
  "Lalmonirhat",
  "Madaripur",
  "Magura",
  "Manikganj",
  "Meherpur",
  "Moulvibazar",
  "Munshiganj",
  "Mymensingh",
  "Naogaon",
  "Narail",
  "Narayanganj",
  "Narsingdi",
  "Natore",
  "Netrokona",
  "Nilphamari",
  "Noakhali",
  "Pabna",
  "Panchagarh",
  "Patuakhali",
  "Pirojpur",
  "Rajbari",
  "Rajshahi",
  "Rangamati",
  "Rangpur",
  "Satkhira",
  "Shariatpur",
  "Sherpur",
  "Sirajganj",
  "Sunamganj",
  "Sylhet",
  "Tangail",
  "Thakurgaon",
] as const;

export const deliveryZoneLabels: Record<DeliveryZone, string> = {
  "inside-dhaka": "Inside Dhaka",
  "outside-dhaka": "Outside Dhaka",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  COD: "Cash on Delivery",
  bKash: "bKash",
  Nagad: "Nagad",
};

export function normalizeBangladeshPhone(value: string) {
  const compact = value.replace(/[\s()-]/g, "");

  if (/^01[3-9]\d{8}$/.test(compact)) {
    return compact;
  }

  if (/^8801[3-9]\d{8}$/.test(compact)) {
    return "0" + compact.slice(3);
  }

  if (/^\+8801[3-9]\d{8}$/.test(compact)) {
    return "0" + compact.slice(4);
  }

  return value.trim();
}

export function isValidBangladeshPhone(value: string) {
  return /^01[3-9]\d{8}$/.test(normalizeBangladeshPhone(value));
}
