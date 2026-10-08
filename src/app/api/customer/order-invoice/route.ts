import { currentCustomerSession } from "@/lib/customer-auth";
import { fetchCrmOrderInvoice } from "@/lib/crm-invoice-integration";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request) {
  const session = await currentCustomerSession();
  if (!session) return new Response("Sign in required.", { status: 401, headers });
  const orderNumber = new URL(request.url).searchParams.get("order")?.trim().toUpperCase() || "";
  const ref = session.account.orderRefs.find((row) => row.orderNumber === orderNumber);
  if (!ref) return new Response("Order not found.", { status: 404, headers });
  const invoice = await fetchCrmOrderInvoice({ orderNumber: ref.orderNumber, phone: ref.phone });
  if (!invoice.ok) return new Response("Invoice is temporarily unavailable. Please try again.", { status: 503, headers });
  return new Response(new Uint8Array(invoice.body.pdf), {
    headers: {
      ...headers,
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Aloyri-Invoice-' + ref.orderNumber.replace(/[^A-Za-z0-9-]/g, "") + '.pdf"',
      "Content-Security-Policy": "sandbox; default-src 'none'",
    },
  });
}
