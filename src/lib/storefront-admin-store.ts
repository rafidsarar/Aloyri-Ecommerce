import "server-only";

import {
  createStructuredJsonOnce,
  listStructuredJson,
  readStructuredJson,
  structuredDatastoreConfigured,
  writeStructuredJson,
} from "@/lib/structured-record-store";
import { draftMode } from "next/headers";
import { connection } from "next/server";
import { listMediaObjects, mediaStorageConfigured, putMediaObject } from "@/lib/media-storage";
import type { LiveCatalogProduct } from "@/lib/catalog";
import {
  defaultRecommendationConfig,
  normalizeRecommendationConfig,
  type RecommendationConfig,
} from "@/lib/recommendations";

export type ContentSection = {
  title: string;
  paragraphs: string[];
  bullets: string[];
};

export type InfoPageContent = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: ContentSection[];
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type ProductEditorial = {
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
};

export type OutOfStockMode = "keep" | "push-down" | "hide";

export type ProductMerchandisingRule = {
  badge?: string;
  priority?: number;
  searchBoost?: number;
  hideFromSearch?: boolean;
  outOfStockMode?: "inherit" | OutOfStockMode;
};

export type MerchandisingCollection = {
  id: string;
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  active: boolean;
  productIds: string[];
  outOfStockMode: "inherit" | OutOfStockMode;
  imagePath?: string;
  seo: SeoEntry;
  createdAt: string;
  updatedAt: string;
};

