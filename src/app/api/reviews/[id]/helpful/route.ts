import { rateAllowed, requestIp } from "@/lib/request-rate-limit";
import {
  markReviewHelpful,
  recordReviewMetric,
} from "@/lib/review-store";

export const dynamic = "force-dynamic";

function response(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return response({ error: "Invalid request." }, 415);
  }
  if (!rateAllowed("review-helpful", requestIp(request), 40, 60 * 60_000)) {
    return response({ error: "Too many votes. Please try again later." }, 429);
  }

  const { id } = await params;
  const raw = await request.text();
  if (raw.length > 2048) return response({ error: "Invalid request." }, 400);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return response({ error: "Invalid request." }, 400);
  }

  if (
    typeof body.clientId !== "string" ||
    !/^[A-Za-z0-9_-]{16,80}$/.test(body.clientId)
  ) {
    return response({ error: "Invalid request." }, 400);
  }

  try {
    const result = await markReviewHelpful(id, body.clientId);
    if (result.recorded) await recordReviewMetric("helpfulVotes");
    return response(result);
  } catch {
    return response({ error: "Review not found." }, 404);
  }
}
