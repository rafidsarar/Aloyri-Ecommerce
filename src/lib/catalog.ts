export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: "Cleanser" | "Serum" | "Moisturizer" | "Sunscreen" | "Essence" | "Balm";
  size: string;
  price: number;
  compareAtPrice?: number;
  description: string;
  skinTypes: string[];
  featured?: boolean;
  newArrival?: boolean;
  visual: string;
};

export const products: Product[] = [
  {
    id: "alo-cleanser-01",
    slug: "gentle-gel-cleanser",
    name: "Gentle Gel Cleanser",
    brand: "Aloyri Edit",
    category: "Cleanser",
    size: "150 ml",
    price: 1390,
    description: "A low-foam daily cleanser designed to refresh skin without leaving it tight or stripped.",
    skinTypes: ["Normal", "Combination", "Sensitive"],
    featured: true,
    visual: "linear-gradient(145deg, #e7d9cc 0%, #f9f4ef 48%, #c2a78f 100%)",
  },
  {
    id: "alo-serum-01",
    slug: "brightening-serum",
    name: "Brightening Serum",
    brand: "Aloyri Edit",
    category: "Serum",
    size: "30 ml",
    price: 1890,
    compareAtPrice: 2090,
    description: "A lightweight serum selected for a brighter-looking, more even and refreshed complexion.",
    skinTypes: ["Normal", "Dry", "Combination"],
    featured: true,
    newArrival: true,
    visual: "linear-gradient(145deg, #d9c8ba 0%, #f4ece5 52%, #b69782 100%)",
  },
  {
    id: "alo-essence-01",
    slug: "calm-water-essence",
    name: "Calm Water Essence",
    brand: "Aloyri Edit",
    category: "Essence",
    size: "100 ml",
    price: 1690,
    description: "A fluid hydration step with a soft finish, curated for skin that feels stressed or dehydrated.",
    skinTypes: ["Dry", "Sensitive", "Combination"],
    featured: true,
    visual: "linear-gradient(145deg, #d9ddd8 0%, #f7f7f2 48%, #aeb8ad 100%)",
  },
  {
    id: "alo-moisturizer-01",
    slug: "barrier-comfort-cream",
    name: "Barrier Comfort Cream",
    brand: "Aloyri Edit",
    category: "Moisturizer",
    size: "60 ml",
    price: 1790,
    description: "A comforting moisturizer with a cushiony texture for everyday barrier support.",
    skinTypes: ["Dry", "Normal", "Sensitive"],
    newArrival: true,
    visual: "linear-gradient(145deg, #ead8d1 0%, #f8f2ef 46%, #caa9a0 100%)",
  },
  {
    id: "alo-spf-01",
    slug: "daily-fluid-spf50",
    name: "Daily Fluid SPF 50",
    brand: "Aloyri Edit",
    category: "Sunscreen",
    size: "50 ml",
    price: 1590,
    description: "A lightweight everyday sunscreen selected for comfortable wear in warm, humid weather.",
    skinTypes: ["All skin types"],
    newArrival: true,
    visual: "linear-gradient(145deg, #eee1c4 0%, #fbf7ec 50%, #d9bd7e 100%)",
  },
  {
    id: "alo-balm-01",
    slug: "soft-melt-cleansing-balm",
    name: "Soft Melt Cleansing Balm",
    brand: "Aloyri Edit",
    category: "Balm",
    size: "90 g",
    price: 1490,
    description: "A soft cleansing balm that melts through sunscreen and makeup before rinsing clean.",
    skinTypes: ["Normal", "Dry", "Combination"],
    visual: "linear-gradient(145deg, #ded7c9 0%, #f7f3ea 48%, #b9aa8f 100%)",
  },
];

export const featuredProducts = products.filter((product) => product.featured);
export const newArrivals = products.filter((product) => product.newArrival);

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