export type MerchandisingCampaign = {
  id: string;
  title: string;
  eyebrow: string;
  copy: string;
  active: boolean;
  startAt: string;
  endAt: string;
  ctaLabel: string;
  ctaHref: string;
  imagePath?: string;
  collectionId?: string;
  productIds: string[];
  outOfStockMode: "inherit" | OutOfStockMode;
  badgeText?: string;
  showProducts: boolean;
  promotionOnly: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HomepageMerchandisingSectionKind =
  | "bestsellers"
  | "featured"
  | "new-arrivals"
  | "collection"
  | "campaign";

export type HomepageMerchandisingSection = {
  id: string;
  kind: HomepageMerchandisingSectionKind;
  enabled: boolean;
  eyebrow: string;
  title: string;
  copy: string;
  referenceId?: string;
  maxProducts: number;
};

export type DiscoveryConfig = {
  synonymGroups: string[][];
  categoryOrder: string[];
  popularSearches: string[];
};

export type MerchandisingConfig = {
  outOfStockMode: OutOfStockMode;
  shopSortMode: "priority" | "featured";
  productRules: Record<string, ProductMerchandisingRule>;
  discovery: DiscoveryConfig;
  recommendations: RecommendationConfig;
  collections: MerchandisingCollection[];
  campaigns: MerchandisingCampaign[];
  homepageSections: HomepageMerchandisingSection[];
};

export type SeoEntry = {
  title?: string;
  description?: string;
  canonical?: string;
  index?: boolean;
  follow?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImagePath?: string;
};

export type SeoRedirect = {
  id: string;
  from: string;
  to: string;
  permanent: boolean;
  active: boolean;
};

export type SeoPageKey =
  | "about"
  | "faq"
  | "shipping"
  | "returns"
  | "contact"
  | "customerCare"
  | "privacy"
  | "terms";

export type SeoCategoryKey = "cleansers" | "moisturizers" | "sunscreen";

export type SeoConfig = {
  homepage: SeoEntry;
  shop: SeoEntry;
  categories: Record<SeoCategoryKey, SeoEntry>;
  pages: Record<SeoPageKey, SeoEntry>;
  products: Record<string, SeoEntry>;
  redirects: SeoRedirect[];
};

export type StorefrontConfig = {
  version: 1;
  updatedAt: string;
  site: {
    announcement: string;
    footerDescription: string;
    supportEmail: string;
    supportPhone: string;
    supportHours: string;
  };
  homepage: {
    eyebrow: string;
    headline: string;
    intro: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
    heroProductId: string;
    featureChips: string[];
    ideaEyebrow: string;
    ideaHeadline: string;
    ideaCopy: string;
  };
  pages: {
    about: InfoPageContent;
    shipping: InfoPageContent;
    returns: InfoPageContent;
    contact: InfoPageContent;
  };
  faq: {
    eyebrow: string;
    title: string;
    intro: string;
    items: FaqItem[];
  };
  products: Record<string, ProductEditorial>;
  seo: SeoConfig;
  merchandising: MerchandisingConfig;
};

export const defaultSeoConfig: SeoConfig = {
  homepage: {
    title: "Aloyri — Let Your Skin Glow.",
    description:
      "Aloyri is a curated skincare storefront for Bangladesh with live product availability, BDT pricing, secure checkout and order tracking.",
    canonical: "/",
    index: true,
    follow: true,
    ogTitle: "Aloyri — Let Your Skin Glow.",
    ogDescription:
      "Curated skincare for Bangladesh with live availability and clear BDT pricing.",
  },
  shop: {
    title: "Shop skincare",
    description:
      "Shop Aloyri cleansers, moisturizers and sunscreen in BDT with live product availability.",
    canonical: "/shop",
    index: true,
    follow: true,
  },
  categories: {
    cleansers: {
      title: "Cleansers",
      description:
        "Shop Aloyri facial cleansers with live BDT pricing and current CRM availability.",
      canonical: "/category/cleansers",
      index: true,
      follow: true,
    },
    moisturizers: {
      title: "Moisturizers",
      description:
        "Shop Aloyri moisturizers with live BDT pricing and current CRM availability.",
      canonical: "/category/moisturizers",
      index: true,
      follow: true,
    },
    sunscreen: {
      title: "Sunscreen",
      description:
        "Shop Aloyri daily sunscreen with live BDT pricing and current CRM availability.",
      canonical: "/category/sunscreen",
      index: true,
      follow: true,
    },
  },
  pages: {
    about: {
      title: "About Aloyri",
      description:
        "Learn about Aloyri's approach to clear, considered skincare shopping in Bangladesh.",
      canonical: "/about",
      index: true,
      follow: true,
    },
    faq: {
      title: "Frequently asked questions",
      description:
        "Answers about Aloyri products, stock, delivery, payment, order tracking and returns.",
      canonical: "/faq",
      index: true,
      follow: true,
    },
    shipping: {
      title: "Shipping & delivery",
      description:
        "Aloyri delivery charges, order handling and tracking information for Bangladesh.",
      canonical: "/shipping-delivery",
      index: true,
      follow: true,
    },
    returns: {
      title: "Returns & refunds",
      description:
        "How Aloyri reviews product returns, wrong or damaged items and eligible refunds.",
      canonical: "/returns-refunds",
      index: true,
      follow: true,
    },
    contact: {
      title: "Contact Aloyri",
      description:
        "Prepare the information Aloyri needs to help with a website order, delivery or return.",
      canonical: "/contact",
      index: true,
      follow: true,
    },
    customerCare: {
      title: "Customer care",
      description:
        "Aloyri customer care: order tracking, delivery information, returns, FAQs and contact guidance.",
      canonical: "/customer-care",
      index: true,
      follow: true,
    },
    privacy: {
      title: "Privacy policy",
      description:
        "How Aloyri handles information used for shopping, orders and customer support.",
      canonical: "/privacy",
      index: true,
      follow: true,
    },
    terms: {
      title: "Terms & conditions",
      description:
        "Terms that apply when using the Aloyri skincare storefront and placing website orders.",
      canonical: "/terms",
      index: true,
      follow: true,
    },
  },
  products: {},
  redirects: [],
};

export const defaultMerchandisingConfig: MerchandisingConfig = {
  outOfStockMode: "push-down",
  shopSortMode: "priority",
  productRules: {},
  discovery: {
    synonymGroups: [
      ["moisturizer", "moisturiser"],
      ["sunscreen", "sunblock", "spf"],
      ["cleanser", "face wash", "facial wash"],
    ],
    categoryOrder: ["Cleanser", "Moisturizer", "Sunscreen"],
    popularSearches: ["sunscreen", "moisturizer", "cleanser"],
  },
  recommendations: structuredClone(defaultRecommendationConfig),
  collections: [],
  campaigns: [],
  homepageSections: [
    {
      id: "homepage-bestsellers",
      kind: "bestsellers",
      enabled: true,
      eyebrow: "Bestsellers",
      title: "The products people start with.",
      copy: "",
      maxProducts: 3,
    },
    {
      id: "homepage-featured",
      kind: "featured",
      enabled: true,
      eyebrow: "Aloyri selection",
      title: "Everyday skincare, clearly presented.",
      copy:
        "Browse current products with clear routine guidance, live BDT pricing and availability that is checked again before an order is placed.",
      maxProducts: 6,
    },
  ],
};

export const defaultStorefrontConfig: StorefrontConfig = {
  version: 1,
  updatedAt: "2026-10-06T00:00:00.000Z",
  site: {
    announcement: "Let Your Skin Glow. · Curated skincare for Bangladesh",
    footerDescription:
      "Aloyri is a skincare destination built around considered selection, clear product information and a calmer way to build an everyday routine.",
    supportEmail: "",
    supportPhone: "",
    supportHours: "",
  },
  homepage: {
    eyebrow: "Aloyri skincare edit",
    headline: "Skincare that earns a place in your routine.",
    intro:
      "A considered edit of cleansers, moisturizers and daily SPF with straightforward product information and BDT pricing.",
    primaryLabel: "Shop the edit",
    primaryHref: "/shop",
    secondaryLabel: "Explore sunscreen",
    secondaryHref: "/category/sunscreen",
    heroProductId: "skin-aqua",
    featureChips: [
      "Curated selection",
      "BDT pricing",
      "Bangladesh-first storefront",
    ],
    ideaEyebrow: "The Aloyri idea",
    ideaHeadline: "Less noise. Better product choices.",
    ideaCopy:
      "Aloyri keeps the storefront focused on what customers need to make a choice: product, category, size, price and a clear place in the routine.",
  },
  pages: {
    about: {
      eyebrow: "About Aloyri",
      title: "A calmer way to shop skincare.",
      intro:
        "Aloyri is built around a simple idea: make everyday skincare easier to understand, easier to compare and easier to buy without burying the customer in unnecessary noise.",
      sections: [
        {
          title: "What we focus on",
          paragraphs: [
            "The storefront is organised around practical routine steps—cleanse, moisturise and protect—while live price and availability come directly from Aloyri's operational system.",
          ],
          bullets: [
            "Clear product identity, size and BDT pricing.",
            "Live stock visibility before checkout.",
            "Straightforward routine guidance without medical claims.",
            "Secure order creation and customer order tracking.",
          ],
        },
        {
          title: "How product information is handled",
          paragraphs: [
            "Aloyri separates verified operational facts from editorial guidance. Product identity, selling price and availability are synchronised from the CRM. Descriptions and routine guidance are managed by the ecommerce storefront.",
            "Ingredient lists are not guessed. Until an ingredient list has been verified against the exact product supplied, customers are directed to the product packaging for the current formulation.",
          ],
          bullets: [],
        },
        {
          title: "Built for Bangladesh",
          paragraphs: [
            "Aloyri uses BDT pricing, Bangladesh mobile validation, local delivery zones and Cash on Delivery as the first live payment method. The website is designed to remain useful across mobile, tablet and desktop.",
          ],
          bullets: [],
        },
      ],
    },
    shipping: {
      eyebrow: "Customer care",
      title: "Shipping & delivery.",
      intro:
        "Delivery charges are shown before the final order is placed and are rechecked by Aloyri when the order is created.",
      sections: [
        {
          title: "Delivery charges",
          paragraphs: [],
          bullets: [
            "Inside Dhaka: ৳80.",
            "Outside Dhaka: ৳150.",
            "The selected delivery zone and final payable amount are shown during checkout.",
          ],
        },
        {
          title: "Order handling",
          paragraphs: [
            "After a website order is placed, it enters Aloyri's order workflow for confirmation, preparation, packing and shipment. Actual delivery timing depends on destination, courier operations and the order's processing stage.",
            "Aloyri does not promise a fixed delivery date until the relevant order and courier information support it.",
          ],
          bullets: [],
        },
        {
          title: "Tracking",
          paragraphs: [
            "Use the Track Order page with the website order number and the same Bangladesh mobile number used at checkout. When a courier reference is available in Aloyri, it appears in the customer tracking view.",
          ],
          bullets: [],
        },
        {
          title: "Cash on Delivery",
          paragraphs: [
            "Cash on Delivery is currently the live checkout payment method. The payable total shown at checkout includes the configured delivery charge.",
          ],
          bullets: [],
        },
      ],
    },
    returns: {
      eyebrow: "Customer care",
      title: "Returns & refunds.",
      intro:
        "A return is reviewed before any refund or stock movement is completed. This helps Aloyri handle hygiene-sensitive skincare products, damaged items and order corrections responsibly.",
      sections: [
        {
          title: "When to contact Aloyri",
          paragraphs: [],
          bullets: [
            "The wrong product was delivered.",
            "An item arrived visibly damaged or unusable.",
            "A product is missing from the delivered order.",
            "You need to request a return for another reason and want Aloyri to review eligibility.",
          ],
        },
        {
          title: "How a return is reviewed",
          paragraphs: [
            "Keep the order number, product packaging and any useful photos available. Aloyri reviews the order, product condition, reason for return and any relevant delivery information before confirming the next step.",
            "Do not send a product back without return instructions. Skincare products can have hygiene and safety considerations that affect whether an item can be accepted back into inventory.",
          ],
          bullets: [],
        },
        {
          title: "Refunds",
          paragraphs: [
            "If a refund is approved, Aloyri will confirm the amount and refund method after the return review. A returned product does not automatically mean a refund is due, and a refund does not automatically mean the product can be restocked.",
          ],
          bullets: [],
        },
        {
          title: "Your legal rights",
          paragraphs: [
            "Nothing on this page is intended to remove rights that apply under mandatory consumer law in Bangladesh.",
          ],
          bullets: [],
        },
      ],
    },
    contact: {
      eyebrow: "Customer care",
      title: "Contact Aloyri.",
      intro:
        "For order support, having the right information ready helps Aloyri verify the order without exposing private CRM data.",
      sections: [
        {
          title: "For an order question",
          paragraphs: [],
          bullets: [
            "Keep your website order number ready.",
            "Use the same mobile number that was entered at checkout.",
            "For a product or delivery issue, note which item is affected and what happened.",
            "For damaged or incorrect products, keep clear photos of the item and packaging where useful.",
          ],
        },
        {
          title: "Check the live order first",
          paragraphs: [
            "The Track Order page reads the latest customer-safe status directly from Aloyri's CRM. It is usually the quickest way to check whether an order is confirmed, packed, shipped, out for delivery or delivered.",
          ],
          bullets: [],
        },
        {
          title: "Direct support channel",
          paragraphs: [
            "Aloyri's permanent branded support contact will be published here after it is configured in Ecommerce Admin.",
          ],
          bullets: [],
        },
      ],
    },
  },
  faq: {
    eyebrow: "Customer care",
    title: "Frequently asked questions.",
    intro: "Quick answers about Aloyri products, checkout, delivery, tracking and returns.",
    items: [
      {
        question: "Are product prices and stock live?",
        answer:
          "Yes. The storefront reads customer-safe product price and available stock from Aloyri's CRM, and the CRM checks them again when an order is submitted.",
      },
      {
        question: "What are the delivery charges?",
        answer:
          "Delivery is ৳80 inside Dhaka and ৳150 outside Dhaka. The selected charge is shown during checkout.",
      },
      {
        question: "Which payment method can I use?",
        answer: "Cash on Delivery is currently the live checkout payment method.",
      },
      {
        question: "How do I track an order?",
        answer:
          "Open Track Order and enter the website order number plus the same Bangladesh mobile number used at checkout.",
      },
      {
        question: "Why are full ingredient lists not shown for every product?",
        answer:
          "Aloyri does not guess ingredient lists. Until a list is verified against the exact item supplied, the product packaging is the reference for the current formulation.",
      },
      {
        question: "What if an item is out of stock after I add it to my cart?",
        answer:
          "The cart and checkout recheck live availability. If stock drops below the quantity in your cart, checkout pauses until the quantity is updated.",
      },
      {
        question: "Can I return a skincare product?",
        answer:
          "You can ask Aloyri to review a return. Eligibility depends on the order, product condition, reason for return, hygiene considerations and applicable consumer rights.",
      },
      {
        question: "Do I need an account to order?",
        answer:
          "No customer account is required for the current checkout. Order tracking uses your order number and checkout mobile number.",
      },
    ],
  },
  products: {},
  seo: defaultSeoConfig,
  merchandising: defaultMerchandisingConfig,
};

const PUBLISHED_CONFIG_PATH = "admin/storefront-config.json";
const DRAFT_CONFIG_PATH = "admin/storefront-draft.json";
const HISTORY_PREFIX = "admin/history/";
const AUDIT_PREFIX = "admin/audit/";

const STORAGE_NAMESPACE =
  process.env.VERCEL_ENV === "production" ? "" : "preview/";

export function storefrontStoragePath(pathname: string) {
  if (!STORAGE_NAMESPACE || pathname.startsWith(STORAGE_NAMESPACE)) {
    return pathname;
  }
  return STORAGE_NAMESPACE + pathname;
}

function logicalStorefrontPath(pathname: string) {
  if (STORAGE_NAMESPACE && pathname.startsWith(STORAGE_NAMESPACE)) {
    return pathname.slice(STORAGE_NAMESPACE.length);
  }
  return pathname;
}

export type StorefrontVersionRecord = {
  version: 1;
  id: string;
  publishedAt: string;
  publishedBy: string;
  note: string;
  config: StorefrontConfig;
};

export type AdminAuditChange = {
  path: string;
  before?: string;
  after?: string;
};

export type AdminAuditEvent = {
  version: 1;
  id: string;
  createdAt: string;
  actor: string;
  action: string;
  detail?: string;
  scope?: string;
  target?: string;
  changes?: AdminAuditChange[];
};

export function blobConfigured() {
  return structuredDatastoreConfigured();
}

export async function readPrivateJson<T>(pathname: string): Promise<T | null> {
  return readStructuredJson<T>(pathname);
}

export async function writePrivateJson(pathname: string, value: unknown) {
  return writeStructuredJson(pathname, value);
}

export async function createPrivateJsonOnce(
  pathname: string,
  value: unknown,
) {
  return createStructuredJsonOnce(pathname, value);
}

export async function listPrivateJsonRecords<T>(
  prefix: string,
  limit = 1000,
  offset = 0,
) {
  return listStructuredJson<T>(prefix, limit, offset);
}

function normalizeConfig(value: Partial<StorefrontConfig> | null): StorefrontConfig {
  if (!value) return structuredClone(defaultStorefrontConfig);

  return {
    ...defaultStorefrontConfig,
    ...value,
    version: 1,
    site: {
      ...defaultStorefrontConfig.site,
      ...(value.site || {}),
    },
    homepage: {
      ...defaultStorefrontConfig.homepage,
      ...(value.homepage || {}),
      featureChips:
        Array.isArray(value.homepage?.featureChips) &&
        value.homepage.featureChips.length
          ? value.homepage.featureChips.slice(0, 6)
          : defaultStorefrontConfig.homepage.featureChips,
    },
    pages: {
      about: {
        ...defaultStorefrontConfig.pages.about,
        ...(value.pages?.about || {}),
      },
      shipping: {
        ...defaultStorefrontConfig.pages.shipping,
        ...(value.pages?.shipping || {}),
      },
      returns: {
        ...defaultStorefrontConfig.pages.returns,
        ...(value.pages?.returns || {}),
      },
      contact: {
        ...defaultStorefrontConfig.pages.contact,
        ...(value.pages?.contact || {}),
      },
    },
    faq: {
      ...defaultStorefrontConfig.faq,
      ...(value.faq || {}),
      items: Array.isArray(value.faq?.items)
        ? value.faq.items.slice(0, 30)
        : defaultStorefrontConfig.faq.items,
    },
    products:
      value.products && typeof value.products === "object"
        ? value.products
        : {},
    seo: {
      homepage: {
        ...defaultSeoConfig.homepage,
        ...(value.seo?.homepage || {}),
      },
      shop: {
        ...defaultSeoConfig.shop,
        ...(value.seo?.shop || {}),
      },
      categories: {
        cleansers: {
          ...defaultSeoConfig.categories.cleansers,
          ...(value.seo?.categories?.cleansers || {}),
        },
        moisturizers: {
          ...defaultSeoConfig.categories.moisturizers,
          ...(value.seo?.categories?.moisturizers || {}),
        },
        sunscreen: {
          ...defaultSeoConfig.categories.sunscreen,
          ...(value.seo?.categories?.sunscreen || {}),
        },
      },
      pages: {
        about: {
          ...defaultSeoConfig.pages.about,
          ...(value.seo?.pages?.about || {}),
        },
        faq: {
          ...defaultSeoConfig.pages.faq,
          ...(value.seo?.pages?.faq || {}),
        },
        shipping: {
          ...defaultSeoConfig.pages.shipping,
          ...(value.seo?.pages?.shipping || {}),
        },
        returns: {
          ...defaultSeoConfig.pages.returns,
          ...(value.seo?.pages?.returns || {}),
        },
        contact: {
          ...defaultSeoConfig.pages.contact,
          ...(value.seo?.pages?.contact || {}),
        },
        customerCare: {
          ...defaultSeoConfig.pages.customerCare,
          ...(value.seo?.pages?.customerCare || {}),
        },
        privacy: {
          ...defaultSeoConfig.pages.privacy,
          ...(value.seo?.pages?.privacy || {}),
        },
        terms: {
          ...defaultSeoConfig.pages.terms,
          ...(value.seo?.pages?.terms || {}),
        },
      },
      products:
        value.seo?.products && typeof value.seo.products === "object"
          ? value.seo.products
          : {},
      redirects: Array.isArray(value.seo?.redirects)
        ? value.seo.redirects.slice(0, 200)
        : [],
    },
    merchandising: {
      outOfStockMode:
        value.merchandising?.outOfStockMode === "keep" ||
        value.merchandising?.outOfStockMode === "hide" ||
        value.merchandising?.outOfStockMode === "push-down"
          ? value.merchandising.outOfStockMode
          : defaultMerchandisingConfig.outOfStockMode,
      shopSortMode:
        value.merchandising?.shopSortMode === "featured"
          ? "featured"
          : defaultMerchandisingConfig.shopSortMode,
      productRules:
        value.merchandising?.productRules &&
        typeof value.merchandising.productRules === "object"
          ? value.merchandising.productRules
          : {},
      discovery: {
        synonymGroups: Array.isArray(value.merchandising?.discovery?.synonymGroups)
          ? value.merchandising.discovery.synonymGroups
              .filter((group) => Array.isArray(group))
              .map((group) =>
                group
                  .filter((term): term is string => typeof term === "string")
                  .map((term) => term.trim().slice(0, 60))
                  .filter(Boolean)
                  .slice(0, 12),
              )
              .filter((group) => group.length >= 2)
              .slice(0, 50)
          : structuredClone(defaultMerchandisingConfig.discovery.synonymGroups),
        categoryOrder: Array.isArray(value.merchandising?.discovery?.categoryOrder)
          ? value.merchandising.discovery.categoryOrder
              .filter((term): term is string => typeof term === "string")
              .map((term) => term.trim().slice(0, 80))
              .filter(Boolean)
              .slice(0, 50)
          : structuredClone(defaultMerchandisingConfig.discovery.categoryOrder),
        popularSearches: Array.isArray(value.merchandising?.discovery?.popularSearches)
          ? value.merchandising.discovery.popularSearches
              .filter((term): term is string => typeof term === "string")
              .map((term) => term.trim().slice(0, 60))
              .filter(Boolean)
              .slice(0, 20)
          : structuredClone(defaultMerchandisingConfig.discovery.popularSearches),
      },
      recommendations: normalizeRecommendationConfig(
        value.merchandising?.recommendations,
      ),
      collections: Array.isArray(value.merchandising?.collections)
        ? value.merchandising.collections.slice(0, 100)
        : [],
      campaigns: Array.isArray(value.merchandising?.campaigns)
        ? value.merchandising.campaigns.slice(0, 100)
        : [],
      homepageSections:
        Array.isArray(value.merchandising?.homepageSections) &&
        value.merchandising.homepageSections.length
          ? value.merchandising.homepageSections.slice(0, 20)
          : structuredClone(defaultMerchandisingConfig.homepageSections),
    },
  };
}



export function applyStorefrontEditorial(
  products: LiveCatalogProduct[],
  config: StorefrontConfig,
): LiveCatalogProduct[] {
  return products.map((product) => {
    const editorial = config.products[product.id];
    if (!editorial) return product;

    return {
      ...product,
      ...(editorial.slug ? { slug: editorial.slug } : {}),
      ...(editorial.description ? { description: editorial.description } : {}),
      ...(editorial.routineStep ? { routineStep: editorial.routineStep } : {}),
      ...(editorial.skinNote ? { skinNote: editorial.skinNote } : {}),
      ...(editorial.texture ? { texture: editorial.texture } : {}),
      ...(editorial.bestFor ? { bestFor: editorial.bestFor } : {}),
      ...(editorial.howToUse?.length ? { howToUse: editorial.howToUse } : {}),
      ...(editorial.careNotes?.length ? { careNotes: editorial.careNotes } : {}),
      ...(editorial.ingredientNote
        ? { ingredientNote: editorial.ingredientNote }
        : {}),
      ...(typeof editorial.featured === "boolean"
        ? { featured: editorial.featured }
        : {}),
      ...(typeof editorial.bestseller === "boolean"
        ? { bestseller: editorial.bestseller }
        : {}),
      ...(editorial.mediaPath ? { mediaPath: editorial.mediaPath } : {}),
    };
  });
}

function normalizedWithTimestamp(config: StorefrontConfig) {
  return normalizeConfig({
    ...config,
    updatedAt: new Date().toISOString(),
  });
}

function comparableConfig(config: StorefrontConfig) {
  const copy = structuredClone(config) as StorefrontConfig;
  copy.updatedAt = "";
  return copy;
}

async function configHash(config: StorefrontConfig) {
  const data = new TextEncoder().encode(JSON.stringify(comparableConfig(config)));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(digest).toString("hex");
}

function safeId() {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function readPublishedStorefrontConfig(): Promise<StorefrontConfig> {
  const stored = await readPrivateJson<Partial<StorefrontConfig>>(PUBLISHED_CONFIG_PATH);
  return normalizeConfig(stored);
}

export async function readDraftStorefrontConfig(): Promise<StorefrontConfig> {
  const stored = await readPrivateJson<Partial<StorefrontConfig>>(DRAFT_CONFIG_PATH);
  if (stored) return normalizeConfig(stored);
  return readPublishedStorefrontConfig();
}

export async function readStorefrontConfig(): Promise<StorefrontConfig> {
  // Published edits live in the datastore, so never freeze them at build time.
  await connection();
  const preview = await draftMode();
  return preview.isEnabled
    ? readDraftStorefrontConfig()
    : readPublishedStorefrontConfig();
}

export async function saveStorefrontConfig(config: StorefrontConfig) {
  const next = normalizedWithTimestamp(config);
  await writePrivateJson(PUBLISHED_CONFIG_PATH, next);
  return next;
}

export async function saveDraftStorefrontConfig(config: StorefrontConfig) {
  const next = normalizedWithTimestamp(config);
  await writePrivateJson(DRAFT_CONFIG_PATH, next);
  return next;
}

export async function updateStorefrontConfig(
  updater: (current: StorefrontConfig) => StorefrontConfig,
) {
  const current = await readPublishedStorefrontConfig();
  return saveStorefrontConfig(updater(structuredClone(current)));
}

function auditValue(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return "null";
  if (typeof value === "string") return value.slice(0, 160);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value).slice(0, 160);
  } catch {
    return "[unserializable]";
  }
}

