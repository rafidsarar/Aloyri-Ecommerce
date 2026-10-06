import type { Product } from "@/lib/catalog";

export type RecommendationFallbackMode =
  | "category-and-routine"
  | "category"
  | "off";

export type ProductRecommendationRule = {
  relatedProductIds: string[];
  routineProductIds: string[];
  boost: number;
  hidden: boolean;
};

export type RecommendationConfig = {
  enabled: boolean;
  fallbackMode: RecommendationFallbackMode;
  maxRelated: number;
  maxRoutine: number;
  rules: Record<string, ProductRecommendationRule>;
};

export type ProductRecommendationSet = {
  related: Product[];
  routine: Product[];
};

export const defaultRecommendationConfig: RecommendationConfig = {
  enabled: true,
  fallbackMode: "category-and-routine",
  maxRelated: 3,
  maxRoutine: 3,
  rules: {},
};

function safeId(value: unknown) {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(normalized)
    ? normalized
    : "";
}

function normalizedIds(value: unknown, sourceId: string) {
  if (!Array.isArray(value)) return [] as string[];
  return [...new Set(
    value
      .map((item) => safeId(item))
      .filter((item) => item && item !== sourceId),
  )].slice(0, 12);
}

function bounded(value: unknown, fallback: number, min: number, max: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(numeric)));
}

export function normalizeRecommendationConfig(
  value?: Partial<RecommendationConfig> | null,
): RecommendationConfig {
  const mode =
    value?.fallbackMode === "category" || value?.fallbackMode === "off"
      ? value.fallbackMode
      : "category-and-routine";
  const rules: Record<string, ProductRecommendationRule> = {};

  if (value?.rules && typeof value.rules === "object") {
    for (const [rawId, rawRule] of Object.entries(value.rules)) {
      const id = safeId(rawId);
      if (!id || !rawRule || typeof rawRule !== "object") continue;
      const rule = rawRule as Partial<ProductRecommendationRule>;
      const relatedProductIds = normalizedIds(rule.relatedProductIds, id);
      const routineProductIds = normalizedIds(rule.routineProductIds, id);
      const boost = bounded(rule.boost, 0, -100, 100);
      const hidden = Boolean(rule.hidden);

      if (
        relatedProductIds.length ||
        routineProductIds.length ||
        boost !== 0 ||
        hidden
      ) {
        rules[id] = {
          relatedProductIds,
          routineProductIds,
          boost,
          hidden,
        };
      }
    }
  }

  return {
    enabled: value?.enabled !== false,
    fallbackMode: mode,
    maxRelated: bounded(value?.maxRelated, 3, 1, 6),
    maxRoutine: bounded(value?.maxRoutine, 3, 1, 6),
    rules,
  };
}

function candidateAvailable(product: Product, config: RecommendationConfig) {
  if (product.active === false) return false;
  if ((product.availableStock ?? 1) <= 0) return false;
  return !config.rules[product.id]?.hidden;
}

function scoreCandidate(
  source: Product,
  candidate: Product,
  config: RecommendationConfig,
) {
  const rule = config.rules[candidate.id];
  let score = rule?.boost || 0;
  if (candidate.bestseller) score += 30;
  if (candidate.featured) score += 18;
  if (candidate.brand === source.brand) score += 8;
  score += Math.max(
    -20,
    Math.min(20, Math.round((candidate.merchandisingPriority || 0) / 25)),
  );

  const priceDistance = Math.abs(candidate.price - source.price);
  if (priceDistance <= 150) score += 8;
  else if (priceDistance <= 400) score += 4;

  return score;
}

function ranked(
  source: Product,
  candidates: Product[],
  config: RecommendationConfig,
) {
  return [...candidates].sort((a, b) => {
    const delta =
      scoreCandidate(source, b, config) - scoreCandidate(source, a, config);
    return delta || a.name.localeCompare(b.name);
  });
}

function explicitProducts(
  ids: string[],
  byId: Map<string, Product>,
  config: RecommendationConfig,
  used: Set<string>,
) {
  const output: Product[] = [];
  for (const id of ids) {
    const product = byId.get(id);
    if (!product || used.has(id) || !candidateAvailable(product, config)) {
      continue;
    }
    used.add(id);
    output.push(product);
  }
  return output;
}

export function buildProductRecommendations(
  source: Product,
  products: Product[],
  rawConfig: RecommendationConfig,
): ProductRecommendationSet {
  const config = normalizeRecommendationConfig(rawConfig);
  if (!config.enabled) return { related: [], routine: [] };

  const candidates = products.filter(
    (candidate) =>
      candidate.id !== source.id && candidateAvailable(candidate, config),
  );
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const sourceRule = config.rules[source.id];
  const relatedUsed = new Set<string>([source.id]);

  const related = explicitProducts(
    sourceRule?.relatedProductIds || [],
    byId,
    config,
    relatedUsed,
  );

  if (
    related.length < config.maxRelated &&
    config.fallbackMode !== "off"
  ) {
    const fallback = ranked(
      source,
      candidates.filter(
        (candidate) =>
          candidate.category === source.category &&
          !relatedUsed.has(candidate.id),
      ),
      config,
    );
    for (const candidate of fallback) {
      if (related.length >= config.maxRelated) break;
      relatedUsed.add(candidate.id);
      related.push(candidate);
    }
  }

  const routineUsed = new Set<string>([
    source.id,
    ...related.map((product) => product.id),
  ]);
  const routine = explicitProducts(
    sourceRule?.routineProductIds || [],
    byId,
    config,
    routineUsed,
  );

  if (
    routine.length < config.maxRoutine &&
    config.fallbackMode === "category-and-routine"
  ) {
    const routineOrder = ["Cleanser", "Moisturizer", "Sunscreen"];
    for (const category of routineOrder) {
      if (routine.length >= config.maxRoutine) break;
      if (category === source.category) continue;
      const best = ranked(
        source,
        candidates.filter(
          (candidate) =>
            candidate.category === category &&
            !routineUsed.has(candidate.id),
        ),
        config,
      )[0];
      if (best) {
        routineUsed.add(best.id);
        routine.push(best);
      }
    }

    if (routine.length < config.maxRoutine) {
      for (const candidate of ranked(
        source,
        candidates.filter(
          (candidate) =>
            candidate.category !== source.category &&
            !routineUsed.has(candidate.id),
        ),
        config,
      )) {
        if (routine.length >= config.maxRoutine) break;
        routineUsed.add(candidate.id);
        routine.push(candidate);
      }
    }
  }

  return {
    related: related.slice(0, config.maxRelated),
    routine: routine.slice(0, config.maxRoutine),
  };
}

export function recommendationPlacementId(
  kind: "related" | "routine",
  productId: string,
) {
  const safe = productId.replace(/[^A-Za-z0-9_-]/g, "-");
  return ("rec-" + kind + "-" + safe).slice(0, 80);
}
