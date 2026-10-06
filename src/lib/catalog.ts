export type ProductCategory = string;

export type ProductVisual = {
  from: string;
  to: string;
  accent: string;
  ink: string;
  package: "tube" | "bottle" | "pump";
};

export type Product = {
  id: string;
  slug: string;
  brand: string;
  name: string;
  size: string;
  origin?: string;
  category: ProductCategory;
  price: number;
  description: string;
  routineStep: string;
  skinNote: string;
  texture: string;
  bestFor: string;
  howToUse: string[];
  careNotes: string[];
  ingredientNote: string;
  featured?: boolean;
  bestseller?: boolean;
  visual: ProductVisual;
  active?: boolean;
  availableStock?: number;
  live?: boolean;
  salePrice?: number;
  promotionBadge?: string;
  mediaPath?: string;
  merchandisingBadge?: string;
  merchandisingPriority?: number;
  merchandisingOutOfStockMode?: "keep" | "push-down" | "hide";
};

export type LiveCatalogProduct = {
  id: string;
  name: string;
  brand: string;
  size: string;
  category: string;
  price: number;
  active: boolean;
  availableStock: number;
  salePrice?: number;
  promotionBadge?: string;
  slug?: string;
  description?: string;
  routineStep?: string;
  skinNote?: string;
  texture?: string;
  bestFor?: string;
  howToUse?: string[];
  careNotes?: string[];
  ingredientNote?: string;
  featured?: boolean;
  bestseller?: boolean;
  mediaPath?: string;
  merchandisingBadge?: string;
  merchandisingPriority?: number;
  merchandisingOutOfStockMode?: "keep" | "push-down" | "hide";
};

const categoryVisuals: Record<string, ProductVisual> = {
  Cleanser: {
    from: "#d7e9ef",
    to: "#f4fbfd",
    accent: "#4c93a8",
    ink: "#204f60",
    package: "tube",
  },
  Moisturizer: {
    from: "#dfeade",
    to: "#fbfcf7",
    accent: "#8db58a",
    ink: "#315d38",
    package: "bottle",
  },
  Sunscreen: {
    from: "#f3dfcc",
    to: "#fff9ef",
    accent: "#d88d59",
    ink: "#7b4b2e",
    package: "tube",
  },
};

const fallbackVisual: ProductVisual = {
  from: "#eadfd9",
  to: "#fffaf7",
  accent: "#b9725f",
  ink: "#713a35",
  package: "bottle",
};

function routineForCategory(category: string) {
  if (category === "Cleanser") return "Step 1 · Cleanse";
  if (category === "Moisturizer") return "Step 2 · Moisturize";
  if (category === "Sunscreen") return "Step 3 · Protect";
  return "Aloyri skincare";
}

/**
 * Local data is merchandising only: descriptions, visuals, SEO slugs and
 * editorial badges. Live CRM data overrides operational fields at runtime.
 */
