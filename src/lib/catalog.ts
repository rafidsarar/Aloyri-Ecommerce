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
  featured?: boolean;
  bestseller?: boolean;
  visual: ProductVisual;
  active?: boolean;
  availableStock?: number;
  live?: boolean;
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
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
          name: live.name,
          brand: live.brand,
          size: live.size,
          category: live.category,
          price: live.price,
          active: true,
          availableStock: live.availableStock,
          live: true,
        };
      }

      return {
        id: live.id,
        slug: live.id,
        brand: live.brand,
        name: live.name,
        size: live.size,
        category: live.category,
        price: live.price,
        description: `${live.name} by ${live.brand || "Aloyri"}, available through the Aloyri skincare edit.`,
        routineStep: routineForCategory(live.category),
        skinNote: "See the product packaging and brand guidance for usage details.",
        visual: categoryVisuals[live.category] ?? fallbackVisual,
        active: true,
        availableStock: live.availableStock,
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
