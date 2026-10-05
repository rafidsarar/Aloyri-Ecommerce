import { submitCrmReturnRequest, type ReturnRequestInput } from "@/lib/crm-return-integration";
import {
  isValidBangladeshPhone,
  normalizeBangladeshPhone,
} from "@/lib/checkout";

export const dynamic = "force-dynamic";

type RateEntry = { count: number; resetAt: number };
const globalRate = globalThis as typeof globalThis & {
  __aloyriReturnRate?: Map<string, RateEntry>;
};
const rateStore =
  globalRate.__aloyriReturnRate ??
  (globalRate.__aloyriReturnRate = new Map<string, RateEntry>());

const reasons = new Set([
  "Wrong product delivered",
  "Damaged on arrival",
  "Missing item",
  "Product issue",
  "Changed mind",
  "Other",
]);
const conditions = new Set([
  "Unopened",
  "Opened",
  "Damaged in delivery",
  "Not received",
  "Other",
]);
const resolutions = new Set(["Refund", "Replacement", "Store credit", "Other"]);

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
  const current = rateStore.get(key);
  if (!current || current.resetAt <= now) {
    rateStore.set(key, { count: 1, resetAt: now + 10 * 60_000 });
    return true;
  }
  if (current.count >= 8) return false;
  current.count += 1;
  return true;
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return response({ error: "Content-Type must be application/json.", code: "INVALID_CONTENT_TYPE" }, 415);
  }

  if (!rateAllowed(requestIp(request))) {
    return response(
      {
        error: "Too many return attempts. Please wait a few minutes and try again.",
        code: "RATE_LIMITED",
      },
      429,
    );
  }

  const text = await request.text();
  if (text.length > 10_000) {
    return response({ error: "Invalid return request.", code: "INVALID_RETURN_REQUEST" }, 400);
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return response({ error: "Invalid return request.", code: "INVALID_RETURN_REQUEST" }, 400);
  }
  if (!body || typeof body !== "object") {
    return response({ error: "Invalid return request.", code: "INVALID_RETURN_REQUEST" }, 400);
  }

  const input = body as Partial<ReturnRequestInput>;
  if (
    typeof input.orderNumber !== "string" ||
    !/^WEB-[A-Z0-9-]{8,90}$/i.test(input.orderNumber.trim()) ||
    typeof input.phone !== "string" ||
    !isValidBangladeshPhone(input.phone) ||
    typeof input.reason !== "string" ||
    !reasons.has(input.reason) ||
    typeof input.condition !== "string" ||
    !conditions.has(input.condition) ||
    typeof input.preferredResolution !== "string" ||
    !resolutions.has(input.preferredResolution) ||
    typeof input.note !== "string" ||
    input.note.length > 2000 ||
    !Array.isArray(input.items) ||
    input.items.length < 1 ||
    input.items.length > 25 ||
    input.items.some(
      (item) =>
        !item ||
        !Number.isInteger(item.line) ||
        item.line < 0 ||
        !Number.isInteger(item.qty) ||
        item.qty < 1 ||
        item.qty > 99,
    )
  ) {
    return response({ error: "Check the selected products and return details.", code: "INVALID_RETURN_REQUEST" }, 400);
  }

  if (new Set(input.items.map((item) => item.line)).size !== input.items.length) {
    return response({ error: "Each returned order line can only be selected once.", code: "INVALID_RETURN_REQUEST" }, 400);
  }

  const result = await submitCrmReturnRequest({
    orderNumber: input.orderNumber.trim(),
    phone: normalizeBangladeshPhone(input.phone),
    reason: input.reason as ReturnRequestInput["reason"],
    condition: input.condition as ReturnRequestInput["condition"],
    preferredResolution: input.preferredResolution as ReturnRequestInput["preferredResolution"],
    note: input.note.trim(),
    items: input.items,
  });

  return response(result.body, result.status);
}
