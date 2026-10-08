import { submitCrmReturnRequest } from "@/lib/crm-return-integration";
import { ownsSupportCase } from "@/lib/support-ownership";
import { currentCustomerSession } from "@/lib/customer-auth";
import { fetchCrmOrderTracking } from "@/lib/crm-tracking-integration";
import {
  appendCustomerSupportReply,
  createCustomerSupportCase,
  listSupportCases,
} from "@/lib/support-cases";

export const dynamic = "force-dynamic";

function reply(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: "Invalid request origin." }, 403);
  const session = await currentCustomerSession();
  if (!session) return reply({ error: "Sign in required." }, 401);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return reply({ error: "Invalid request." }, 415);
  }
  const raw = await request.text();
  if (raw.length > 5000) return reply({ error: "Request too large." }, 413);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return reply({ error: "Invalid request." }, 400);
  }

  const action = typeof body.action === "string" ? body.action : "";
  if (action === "support-reply") {
    const caseId = typeof body.caseId === "string" ? body.caseId : "";
    const note = typeof body.note === "string" ? body.note : "";
    const refs = session.account.orderRefs;
    const orderNumbers = new Set(refs.map((row) => row.orderNumber));
    const owned = (await listSupportCases(1000)).find(
      (row) =>
        row.id === caseId &&
        ownsSupportCase(row, session.account.id, orderNumbers),
    );
    if (!owned) return reply({ error: "Support case not found." }, 404);
    if (note.trim().length < 2 || note.length > 1200) {
      return reply({ error: "Enter a reply between 2 and 1200 characters." }, 400);
    }
    const updated = await appendCustomerSupportReply(caseId, note);
    return reply({ caseId: updated.id, status: updated.status });
  }

  const orderNumber =
    typeof body.orderNumber === "string"
      ? body.orderNumber.trim().toUpperCase()
      : "";
  const ref = session.account.orderRefs.find((row) => row.orderNumber === orderNumber);
  if (!ref) return reply({ error: "Order not found in this account." }, 404);

  const tracking = await fetchCrmOrderTracking({
    orderNumber: ref.orderNumber,
    phone: ref.phone,
  });
  if (!tracking.ok) return reply({ error: "Order status is unavailable." }, 503);

  if (
    action === "cancellation" &&
    !["New", "Confirmed"].includes(tracking.body.status)
  ) {
    return reply({ error: "This order is already too far into fulfillment for a cancellation request." }, 409);
  }
  if (
    action === "delivery-issue" &&
    !["Shipped", "Out for delivery", "Delivered"].includes(tracking.body.status)
  ) {
    return reply({ error: "Delivery issue reporting becomes available after shipment." }, 409);
  }
  if (!["cancellation", "delivery-issue"].includes(action)) {
    return reply({ error: "Unsupported request." }, 400);
  }

  const note =
    typeof body.note === "string" && body.note.trim()
      ? body.note.trim().slice(0, 1000)
      : action === "cancellation"
        ? "Customer requested cancellation before fulfillment."
        : "Customer reported a delivery issue from the signed-in account.";

  if (action === "cancellation") {
    const result = await submitCrmReturnRequest({
      requestType: "cancellation",
      orderNumber: ref.orderNumber,
      phone: ref.phone,
      reason: "Changed mind",
      condition: "Not received",
      preferredResolution: "Other",
      note: "Cancellation request: " + note,
      items: tracking.body.items.map((item, line) => ({ line, qty: item.qty })),
    });
    if (!result.ok || !result.body.requestId) {
      return reply({ error: result.body.error || "CRM could not accept the cancellation request. Please try again." }, result.ok ? 502 : result.status);
    }
    // CRM acceptance is authoritative; do not report failure after it succeeds.
    try {
      if (!result.body.duplicate) await createCustomerSupportCase({
        accountId: session.account.id,
        customerName: session.account.displayName || "Aloyri customer",
        phone: ref.phone,
        email: session.account.email,
        orderNumber: ref.orderNumber,
        category: "order",
        note: "Cancellation request · CRM " + result.body.requestId + " · " + note,
      });
    } catch (error) {
      console.error("Cancellation support context failed", error);
    }
    return reply({ caseId: result.body.requestId, status: result.body.status, duplicate: result.body.duplicate }, result.body.duplicate ? 200 : 201);
  }

  const row = await createCustomerSupportCase({
    accountId: session.account.id,
    customerName: session.account.displayName || "Aloyri customer",
    phone: ref.phone,
    email: session.account.email,
    orderNumber: ref.orderNumber,
    category: action === "cancellation" ? "order" : "delivery",
    note,
  });

  return reply({ caseId: row.id, status: row.status }, 201);
}
