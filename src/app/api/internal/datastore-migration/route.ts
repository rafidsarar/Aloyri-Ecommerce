import { migrateLegacyBlobRecords } from "@/lib/structured-record-store";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret && request.headers.get("authorization") === "Bearer " + secret,
  );
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json(
      { error: "Unauthorized." },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }

  const result = await migrateLegacyBlobRecords();
  return Response.json(result, {
    status: result.state === "blocked" ? 503 : 200,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
