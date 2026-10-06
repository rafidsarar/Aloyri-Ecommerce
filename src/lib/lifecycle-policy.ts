export type LifecycleTrigger =
  | "abandoned-cart"
  | "post-delivery-follow-up"
  | "review-request"
  | "reorder-reminder"
  | "back-in-stock";

export type LifecyclePolicy = {
  trigger: LifecycleTrigger;
  description: string;
  timing: string;
  requiresConsent: boolean;
  source: "website" | "crm";
};

export const lifecyclePolicies: LifecyclePolicy[] = [
  {
    trigger: "abandoned-cart",
    description: "One secure saved-cart reminder after an opted-in checkout is left unfinished.",
    timing: "2 hours after opt-in capture",
    requiresConsent: true,
    source: "website",
  },
  {
    trigger: "post-delivery-follow-up",
    description: "Customer-care follow-up after CRM confirms delivery.",
    timing: "3 days after delivery",
    requiresConsent: true,
    source: "crm",
  },
  {
    trigger: "review-request",
    description: "Verified-purchase review invitation after the customer has had time to use the product.",
    timing: "7 days after delivery",
    requiresConsent: true,
    source: "crm",
  },
  {
    trigger: "reorder-reminder",
    description: "Category-based replenishment reminder using the same conservative window as the customer hub.",
    timing: "45–60+ days after delivery depending on category and quantity",
    requiresConsent: true,
    source: "crm",
  },
  {
    trigger: "back-in-stock",
    description: "Availability notification only after a customer explicitly asks to watch an unavailable product.",
    timing: "Event-driven after CRM stock becomes available",
    requiresConsent: true,
    source: "crm",
  },
];

function isoDate(value: string) {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value + "T12:00:00.000Z"
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

export function lifecyclePlanForDelivery(input: {
  deliveredAt: string;
  categoryDays: number[];
}) {
  const delivered = isoDate(input.deliveredAt);
  if (!delivered) return [];

  const validCategoryDays = input.categoryDays.filter(
    (value) => Number.isFinite(value) && value > 0,
  );
  const reorderDays = validCategoryDays.length
    ? Math.min(...validCategoryDays)
    : 60;

  return [
    {
      trigger: "post-delivery-follow-up" as const,
      dueAt: addDays(delivered, 3).toISOString(),
    },
    {
      trigger: "review-request" as const,
      dueAt: addDays(delivered, 7).toISOString(),
    },
    {
      trigger: "reorder-reminder" as const,
      dueAt: addDays(delivered, Math.max(21, Math.round(reorderDays * 0.82))).toISOString(),
    },
  ];
}
