export const dynamic = "force-dynamic";

function deliveryRate(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export async function GET() {
  const insideDhaka = deliveryRate(process.env.ALOYRI_DELIVERY_DHAKA_BDT);
  const outsideDhaka = deliveryRate(
    process.env.ALOYRI_DELIVERY_OUTSIDE_DHAKA_BDT,
  );
  const ratesReady = insideDhaka !== null && outsideDhaka !== null;

  return Response.json(
    {
      orderingEnabled:
        process.env.ALOYRI_ORDERING_ENABLED === "1" && ratesReady,
      paymentMethods: ["COD"],
      deliveryRates: ratesReady
        ? {
            "inside-dhaka": insideDhaka,
            "outside-dhaka": outsideDhaka,
          }
        : null,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
