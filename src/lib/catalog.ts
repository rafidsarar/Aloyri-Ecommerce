export type ProductCategory = "Cleanser" | "Moisturizer" | "Sunscreen";

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
  visual: {
    from: string;
    to: string;
    accent: string;
    ink: string;
    package: "tube" | "bottle" | "pump";
  };
};

/**
 * Storefront catalog mirrors the product IDs, names, sizes, categories and
 * selling prices already defined by the Aloyri CRM starter catalog.
 * Costs and internal inventory information intentionally stay out of the store.
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
  return products.find((product) => product.slug === slug);
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(price);
}
