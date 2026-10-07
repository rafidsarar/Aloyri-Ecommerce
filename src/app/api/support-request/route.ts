import { rateAllowed } from "@/lib/request-rate-limit";
import { currentCustomerSession } from "@/lib/customer-auth";
import {
  isValidBangladeshPhone,
  normalizeBangladeshPhone,
} from "@/lib/checkout";
import { createCustomerSupportCase } from "@/lib/support-cases";
import type { SupportCaseCategory } from "@/lib/support-case-model";

export const dynamic = "force-dynamic";



const categories = new Set<SupportCaseCategory>([
  "delivery",
  "payment",
  "order",
  "product",
  "other",
]);

function reply(data: unknown, status: number) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function ip(request: Request) {
  return (
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}



export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return reply({ error: "Content-Type must be application/json.", code: "INVALID_CONTENT_TYPE" }, 415);
  }
  if (!await rateAllowed("support-request", ip(request), 5, 600000)) {
    return reply({ error: "Too many support requests. Please try again later.", code: "RATE_LIMITED" }, 429);
  }

  const raw = await request.text();
  if (raw.length > 7000) {
    return reply({ error: "Support request is too large.", code: "INVALID_REQUEST" }, 400);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return reply({ error: "Invalid support request.", code: "INVALID_REQUEST" }, 400);
  }

  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const orderNumber = typeof body.orderNumber === "string" ? body.orderNumber.trim() : "";
  const category = typeof body.category === "string" ? body.category as SupportCaseCategory : "other";
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (
    customerName.length < 2 ||
    customerName.length > 120 ||
    !isValidBangladeshPhone(phone) ||
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    (orderNumber && !/^WEB-[A-Z0-9-]{8,90}$/i.test(orderNumber)) ||
    !categories.has(category) ||
    note.length < 5 ||
    note.length > 2000
  ) {
    return reply({ error: "Check your contact and support-request details.", code: "INVALID_REQUEST" }, 400);
  }

  const session = await currentCustomerSession();
  const row = await createCustomerSupportCase({
    ...(session ? { accountId: session.account.id } : {}),
    customerName,
    phone: normalizeBangladeshPhone(phone),
    ...(email ? { email } : {}),
    ...(orderNumber ? { orderNumber } : {}),
    category: category as Exclude<SupportCaseCategory, "return" | "refund">,
    note,
  });

  return reply({ caseId: row.id, status: row.status }, 201);
}
