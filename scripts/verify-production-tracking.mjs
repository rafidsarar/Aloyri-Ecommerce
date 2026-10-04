const response = await fetch("https://aloyri-ecommerce.vercel.app/api/track-order", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "user-agent": "Aloyri-Vercel-Tracking-Probe/1.0"
  },
  body: JSON.stringify({
    orderNumber: "WEB-SMOKE-DOES-NOT-EXIST",
    phone: "01700000000"
  }),
  signal: AbortSignal.timeout(15000)
});

const body = await response.json();

if (response.status !== 404) {
  throw new Error("Tracking smoke expected HTTP 404 but got " + response.status);
}

if (!body || body.code !== "TRACKING_NOT_FOUND") {
  throw new Error("Tracking smoke did not receive generic TRACKING_NOT_FOUND");
}

if (Object.keys(body).some((key) => !["error", "code"].includes(key))) {
  throw new Error("Tracking smoke response exposed unexpected fields");
}

console.log("Verified production tracking bridge and generic privacy-safe miss response.");
