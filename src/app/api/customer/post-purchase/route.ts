import {
  claimCurrentCustomerOrder,
  currentCustomerSession,
} from "@/lib/customer-auth";
import { isValidBangladeshPhone, normalizeBangladeshPhone } from "@/lib/checkout";
import { fetchCrmOrderTracking } from "@/lib/crm-tracking-integration";
import { listProductAlerts } from "@/lib/product-alerts";
import { listSupportCases } from "@/lib/support-cases";

export const dynamic = "force-dynamic";

function reply(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

async function payload() {
  const session = await currentCustomerSession();
  if (!session) return null;
  const refs = session.account.orderRefs.slice(0, 12);
  const tracked = await Promise.all(
    refs.map(async (ref) => {
      const result = await fetchCrmOrderTracking({
        orderNumber: ref.orderNumber,
        phone: ref.phone,
      });
      if (!result.ok) {
        return {
          ok: false as const,
          orderNumber: ref.orderNumber,
          createdAt: ref.createdAt,
          total: ref.total,
        };
      }
      return {
        ok: true as const,
        order: result.body,
        phone: ref.phone,
        canRequestCancellation: ["New", "Confirmed"].includes(result.body.status),
        canReportDeliveryIssue: ["Shipped", "Out for delivery", "Delivered"].includes(result.body.status),
        canRequestReturn: result.body.status === "Delivered",
      };
    }),
  );

  const orderNumbers = new Set(refs.map((ref) => ref.orderNumber));
  const phones = new Set(refs.map((ref) => ref.phone));
  const cases = (await listSupportCases(1000))
    .filter(
      (row) =>
        row.email?.toLowerCase() === session.account.email ||
        Boolean(row.orderNumber && orderNumbers.has(row.orderNumber)) ||
        phones.has(row.phone),
    )
    .slice(0, 30)
    .map((row) => ({
      id: row.id,
      category: row.category,
      status: row.status,
      priority: row.priority,
      orderNumber: row.orderNumber,
      note: row.note,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      events: row.events
        .filter((event) =>
          event.type === "case.created" ||
          event.type === "case.created_from_return" ||
          event.type === "case.status_changed" ||
          event.type === "customer.reply",
        )
        .map((event) => ({
          id: event.id,
          at: event.at,
          type: event.type,
          detail: event.detail,
        })),
    }));

  const alerts = (await listProductAlerts(1000))
    .filter(
      (row) =>
        row.accountId === session.account.id &&
        row.status === "active",
    )
    .slice(0, 30)
    .map((row) => ({
      id: row.id,
      productId: row.productId,
      productName: row.productName,
      productSlug: row.productSlug,
      kinds: row.kinds,
      createdAt: row.createdAt,
    }));

  return {
    account: session.account,
    orders: tracked,
    supportCases: cases,
    productAlerts: alerts,
  };
}

export async function GET() {
  const data = await payload();
  return data ? reply(data) : reply({ error: "Sign in required." }, 401);
}

export async function POST(request: Request) {
  const session = await currentCustomerSession();
  if (!session) return reply({ error: "Sign in required." }, 401);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return reply({ error: "Invalid request." }, 415);
  }
  const raw = await request.text();
  if (raw.length > 12_000) return reply({ error: "Request too large." }, 413);
  let body: { orders?: unknown };
  try {
    body = JSON.parse(raw) as { orders?: unknown };
  } catch {
    return reply({ error: "Invalid request." }, 400);
  }
  if (!Array.isArray(body.orders) || body.orders.length > 12) {
    return reply({ error: "Invalid order list." }, 400);
  }

  let claimed = 0;
  for (const rawOrder of body.orders) {
    if (!rawOrder || typeof rawOrder !== "object") continue;
    const input = rawOrder as Record<string, unknown>;
    if (
      typeof input.orderNumber !== "string" ||
      !/^WEB-[A-Z0-9-]{8,90}$/i.test(input.orderNumber.trim()) ||
      typeof input.phone !== "string" ||
      !isValidBangladeshPhone(input.phone)
    ) continue;
    const orderNumber = input.orderNumber.trim().toUpperCase();
    const phone = normalizeBangladeshPhone(input.phone);
    const tracking = await fetchCrmOrderTracking({ orderNumber, phone });
    if (!tracking.ok) continue;
    await claimCurrentCustomerOrder({
      orderNumber,
      phone,
      createdAt: tracking.body.created || new Date().toISOString(),
      total: tracking.body.total,
    });
    claimed += 1;
  }

  return reply({ claimed });
}
