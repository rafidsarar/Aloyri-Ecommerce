import type { Product } from "@/lib/catalog";

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenScore(field: string, token: string, weight: number) {
  if (!field || !token) return 0;
  if (field === token) return weight * 5;

  const words = field.split(" ");
  if (words.includes(token)) return weight * 4;
  if (words.some((word) => word.startsWith(token))) return weight * 3;
  if (field.includes(token)) return weight * 2;
  return 0;
}

export function productSearchScore(product: Product, query: string) {
  const phrase = normalizeSearchText(query);
  if (!phrase) return 0;

  const fields = [
    [normalizeSearchText(product.name), 14],
    [normalizeSearchText(product.brand), 12],
    [normalizeSearchText(product.category), 10],
    [normalizeSearchText(product.size), 5],
    [normalizeSearchText(product.texture), 6],
    [normalizeSearchText(product.routineStep), 5],
    [normalizeSearchText(product.bestFor), 4],
    [normalizeSearchText(product.skinNote), 3],
    [normalizeSearchText(product.description), 2],
  ] as const;

  let score = 0;

  if (fields[0][0] === phrase) score += 220;
  else if (fields[0][0].startsWith(phrase)) score += 150;
  else if (fields[0][0].includes(phrase)) score += 100;

  if (fields[1][0] === phrase) score += 150;
  else if (fields[1][0].startsWith(phrase)) score += 100;
  else if (fields[1][0].includes(phrase)) score += 65;

  if (fields[2][0] === phrase) score += 100;
  else if (fields[2][0].startsWith(phrase)) score += 70;

  const tokens = phrase.split(" ").filter(Boolean);
  for (const token of tokens) {
    let best = 0;
    for (const [field, weight] of fields) {
      best = Math.max(best, tokenScore(field, token, weight));
    }
    if (best === 0) return -1;
    score += best;
  }

  if (product.featured) score += 2;
  if (product.bestseller) score += 2;

  return score;
}
