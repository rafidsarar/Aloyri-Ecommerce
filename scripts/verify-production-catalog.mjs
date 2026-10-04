const response = await fetch("https://aloyri-ecommerce.vercel.app/api/catalog", {
  headers: { "user-agent": "Aloyri-Vercel-Catalog-Status-Probe/1.0" },
  signal: AbortSignal.timeout(15000),
});
console.log("catalog status", response.status);
if (!response.ok) {
  throw new Error("Live catalog is not returning a successful HTTP status");
}
console.log("Live catalog HTTP status is successful.");
