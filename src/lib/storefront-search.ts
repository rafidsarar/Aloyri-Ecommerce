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

function editDistance(left: string, right: string) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function fuzzyDistance(token: string, word: string) {
  if (token.length < 4 || word.length < 4) return null;
  const maxDistance = token.length >= 7 ? 2 : 1;
  if (Math.abs(token.length - word.length) > maxDistance) return null;
  const distance = editDistance(token, word);
  return distance <= maxDistance ? distance : null;
}

function tokenScore(field: string, token: string, weight: number) {
  if (!field || !token) return 0;
  if (field === token) return weight * 5;

  const words = field.split(" ");
  if (words.includes(token)) return weight * 4;
  if (words.some((word) => word.startsWith(token))) return weight * 3;
  if (field.includes(token)) return weight * 2;

  let bestFuzzy = 0;
  for (const word of words) {
    const distance = fuzzyDistance(token, word);
    if (distance === null) continue;
    bestFuzzy = Math.max(
      bestFuzzy,
      distance === 1 ? Math.max(1, weight * 2) : Math.max(1, weight),
    );
  }
  return bestFuzzy;
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

export function getSearchSuggestions(
  products: Product[],
  query: string,
  limit = 6,
) {
  const normalized = normalizeSearchText(query);
  if (normalized.length < 2) return [];

  return products
    .map((product) => ({
      product,
      score: productSearchScore(product, normalized),
    }))
    .filter((row) => row.score >= 0)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .slice(0, Math.max(1, Math.min(10, limit)))
    .map((row) => row.product);
}
