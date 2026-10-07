import { currentCustomerSession } from "@/lib/customer-auth";
import { fetchCrmOrderTracking } from "@/lib/crm-tracking-integration";

export const dynamic = "force-dynamic";

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(request: Request) {
  const session = await currentCustomerSession();
  if (!session) return new Response("Sign in required.", { status: 401 });
  const orderNumber = new URL(request.url).searchParams.get("order")?.trim().toUpperCase() || "";
  const ref = session.account.orderRefs.find((row) => row.orderNumber === orderNumber);
  if (!ref) return new Response("Order not found.", { status: 404 });

  const tracking = await fetchCrmOrderTracking({
    orderNumber: ref.orderNumber,
    phone: ref.phone,
  });
  if (!tracking.ok) return new Response("Order summary is temporarily unavailable.", { status: 503 });
  const order = tracking.body;
  const rows = order.items
    .map(
      (item) =>
        "<tr><td>" + esc(item.brand + " " + item.name + " " + item.size) +
        "</td><td>" + esc(item.qty) +
        "</td><td>BDT " + esc(Math.round(item.unitPrice).toLocaleString("en-BD")) +
        "</td></tr>",
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Aloyri ${esc(order.orderNumber)}</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;color:#321f1c}h1{color:#713a35}table{width:100%;border-collapse:collapse;margin:24px 0}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}.total{font-size:20px;font-weight:700}</style></head><body><h1>Aloyri order summary</h1><p><strong>Order:</strong> ${esc(order.orderNumber)}</p><p><strong>Status:</strong> ${esc(order.status)}</p><p><strong>Created:</strong> ${esc(order.created)}</p><p><strong>Payment:</strong> ${esc(order.paymentMethod)}</p><table><thead><tr><th>Product</th><th>Qty</th><th>Unit price</th></tr></thead><tbody>${rows}</tbody></table><p>Products subtotal: BDT ${esc(Math.round(order.productsSubtotal).toLocaleString("en-BD"))}</p><p>Discount: BDT ${esc(Math.round(order.discount).toLocaleString("en-BD"))}</p><p>Delivery: BDT ${esc(Math.round(order.deliveryCharge).toLocaleString("en-BD"))}</p><p class="total">Total: BDT ${esc(Math.round(order.total).toLocaleString("en-BD"))}</p><p>This customer-facing summary reflects the current CRM order record. It is not a payment receipt unless payment has been settled.</p></body></html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": 'attachment; filename="Aloyri-' + order.orderNumber.replace(/[^A-Za-z0-9-]/g, "") + '.html"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
