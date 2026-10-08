import { ownsSupportCase } from "@/lib/support-ownership";
import {
  currentCustomerSession,
} from "@/lib/customer-auth";
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

async function payload(page = 1) {
  const session = await currentCustomerSession();
  if (!session || session.session.method !== "google" || session.account.displayName.trim().length < 2 || !/^(?:\+?88)?01[3-9]\d{8}$/.test(session.account.phone || "")) return null;
  const allRefs = session.account.orderRefs;
  const refs = allRefs.slice((page - 1) * 12, page * 12);
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

  const orderNumbers = new Set(allRefs.map((ref) => ref.orderNumber));
  const cases = (await listSupportCases(1000))
    .filter(
      (row) =>
        ownsSupportCase(row, session.account.id, orderNumbers),
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
    pagination: { page, pageSize: 12, total: allRefs.length, pages: Math.max(1, Math.ceil(allRefs.length / 12)) },
    supportCases: cases,
    productAlerts: alerts,
  };
}

export async function GET(request: Request) {
  const raw = Number(new URL(request.url).searchParams.get("page") || 1);
  if (!Number.isSafeInteger(raw) || raw < 1) return reply({ error: "Invalid page." }, 400);
  const data = await payload(raw);
  return data ? reply(data) : reply({ error: "Sign in required." }, 401);
}

export async function POST() {
  const session=await currentCustomerSession();
  if(!session)return reply({error:"Sign in required."},401);
  return reply({error:"Browser order imports are no longer supported. Orders placed while signed in are linked automatically."},410);
}
