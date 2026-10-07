import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  listPaymentSettlements,
  paymentSettlementReadiness,
} from "@/lib/payment-settlement";

function money(value: number) {
  return "BDT " + Math.round(value).toLocaleString("en-BD");
}

function when(value: string) {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

function badge(value: string) {
  if (["paid", "refunded", "matched", "not_required"].includes(value)) {
    return "bg-emerald-50 text-emerald-700";
  }
  if (["failed", "cancelled", "rejected", "attention"].includes(value)) {
    return "bg-red-50 text-red-700";
  }
  return "bg-amber-50 text-amber-700";
}

export default async function PaymentsPage() {
  const admin = await requireAdminPermission("analytics.view");
  const [records, readiness] = await Promise.all([
    listPaymentSettlements(250),
    Promise.resolve(paymentSettlementReadiness()),
  ]);

  const paid = records.filter((row) => row.state === "paid").length;
  const refundQueue = records.filter((row) =>
    ["requested", "processing", "partially_refunded"].includes(row.refundState),
  ).length;
  const attention = records.filter(
    (row) => row.reconciliation.state === "attention",
  ).length;

  return (
    <AdminShell
      username={admin.username}
      title="Payments & refunds"
      subtitle="Read-only settlement intelligence for website orders. CRM remains the operational authority; this dashboard mirrors payment, reconciliation and refund state without moving money."
    >
      {!readiness.datastoreReady ? (
        <AdminNotice tone="warning">
          The website datastore is unavailable, so settlement records cannot be retained.
        </AdminNotice>
      ) : null}
      <AdminNotice tone="neutral">
        Cash on Delivery is live. bKash and Nagad are deliberately dormant until merchant credentials and a credential-specific provider certification are completed.
      </AdminNotice>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminCard><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">Settlements</p><p className="mt-3 text-3xl font-semibold">{records.length}</p></AdminCard>
        <AdminCard><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">Paid</p><p className="mt-3 text-3xl font-semibold">{paid}</p></AdminCard>
        <AdminCard><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">Refund review</p><p className="mt-3 text-3xl font-semibold">{refundQueue}</p></AdminCard>
        <AdminCard><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">Reconciliation attention</p><p className="mt-3 text-3xl font-semibold">{attention}</p></AdminCard>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {(["COD", "bKash", "Nagad"] as const).map((method) => {
          const provider = readiness.providers[method];
          return (
            <AdminCard key={method}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{method === "COD" ? "Cash on Delivery" : method}</p>
                  <p className="mt-2 text-xs leading-5 text-black/45">{provider.reason}</p>
                </div>
                <span className={"rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] " + badge(provider.enabled ? "paid" : "pending")}>
                  {provider.enabled ? "active" : provider.configured ? "locked" : "dormant"}
                </span>
              </div>
            </AdminCard>
          );
        })}
      </div>

      <AdminCard className="mt-5">
        <p className="text-sm font-semibold">Settlement ledger</p>
        <p className="mt-1 text-xs leading-5 text-black/45">
          Delivery status alone never marks COD as paid. Paid/refunded state changes only through a signed CRM settlement event, preventing false cash assumptions.
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="border-b border-black/8 text-[10px] uppercase tracking-[.12em] text-black/40">
              <tr><th className="px-2 py-3">Order</th><th className="px-2 py-3">Method</th><th className="px-2 py-3">Total</th><th className="px-2 py-3">Settlement</th><th className="px-2 py-3">Refund</th><th className="px-2 py-3">Reconciliation</th><th className="px-2 py-3">Updated</th></tr>
            </thead>
            <tbody className="divide-y divide-black/7">
              {records.map((row) => (
                <tr key={row.id}>
                  <td className="px-2 py-3 font-semibold">{row.orderNumber}</td>
                  <td className="px-2 py-3">{row.method}</td>
                  <td className="px-2 py-3">{money(row.orderTotal)}</td>
                  <td className="px-2 py-3"><span className={"rounded-full px-2 py-1 font-semibold " + badge(row.state)}>{row.state}</span></td>
                  <td className="px-2 py-3"><span className={"rounded-full px-2 py-1 font-semibold " + badge(row.refundState)}>{row.refundState}</span>{row.refundedAmount > 0 ? <span className="ml-2">{money(row.refundedAmount)}</span> : null}</td>
                  <td className="px-2 py-3"><span className={"rounded-full px-2 py-1 font-semibold " + badge(row.reconciliation.state)}>{row.reconciliation.state}</span>{row.reconciliation.issues.length ? <p className="mt-1 max-w-xs leading-5 text-black/45">{row.reconciliation.issues.join(" ")}</p> : null}</td>
                  <td className="px-2 py-3 text-black/45">{when(row.updatedAt)}</td>
                </tr>
              ))}
              {!records.length ? (
                <tr><td colSpan={7} className="px-2 py-8 text-center text-sm text-black/45">No website settlement records yet. New orders will begin populating this ledger automatically.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </AdminShell>
  );
}
