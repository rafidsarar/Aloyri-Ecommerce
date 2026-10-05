import "server-only";

import { get, list, put } from "@vercel/blob";
import type { LiveCatalogProduct } from "@/lib/catalog";

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
};

const CONFIG_PATH = "admin/storefront-config.json";

function blobConfigured() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.VERCEL_OIDC_TOKEN ||
      process.env.VERCEL,
  );
}

export async function readPrivateJson<T>(pathname: string): Promise<T | null> {
  if (!blobConfigured()) return null;

  try {
    const result = await get(pathname, {
      access: "private",
      useCache: false,
    });
    if (!result) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not found|404/i.test(message)) return null;
    console.error("Private Blob read failed", pathname, error);
    return null;
  }
}

export async function writePrivateJson(pathname: string, value: unknown) {
  if (!blobConfigured()) {
    throw new Error("Website datastore is not configured.");
  }

  await put(pathname, JSON.stringify(value, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
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

export async function readStorefrontConfig(): Promise<StorefrontConfig> {
  const stored = await readPrivateJson<Partial<StorefrontConfig>>(CONFIG_PATH);
  return normalizeConfig(stored);
}

export async function saveStorefrontConfig(config: StorefrontConfig) {
  const next = normalizeConfig({
    ...config,
    updatedAt: new Date().toISOString(),
  });
  await writePrivateJson(CONFIG_PATH, next);
  return next;
}

export async function updateStorefrontConfig(
  updater: (current: StorefrontConfig) => StorefrontConfig,
) {
  const current = await readStorefrontConfig();
  return saveStorefrontConfig(updater(structuredClone(current)));
}

export async function uploadStorefrontMedia(file: File) {
  if (!blobConfigured()) throw new Error("Website datastore is not configured.");
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

  await put(pathname, file, {
    access: "private",
    addRandomSuffix: false,
    contentType: file.type,
  });

  return pathname;
}

export async function listStorefrontMedia() {
  if (!blobConfigured()) return [];
  try {
    const result = await list({
      prefix: "media/",
      limit: 100,
    });
    return result.blobs;
  } catch (error) {
    console.error("Media list failed", error);
    return [];
  }
}

export function storefrontMediaUrl(pathname?: string) {
  if (!pathname) return "";
  return "/api/storefront-media/" + pathname.replace(/^media\//, "");
}
