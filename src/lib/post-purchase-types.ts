import type { PublicTrackedOrder } from "@/lib/crm-tracking-integration";
import type { ReplenishmentEstimate } from "@/lib/retention-utils";

export type PostPurchaseProduct = {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  size: string;
  category: string;
  qty: number;
  price: number;
  salePrice?: number;
  availableStock: number;
  reviewEligible: boolean;
  replenishment: ReplenishmentEstimate | null;
};

export type PostPurchaseSuggestion = {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  salePrice?: number;
  availableStock: number;
  reason: string;
};

export type PostPurchaseOrderResult =
  | {
      ok: true;
      order: PublicTrackedOrder;
      products: PostPurchaseProduct[];
      suggestions: PostPurchaseSuggestion[];
      catalogAvailable: boolean;
    }
  | {
      ok: false;
      orderNumber: string;
      code: string;
      error: string;
    };

export type PostPurchaseBatchResponse = {
  results: PostPurchaseOrderResult[];
};
