import { fetchCrmOrderTracking } from "@/lib/crm-tracking-integration";
import {
  isValidBangladeshPhone,
  normalizeBangladeshPhone,
} from "@/lib/checkout";

export const dynamic = "force-dynamic";

type RateEntry = { count: number; resetAt: number };

const globalRate = globalThis as typeof globalThis & {
  __aloyriTrackingRate?: Map<string, RateEntry>;
};

const rateStore =
  globalRate.__aloyriTrackingRate ??
  (globalRate.__aloyriTrackingRate = new Map<string, RateEntry>());

function response(data: unknown, status: number) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function requestIp(request: Request) {
  return (
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function rateAllowed(key: string) {
  const now = Date.now();

  if (rateStore.size > 2000) {
    for (const [entryKey, entry] of rateStore) {
      if (entry.resetAt <= now) rateStore.delete(entryKey);
    }
  }

  const current = rateStore.get(key);
  if (!current || current.resetAt <= now) {
    rateStore.set(key, { count: 1, resetAt: now + 5 * 60_000 });
    return true;
  }

  if (current.count >= 12) return false;
  current.count += 1;
  return true;
}

export async function POST(request: Request) {
  if (!rateAllowed(requestIp(request))) {
    return response(
      {
        error: "Too many tracking attempts. Please wait a few minutes and try again.",
        code: "RATE_LIMITED",
      },
      429,
    );
  }

  const text = await request.text();

  if (text.length > 2048) {
    return response(
      {
        error: "Check the order number and mobile number and try again.",
        code: "TRACKING_NOT_FOUND",
      },
      404,
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return response(
      {
        error: "Check the order number and mobile number and try again.",
        code: "TRACKING_NOT_FOUND",
      },
      404,
    );
  }

  if (!body || typeof body !== "object") {
    return response(
      {
        error: "Check the order number and mobile number and try again.",
        code: "TRACKING_NOT_FOUND",
      },
      404,
    );
  }

  const input = body as { orderNumber?: unknown; phone?: unknown };

  if (
    typeof input.orderNumber !== "string" ||
    !/^WEB-[A-Z0-9-]{8,90}$/i.test(input.orderNumber.trim()) ||
    typeof input.phone !== "string" ||
    !isValidBangladeshPhone(input.phone)
  ) {
    return response(
      {
        error: "Check the order number and mobile number and try again.",
        code: "TRACKING_NOT_FOUND",
      },
      404,
    );
  }

  const result = await fetchCrmOrderTracking({
    orderNumber: input.orderNumber.trim(),
    phone: normalizeBangladeshPhone(input.phone),
  });

  return response(result.body, result.status);
}
