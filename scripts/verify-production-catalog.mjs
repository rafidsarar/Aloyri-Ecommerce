const url = "https://aloyri-ecommerce.vercel.app/api/catalog";

const response = await fetch(url, {
  headers: { "user-agent": "Aloyri-Vercel-Catalog-Verification/1.0" },
  signal: AbortSignal.timeout(15000),
});

if (!response.ok) {
  throw new Error(`Live catalog returned HTTP ${response.status}`);
}

const data = await response.json();
if (!Array.isArray(data.products) || data.products.length === 0) {
  throw new Error("Live catalog did not return products");
}

const allowed = new Set([
  "id",
  "name",
  "brand",
  "size",
  "category",
  "price",
  "active",
  "availableStock",
]);

for (const product of data.products) {
  const keys = Object.keys(product);
  if (keys.length !== allowed.size || keys.some((key) => !allowed.has(key))) {
    throw new Error(`Unexpected public catalog fields for ${product.id || "unknown"}: ${keys.join(",")}`);
  }
  if (typeof product.price !== "number" || product.price < 0) {
    throw new Error("Invalid public product price");
  }
  if (!Number.isInteger(product.availableStock) || product.availableStock < 0) {
    throw new Error("Invalid public available stock");
  }
}

if (!data.products.some((product) => product.id === "cosrx")) {
  throw new Error("Known CRM product cosrx is missing from live catalog");
}

console.log(
  `Verified live catalog: ${data.products.length} products, safe fields only, CRM stock included.`,
);