export const products: Product[] = [
  {
    id: "simple-wash",
    slug: "simple-refreshing-facial-wash",
    brand: "Simple",
    name: "Refreshing Facial Wash",
    size: "150ml",
    origin: "Poland",
    category: "Cleanser",
    price: 749,
    description:
      "A straightforward everyday facial wash for a fresh, comfortable cleanse without making the routine feel complicated.",
    routineStep: "Step 1 · Cleanse",
    skinNote: "A practical daily cleanser for simple morning and evening routines.",
    featured: true,
    bestseller: true,
    texture: "Rinse-off facial wash",
    bestFor: "A simple everyday cleansing step before moisturiser.",
    howToUse: [
      "Wet the face with comfortable-temperature water.",
      "Massage a small amount over the face with light pressure.",
      "Rinse thoroughly and continue with moisturiser.",
    ],
    careNotes: [
      "Avoid direct contact with the eyes.",
      "If the product feels uncomfortable on your skin, stop use and review the pack guidance.",
    ],
    ingredientNote:
      "For the current ingredient list, check the product packaging. Aloyri does not publish an ingredient list until it has been verified against the exact item supplied.",
    visual: {
      from: "#d9e8df",
      to: "#f5faf6",
      accent: "#66a184",
      ink: "#215642",
      package: "tube",
    },
  },
  {
    id: "simple-light",
    slug: "simple-hydrating-light-moisturiser",
    brand: "Simple",
    name: "Hydrating Light Moisturiser",
    size: "125ml",
    origin: "Hungary",
    category: "Moisturizer",
    price: 749,
    description:
      "A light everyday moisturiser for routines that call for hydration with an easy, comfortable finish.",
    routineStep: "Step 2 · Moisturize",
    skinNote: "A lighter texture for everyday use and layered routines.",
    featured: true,
    texture: "Lightweight moisturiser",
    bestFor: "Shoppers who prefer a lighter moisturising step in an everyday routine.",
    howToUse: [
      "Apply after cleansing to clean, comfortable skin.",
      "Spread an even amount across the face and neck.",
      "In the morning, follow with sunscreen as the final skincare step.",
    ],
    careNotes: [
      "Use the amount and frequency that feel comfortable for your routine.",
      "If irritation occurs, discontinue use and check the package guidance.",
    ],
    ingredientNote:
      "For the current ingredient list, check the product packaging. Aloyri does not publish an ingredient list until it has been verified against the exact item supplied.",
    visual: {
      from: "#dfeade",
      to: "#fbfcf7",
      accent: "#8db58a",
      ink: "#315d38",
      package: "bottle",
    },
  },
  {
    id: "simple-rich",
    slug: "simple-replenishing-rich-moisturizer",
    brand: "Simple",
    name: "Replenishing Rich Moisturizer",
    size: "125ml",
    category: "Moisturizer",
    price: 775,
    description:
      "A richer daily moisturiser for moments when your routine needs a more comforting, cushioned final step.",
    routineStep: "Step 2 · Moisturize",
    skinNote: "A richer option for drier-feeling days or night routines.",
    texture: "Richer moisturiser",
    bestFor: "Routines that call for a more cushioned moisturising finish.",
    howToUse: [
      "Apply after cleansing to the face and neck.",
      "Use a comfortable amount and spread evenly.",
      "For daytime use, finish the routine with sunscreen.",
    ],
    careNotes: [
      "Adjust the amount to suit how your skin feels that day.",
      "If irritation occurs, discontinue use and review the package guidance.",
    ],
    ingredientNote:
      "For the current ingredient list, check the product packaging. Aloyri does not publish an ingredient list until it has been verified against the exact item supplied.",
    visual: {
      from: "#d7eadf",
      to: "#f6fbf7",
      accent: "#6fa478",
      ink: "#2e5a38",
      package: "bottle",
    },
  },
  {
    id: "skin-cafe",
    slug: "skin-cafe-lightweight-sunscreen-spf50",
    brand: "Skin Cafe",
    name: "Lightweight Sunscreen SPF50 PA+++",
    size: "60g",
    category: "Sunscreen",
    price: 549,
    description:
      "A daily sunscreen option selected for a simple final step before heading out, with a lightweight positioning for everyday wear.",
    routineStep: "Step 3 · Protect",
    skinNote: "Daily sun protection belongs at the end of the morning routine.",
    featured: true,
    texture: "Daily sunscreen",
    bestFor: "A straightforward final morning skincare step before going outdoors.",
    howToUse: [
      "Use as the final step of the morning skincare routine.",
      "Apply evenly to exposed skin according to the directions on the product packaging.",
      "Reapply as directed on the pack, especially when wear may have been reduced by wiping, water or perspiration.",
    ],
    careNotes: [
      "Sunscreen should not replace shade, clothing or other sensible sun-protection measures.",
      "Follow the exact application and reapplication directions printed on the product.",
    ],
    ingredientNote:
      "For the current ingredient list and sunscreen directions, check the product packaging. Aloyri publishes verified formulation details only when matched to the exact item supplied.",
    visual: {
      from: "#f3dfcc",
      to: "#fff9ef",
      accent: "#d88d59",
      ink: "#7b4b2e",
      package: "tube",
    },
  },
  {
    id: "skin-aqua",
    slug: "rohto-skin-aqua-super-moisture-uv-gel",
    brand: "Rohto",
    name: "Skin Aqua Super Moisture UV Gel",
    size: "110g · SPF50+ PA++++",
    category: "Sunscreen",
    price: 1350,
    description:
      "A generous-size sunscreen gel from Rohto, positioned as a lightweight daily protection step for regular use.",
    routineStep: "Step 3 · Protect",
    skinNote: "A gel-format sunscreen for daily morning routines.",
    bestseller: true,
    texture: "Gel-format sunscreen",
    bestFor: "Shoppers looking for a sunscreen in a larger gel-format presentation.",
    howToUse: [
      "Use as the last step of the morning skincare routine.",
      "Apply evenly to exposed skin following the directions on the product packaging.",
      "Reapply according to the pack directions, particularly when wear may have been reduced.",
    ],
    careNotes: [
      "Sunscreen works best as part of broader sun-protection habits.",
      "Follow the exact application, reapplication and caution statements on the package.",
    ],
    ingredientNote:
      "For the current ingredient list and sunscreen directions, check the product packaging. Aloyri publishes verified formulation details only when matched to the exact item supplied.",
    visual: {
      from: "#e9edf7",
      to: "#fbfcff",
      accent: "#7198d8",
      ink: "#315b9f",
      package: "pump",
    },
  },
  {
    id: "cosrx",
    slug: "cosrx-low-ph-good-morning-gel-cleanser",
    brand: "COSRX",
    name: "Low pH Good Morning Gel Cleanser",
    size: "50ml",
    category: "Cleanser",
    price: 580,
    description:
      "A compact low-pH gel cleanser from COSRX for an uncomplicated cleansing step at the start or end of the day.",
    routineStep: "Step 1 · Cleanse",
    skinNote: "A gel cleanser format that fits neatly into a simple routine.",
    featured: true,
    bestseller: true,
    texture: "Gel cleanser",
    bestFor: "A compact gel-cleansing step in a simple morning or evening routine.",
    howToUse: [
      "Wet the face with comfortable-temperature water.",
      "Massage a small amount gently over the face.",
      "Rinse thoroughly, then continue with the next steps in your routine.",
    ],
    careNotes: [
      "Avoid direct contact with the eyes.",
      "If the product feels uncomfortable on your skin, stop use and review the pack guidance.",
    ],
    ingredientNote:
      "For the current ingredient list, check the product packaging. Aloyri does not publish an ingredient list until it has been verified against the exact item supplied.",
    visual: {
      from: "#d7e9ef",
      to: "#f4fbfd",
      accent: "#4c93a8",
      ink: "#204f60",
      package: "tube",
    },
  },
];

