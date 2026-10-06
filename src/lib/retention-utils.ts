import type { Product } from "@/lib/catalog";

export type ReplenishmentStatus = "later" | "soon" | "due";
export type CustomerLifecycleState =
  | "New"
  | "Active"
  | "Reorder due"
  | "Returning"
  | "At risk"
  | "Re-engaged";

export type ReplenishmentEstimate = {
  status: ReplenishmentStatus;
  estimatedFrom: string;
  estimatedTo: string;
  baseDays: number;
};

const REPLENISHMENT_DAYS: Record<string, number> = {
  Cleanser: 60,
  Moisturizer: 60,
  Sunscreen: 45,
};

function utcDate(value: string) {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value + "T12:00:00.000Z"
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function replenishmentDays(category: string) {
  return REPLENISHMENT_DAYS[category] || 60;
}

export function replenishmentEstimate(
  deliveredAt: string,
  category: string,
  qty = 1,
  now = new Date(),
): ReplenishmentEstimate | null {
  const delivered = utcDate(deliveredAt);
  if (!delivered) return null;

  const multiplier = Math.max(1, Math.min(6, Math.trunc(qty) || 1));
  const baseDays = replenishmentDays(category) * multiplier;
  const fromDays = Math.max(21, Math.round(baseDays * 0.82));
  const toDays = Math.round(baseDays * 1.18);
  const from = addDays(delivered, fromDays);
  const to = addDays(delivered, toDays);

  return {
    status: now >= to ? "due" : now >= from ? "soon" : "later",
    estimatedFrom: from.toISOString().slice(0, 10),
    estimatedTo: to.toISOString().slice(0, 10),
    baseDays,
  };
}

function productRank(product: Product) {
  let score = 0;
  if (product.bestseller) score += 30;
  if (product.featured) score += 18;
  score += Math.min(20, Math.max(-20, Math.round((product.merchandisingPriority || 0) / 25)));
  score += Math.min(12, Math.max(0, product.availableStock || 0));
  return score;
}

export function buildRoutineSuggestions(
  purchasedIds: string[],
  catalog: Product[],
  max = 3,
) {
  const purchased = new Set(purchasedIds);
  const purchasedCategories = new Set(
    catalog
      .filter((product) => purchased.has(product.id))
      .map((product) => product.category),
  );
  const categories = ["Cleanser", "Moisturizer", "Sunscreen"];
  const output: Product[] = [];

  for (const category of categories) {
    if (output.length >= max || purchasedCategories.has(category)) continue;
    const candidate = catalog
      .filter(
        (product) =>
          product.category === category &&
          !purchased.has(product.id) &&
          product.active !== false &&
          (product.availableStock ?? 0) > 0,
      )
      .sort((a, b) => productRank(b) - productRank(a) || a.name.localeCompare(b.name))[0];
    if (candidate) output.push(candidate);
  }

  if (output.length < max) {
    for (const candidate of [...catalog]
      .filter(
        (product) =>
          !purchased.has(product.id) &&
          !output.some((row) => row.id === product.id) &&
          product.active !== false &&
          (product.availableStock ?? 0) > 0,
      )
      .sort((a, b) => productRank(b) - productRank(a) || a.name.localeCompare(b.name))) {
      if (output.length >= max) break;
      output.push(candidate);
    }
  }

  return output;
}

export function customerLifecycleState(
  orderDates: string[],
  latestCategories: string[] = [],
  now = new Date(),
): CustomerLifecycleState {
  const dates = orderDates
    .map(utcDate)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());

  if (!dates.length) return "New";

  const latest = dates[dates.length - 1];
  const daysSinceLatest = Math.max(
    0,
    Math.floor((now.getTime() - latest.getTime()) / (24 * 60 * 60 * 1000)),
  );

  if (dates.length >= 2) {
    const previous = dates[dates.length - 2];
    const latestGap = Math.floor(
      (latest.getTime() - previous.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (latestGap >= 90 && daysSinceLatest <= 30) return "Re-engaged";
  }

  if (daysSinceLatest > 120) return "At risk";

  const expectedDays = latestCategories.length
    ? Math.min(...latestCategories.map(replenishmentDays))
    : 60;
  if (daysSinceLatest >= Math.round(expectedDays * 0.85)) return "Reorder due";

  if (dates.length >= 2) return "Returning";
  if (daysSinceLatest <= 30) return "New";
  return "Active";
}
