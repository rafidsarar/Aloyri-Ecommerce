const response = await fetch("https://aloyri-ecommerce.vercel.app/api/catalog", {
  headers: { "user-agent": "Aloyri-Vercel-Catalog-Whitelist-Probe/1.0" },
  signal: AbortSignal.timeout(15000),
});
if (!response.ok) throw new Error(`Live catalog returned HTTP ${response.status}`);

const data = await response.json();
if (!Array.isArray(data.products) || data.products.length === 0) {
  throw new Error("Live catalog did not return any products");
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
    throw new Error("Unexpected public catalog fields");
  }
  if (typeof product.price !== "number" || product.price < 0) {
    throw new Error("Invalid public product price");
  }
  if (!Number.isInteger(product.availableStock) || product.availableStock < 0) {
    throw new Error("Invalid public available stock");
  }
}

const serialized = JSON.stringify(data);
for (const key of [
  "cost",
  "unitCost",
  "batchId",
  "supplierId",
  "targetQty",
  "reorderAt",
  "holds",
  "finance",
  "ownerId",
]) {
  if (serialized.includes(`"${key}"`)) {
    throw new Error("Sensitive field leaked into public catalog");
  }
}

console.log(`Verified ${data.products.length} live products with safe public fields only.`);
