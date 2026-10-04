"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  mergeLiveCatalog,
  type LiveCatalogProduct,
  type Product,
} from "@/lib/catalog";

type CatalogContextValue = {
  products: Product[];
  synced: boolean;
  refreshing: boolean;
  error: string;
  refreshedAt: string | null;
  refresh: () => Promise<void>;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [synced, setSynced] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/catalog", {
        method: "GET",
        cache: "no-store",
      });
      const result = (await response.json()) as {
        products?: LiveCatalogProduct[];
        generatedAt?: string;
        error?: string;
      };

      if (!response.ok || !Array.isArray(result.products)) {
        throw new Error(result.error || "Catalog is temporarily unavailable.");
      }

      setProducts(mergeLiveCatalog(result.products));
      setSynced(true);
      setError("");
      setRefreshedAt(result.generatedAt || new Date().toISOString());
    } catch (refreshError) {
      setSynced(false);
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Catalog is temporarily unavailable.",
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const interval = window.setInterval(() => void refresh(), 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ products, synced, refreshing, error, refreshedAt, refresh }),
    [products, synced, refreshing, error, refreshedAt, refresh],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error("useCatalog must be used inside CatalogProvider.");
  }
  return context;
}

export function useCatalogProduct(productId: string) {
  const catalog = useCatalog();
  return {
    ...catalog,
    product: catalog.products.find((product) => product.id === productId),
  };
}