export const featuredProducts = products.filter((product) => product.featured);
export const bestsellers = products.filter((product) => product.bestseller);
export const categories: ProductCategory[] = ["Cleanser", "Moisturizer", "Sunscreen"];

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug || product.id === slug);
}

export function getProductById(id: string) {
  return products.find((product) => product.id === id);
}

export function mergeLiveCatalog(liveProducts: LiveCatalogProduct[]): Product[] {
  return liveProducts
    .filter((product) => product.active)
    .map((live) => {
      const local = getProductById(live.id);
      if (local) {
        return {
          ...local,
          ...(live.slug ? { slug: live.slug } : {}),
          ...(live.description ? { description: live.description } : {}),
          ...(live.routineStep ? { routineStep: live.routineStep } : {}),
          ...(live.skinNote ? { skinNote: live.skinNote } : {}),
          ...(live.texture ? { texture: live.texture } : {}),
          ...(live.bestFor ? { bestFor: live.bestFor } : {}),
          ...(live.howToUse?.length ? { howToUse: live.howToUse } : {}),
          ...(live.careNotes?.length ? { careNotes: live.careNotes } : {}),
          ...(live.ingredientNote ? { ingredientNote: live.ingredientNote } : {}),
          ...(typeof live.featured === "boolean" ? { featured: live.featured } : {}),
          ...(typeof live.bestseller === "boolean"
            ? { bestseller: live.bestseller }
            : {}),
          ...(live.mediaPath ? { mediaPath: live.mediaPath } : {}),
          name: live.name,
          brand: live.brand,
          size: live.size,
          category: live.category,
          price: live.price,
          active: true,
          availableStock: live.availableStock,
          salePrice: live.salePrice,
          promotionBadge: live.promotionBadge,
          merchandisingBadge: live.merchandisingBadge,
          merchandisingPriority: live.merchandisingPriority,
          merchandisingOutOfStockMode: live.merchandisingOutOfStockMode,
          live: true,
        };
      }

      return {
        id: live.id,
        slug: live.slug || live.id,
        brand: live.brand,
        name: live.name,
        size: live.size,
        category: live.category,
        price: live.price,
        description:
          live.description ||
          `${live.name} by ${live.brand || "Aloyri"}, available through the Aloyri skincare edit.`,
        routineStep: live.routineStep || routineForCategory(live.category),
        skinNote:
          live.skinNote ||
          "See the product packaging and brand guidance for usage details.",
        texture:
          live.texture ||
          (live.category === "Cleanser"
            ? "Facial cleanser"
            : live.category === "Moisturizer"
              ? "Moisturiser"
              : live.category === "Sunscreen"
                ? "Daily sunscreen"
                : "Skincare product"),
        bestFor:
          live.bestFor ||
          "Aloyri shoppers looking for a clear, uncomplicated place for this product in their routine.",
        howToUse:
          live.howToUse?.length
            ? live.howToUse
            : [
                "Follow the directions printed on the product packaging.",
                "Use the product only for its intended skincare purpose.",
              ],
        careNotes:
          live.careNotes?.length
            ? live.careNotes
            : [
                "Check the package for current warnings, directions and storage guidance.",
                "Discontinue use if the product causes discomfort.",
              ],
        ingredientNote:
          live.ingredientNote ||
          "Check the exact product packaging for the current ingredient list. Aloyri publishes formulation details only after they are verified against the item supplied.",
        featured: live.featured,
        bestseller: live.bestseller,
        ...(live.mediaPath ? { mediaPath: live.mediaPath } : {}),
        visual: categoryVisuals[live.category] ?? fallbackVisual,
        active: true,
        availableStock: live.availableStock,
        salePrice: live.salePrice,
        promotionBadge: live.promotionBadge,
        merchandisingBadge: live.merchandisingBadge,
        merchandisingPriority: live.merchandisingPriority,
        merchandisingOutOfStockMode: live.merchandisingOutOfStockMode,
        live: true,
      } satisfies Product;
    });
}

export function productStockLabel(product: Product) {
  if (product.availableStock === undefined) return "Checking stock";
  if (product.availableStock <= 0) return "Out of stock";
  if (product.availableStock <= 5) return `Only ${product.availableStock} left`;
  return "In stock";
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(price);
}
