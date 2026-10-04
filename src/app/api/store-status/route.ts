export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      orderingEnabled: process.env.ALOYRI_ORDERING_ENABLED === "1",
      paymentMethods: ["COD"],
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