function auditDiff(
  before: unknown,
  after: unknown,
  prefix = "",
  depth = 0,
): AdminAuditChange[] {
  if (depth > 4) return [];
  if (Object.is(before, after)) return [];

  const beforeObject =
    before && typeof before === "object" && !Array.isArray(before)
      ? (before as Record<string, unknown>)
      : null;
  const afterObject =
    after && typeof after === "object" && !Array.isArray(after)
      ? (after as Record<string, unknown>)
      : null;

  if (beforeObject && afterObject) {
    const keys = new Set([
      ...Object.keys(beforeObject),
      ...Object.keys(afterObject),
    ]);
    const changes: AdminAuditChange[] = [];
    for (const key of keys) {
      if (/password|secret|token|hash|recovery/i.test(key)) continue;
      changes.push(
        ...auditDiff(
          beforeObject[key],
          afterObject[key],
          prefix ? prefix + "." + key : key,
          depth + 1,
        ),
      );
      if (changes.length >= 24) break;
    }
    return changes.slice(0, 24);
  }

  const beforeText = auditValue(before);
  const afterText = auditValue(after);
  if (beforeText === afterText) return [];
  return [
    {
      path: prefix || "value",
      ...(beforeText !== undefined ? { before: beforeText } : {}),
      ...(afterText !== undefined ? { after: afterText } : {}),
    },
  ];
}

