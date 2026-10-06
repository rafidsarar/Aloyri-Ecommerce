import { recoveryByToken } from "@/lib/cart-recovery";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const record = await recoveryByToken(token);
  if (!record) {
    return Response.json(
      { error: "This recovery link is invalid or expired." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  return Response.json(
    {
      items: record.items,
      itemCount: record.itemCount,
      expiresAt: record.expiresAt,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
