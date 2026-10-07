import { rateAllowed } from "@/lib/request-rate-limit";
import { currentCustomerSession } from "@/lib/customer-auth";
import { submitCrmReturnRequest, type ReturnRequestInput } from "@/lib/crm-return-integration";
import {
  isValidBangladeshPhone,
  normalizeBangladeshPhone,
} from "@/lib/checkout";
import { noteReturnRequest } from "@/lib/payment-settlement";
import { createReturnSupportCase } from "@/lib/support-cases";

export const dynamic = "force-dynamic";



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



export async function POST(request: Request) {
  const session=await currentCustomerSession();
  if(!session)return response({error:"Sign in required.",code:"SIGN_IN_REQUIRED"},401);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return response({ error: "Content-Type must be application/json.", code: "INVALID_CONTENT_TYPE" }, 415);
  }

  if (!await rateAllowed("return-request", requestIp(request), 8, 600000)) {
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

  const normalizedPhone = normalizeBangladeshPhone(input.phone);
  const returnRequest = {
    orderNumber: input.orderNumber.trim(),
    phone: normalizedPhone,
    reason: input.reason as ReturnRequestInput["reason"],
    condition: input.condition as ReturnRequestInput["condition"],
    preferredResolution: input.preferredResolution as ReturnRequestInput["preferredResolution"],
    note: input.note.trim(),
    items: input.items,
  } satisfies ReturnRequestInput;

  if(!session.account.orderRefs.some(ref=>ref.orderNumber===returnRequest.orderNumber.toUpperCase()))return response({error:"Order not found in your account.",code:"ORDER_NOT_OWNED"},404);
  const result = await submitCrmReturnRequest(returnRequest);

  /* CRM remains authoritative for return acceptance. Website support context is
     only created after CRM accepted the request. */
  if (result.ok && result.body.requestId) {
    const tasks = [
      noteReturnRequest({
        orderNumber: input.orderNumber.trim(),
        requestId: result.body.requestId,
        preferredResolution: input.preferredResolution as string,
      }),
      createReturnSupportCase({
        ...(session && session.account.orderRefs.some(ref => ref.orderNumber === returnRequest.orderNumber.toUpperCase()) ? { accountId: session.account.id } : {}),
        requestId: result.body.requestId,
        crmStatus: result.body.status,
        phone: normalizedPhone,
        request: returnRequest,
      }),
    ];

    const outcomes = await Promise.allSettled(tasks);
    if (outcomes[0].status === "rejected") {
      console.error("Return settlement note failed", outcomes[0].reason);
    }
    if (outcomes[1].status === "rejected") {
      console.error("Return support case creation failed", outcomes[1].reason);
    }
  }

  return response(result.body, result.status);
}