export async function updateDraftStorefrontConfig(
  updater: (current: StorefrontConfig) => StorefrontConfig,
  audit?: {
    actor: string;
    action: string;
    scope?: string;
    target?: string;
    detail?: string;
  },
) {
  const current = await readDraftStorefrontConfig();
  const next = updater(structuredClone(current));
  const saved = await saveDraftStorefrontConfig(next);

  if (audit) {
    await writeAdminAuditEvent(
      audit.actor,
      audit.action,
      audit.detail,
      {
        scope: audit.scope,
        target: audit.target,
        changes: auditDiff(current, saved),
      },
    );
  }

  return saved;
}

export async function getPublishingStatus() {
  const [published, draft] = await Promise.all([
    readPublishedStorefrontConfig(),
    readDraftStorefrontConfig(),
  ]);
  const [publishedHash, draftHash] = await Promise.all([
    configHash(published),
    configHash(draft),
  ]);
  return {
    published,
    draft,
    publishedHash,
    draftHash,
    hasDraftChanges: publishedHash !== draftHash,
  };
}

async function historyRecords(limit = 50) {
  const records = await listPrivateJsonRecords<StorefrontVersionRecord>(
    HISTORY_PREFIX,
    Math.min(limit, 100),
  );
  return records
    .map((record) => record.value)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function listStorefrontVersions(limit = 30) {
  return (await historyRecords(limit)).slice(0, limit);
}

export async function writeAdminAuditEvent(
  actor: string,
  action: string,
  detail?: string,
  context?: {
    scope?: string;
    target?: string;
    changes?: AdminAuditChange[];
  },
) {
  const createdAt = new Date().toISOString();
  const event: AdminAuditEvent = {
    version: 1,
    id: safeId(),
    createdAt,
    actor,
    action,
    ...(detail ? { detail: detail.slice(0, 500) } : {}),
    ...(context?.scope ? { scope: context.scope.slice(0, 80) } : {}),
    ...(context?.target ? { target: context.target.slice(0, 120) } : {}),
    ...(context?.changes?.length
      ? { changes: context.changes.slice(0, 24) }
      : {}),
  };
  const pathname =
    AUDIT_PREFIX +
    createdAt.replace(/[:.]/g, "-") +
    "-" +
    event.id +
    ".json";
  await writePrivateJson(pathname, event);
  return event;
}

export async function listAdminAuditEvents(limit = 20, offset = 0) {
  const safeLimit = Math.min(Math.max(limit, 1), 5000);
  const safeOffset = Math.max(0, Math.trunc(offset));
  const records = await listPrivateJsonRecords<AdminAuditEvent>(
    AUDIT_PREFIX,
    safeLimit,
    safeOffset,
  );
  return records
    .map((record) => record.value)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function ensureBaselineVersion(current: StorefrontConfig) {
  const existing = await historyRecords(1);
  if (existing.length) return;
  const publishedAt = current.updatedAt || new Date().toISOString();
  const baseline: StorefrontVersionRecord = {
    version: 1,
    id: safeId(),
    publishedAt,
    publishedBy: "system",
    note: "Initial live storefront state before version history was enabled.",
    config: current,
  };
  const pathname =
    HISTORY_PREFIX +
    publishedAt.replace(/[:.]/g, "-") +
    "-" +
    baseline.id +
    ".json";
  await writePrivateJson(pathname, baseline);
}

export async function publishDraftStorefront(
  actor: string,
  note: string,
) {
  const [current, draft] = await Promise.all([
    readPublishedStorefrontConfig(),
    readDraftStorefrontConfig(),
  ]);
  await ensureBaselineVersion(current);

  const published = normalizedWithTimestamp(draft);
  await writePrivateJson(PUBLISHED_CONFIG_PATH, published);
  await writePrivateJson(DRAFT_CONFIG_PATH, published);

  const record: StorefrontVersionRecord = {
    version: 1,
    id: safeId(),
    publishedAt: published.updatedAt,
    publishedBy: actor,
    note: note.trim().slice(0, 300) || "Published storefront draft.",
    config: published,
  };
  const pathname =
    HISTORY_PREFIX +
    record.publishedAt.replace(/[:.]/g, "-") +
    "-" +
    record.id +
    ".json";
  await writePrivateJson(pathname, record);
  await writeAdminAuditEvent(
    actor,
    "storefront.publish",
    record.note,
    {
      scope: "publishing",
      target: record.id,
      changes: auditDiff(current, published),
    },
  );
  return record;
}

export async function discardDraftStorefront(actor: string) {
  const published = await readPublishedStorefrontConfig();
  const draft = await saveDraftStorefrontConfig(published);
  await writeAdminAuditEvent(
    actor,
    "storefront.draft_discard",
    "Draft reset to current live storefront.",
    {
      scope: "publishing",
      target: "draft",
    },
  );
  return draft;
}

export async function restoreStorefrontVersionToDraft(
  actor: string,
  versionId: string,
) {
  if (!/^[a-f0-9]{32}$/.test(versionId)) {
    throw new Error("Invalid storefront version.");
  }
  const versions = await historyRecords(100);
  const record = versions.find((candidate) => candidate.id === versionId);
  if (!record) throw new Error("Storefront version not found.");

  const before = await readDraftStorefrontConfig();
  const restored = await saveDraftStorefrontConfig(record.config);
  await writeAdminAuditEvent(
    actor,
    "storefront.version_restore_to_draft",
    "Restored version from " + record.publishedAt,
    {
      scope: "publishing",
      target: record.id,
      changes: auditDiff(before, restored),
    },
  );
  return { restored, record };
}

export async function uploadStorefrontMedia(file: File) {
  if (!mediaStorageConfigured()) throw new Error("Media storage is not configured.");
  if (!file || file.size <= 0) throw new Error("Choose an image to upload.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Images must be 5 MB or smaller.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Use JPG, PNG or WebP images.");
  }

  const extension =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const base = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "image";
  const pathname = `media/${Date.now()}-${base}.${extension}`;

  await putMediaObject(storefrontStoragePath(pathname), file);
  return pathname;
}

export async function listStorefrontMedia() {
  if (!mediaStorageConfigured()) return [];
  try {
    const objects = await listMediaObjects(storefrontStoragePath("media/"));
    return objects.map((object) => ({
      ...object,
      pathname: logicalStorefrontPath(object.pathname),
    }));
  } catch (error) {
    console.error("Media list failed", error);
    return [];
  }
}

export function storefrontMediaUrl(pathname?: string) {
  if (!pathname) return "";
  return "/api/storefront-media/" + pathname.replace(/^media\//, "");
}
