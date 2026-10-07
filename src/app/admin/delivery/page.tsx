import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  courierShipmentReadiness,
  listCourierShipments,
} from "@/lib/courier-shipment";
import { codReconciliation, providerLabel } from "@/lib/courier-shipment-model";
import { listPaymentSettlements } from "@/lib/payment-settlement";

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
  if (["delivered", "remitted", "matched"].includes(value)) {
    return "bg-emerald-50 text-emerald-700";
  }
  if (
    [
      "delivery_failed",
      "return_to_origin",
      "returned_to_origin",
      "cancelled",
      "attention",
    ].includes(value)
  ) {
    return "bg-red-50 text-red-700";
  }
  return "bg-amber-50 text-amber-700";
}

export default async function DeliveryPage() {
  const admin = await requireAdminPermission("analytics.view");
  const [shipments, settlements, readiness] = await Promise.all([
    listCourierShipments(250),
    listPaymentSettlements(250),
    Promise.resolve(courierShipmentReadiness()),
  ]);
  const settlementByOrder = new Map(
    settlements.map((row) => [row.orderNumber, row]),
  );

  const active = shipments.filter((row) =>
    [
      "ready_for_courier",
      "booked",
      "picked_up",
      "in_transit",
      "out_for_delivery",
      "reattempt_scheduled",
    ].includes(row.state),
  ).length;
  const failed = shipments.filter((row) => row.state === "delivery_failed").length;
  const rto = shipments.filter((row) =>
    ["return_to_origin", "returned_to_origin"].includes(row.state),
  ).length;
  const codAwaiting = shipments.filter(
    (row) =>
      row.paymentMethod === "COD" &&
      ["collection_pending", "collected", "remittance_pending"].includes(
        row.cod.state,
      ),
  ).length;

  const rows = shipments.map((shipment) => {
    const payment = settlementByOrder.get(shipment.orderNumber);
    const cod = codReconciliation({
      isCod: shipment.paymentMethod === "COD",
      expectedAmount: shipment.cod.expectedAmount,
      collectedAmount: shipment.cod.collectedAmount,
      remittedAmount: shipment.cod.remittedAmount,
      paymentSettlementState: payment?.state,
    });
    return { shipment, payment, cod };
  });
  const attention = rows.filter(
    ({ shipment, cod }) =>
      shipment.reconciliation.state === "attention" || cod.state === "attention",
  ).length;

  return (
    <AdminShell
      username={admin.username}
      title="Delivery & courier"
      subtitle="Shipment, failed-delivery, return-to-origin and COD-remittance intelligence. CRM remains the order authority and direct courier APIs stay locked until provider credentials are certified."
    >
      {!readiness.datastoreReady ? (
        <AdminNotice tone="warning">
          The website datastore is unavailable, so shipment intelligence cannot be retained.
        </AdminNotice>
      ) : null}
      <AdminNotice tone="neutral">
        Direct courier booking is disabled. CRM-originated shipment status can still be mirrored safely, and no courier event is allowed to mark a COD payment paid by itself.
      </AdminNotice>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AdminCard><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">Shipments</p><p className="mt-3 text-3xl font-semibold">{shipments.length}</p></AdminCard>
        <AdminCard><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">Active</p><p className="mt-3 text-3xl font-semibold">{active}</p></AdminCard>
        <AdminCard><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">Failed delivery</p><p className="mt-3 text-3xl font-semibold">{failed}</p></AdminCard>
        <AdminCard><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">RTO</p><p className="mt-3 text-3xl font-semibold">{rto}</p></AdminCard>
        <AdminCard><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-black/40">COD awaiting</p><p className="mt-3 text-3xl font-semibold">{codAwaiting}</p></AdminCard>
      </div>

      {attention ? (
        <AdminNotice tone="warning">
          {attention} shipment{attention === 1 ? "" : "s"} need reconciliation attention.
        </AdminNotice>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {(["pathao", "steadfast", "redx"] as const).map((providerName) => {
          const provider = readiness.providers[providerName];
          return (
            <AdminCard key={providerName}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{providerLabel(providerName)}</p>
                  <p className="mt-2 text-xs leading-5 text-black/45">{provider.reason}</p>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-amber-700">
                  {provider.credentialsConfigured ? "locked" : "dormant"}
                </span>
              </div>
            </AdminCard>
          );
        })}
      </div>

      <AdminCard className="mt-5">
        <p className="text-sm font-semibold">Shipment ledger</p>
        <p className="mt-1 text-xs leading-5 text-black/45">
          COD collection/remittance is compared with the payment ledger. Courier events provide delivery evidence only; CRM settlement remains the financial authority.
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-xs">
            <thead className="border-b border-black/8 text-[10px] uppercase tracking-[.12em] text-black/40">
              <tr>
                <th className="px-2 py-3">Order</th>
                <th className="px-2 py-3">Courier</th>
                <th className="px-2 py-3">Shipment</th>
                <th className="px-2 py-3">Attempts</th>
                <th className="px-2 py-3">COD</th>
                <th className="px-2 py-3">COD reconciliation</th>
                <th className="px-2 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/7">
              {rows.map(({ shipment, cod }) => (
                <tr key={shipment.id}>
                  <td className="px-2 py-3 font-semibold">{shipment.orderNumber}</td>
                  <td className="px-2 py-3">
                    <p>{providerLabel(shipment.provider)}</p>
                    {shipment.trackingReference ? <p className="mt-1 max-w-[180px] truncate text-black/40">{shipment.trackingReference}</p> : null}
                  </td>
                  <td className="px-2 py-3">
                    <span className={"rounded-full px-2 py-1 font-semibold " + badge(shipment.state)}>{shipment.state}</span>
                    {shipment.reattemptAt ? <p className="mt-1 text-black/45">Reattempt {when(shipment.reattemptAt)}</p> : null}
                  </td>
                  <td className="px-2 py-3">{shipment.deliveryAttempts}</td>
                  <td className="px-2 py-3">
                    <span className={"rounded-full px-2 py-1 font-semibold " + badge(shipment.cod.state)}>{shipment.cod.state}</span>
                    {shipment.paymentMethod === "COD" ? (
                      <p className="mt-1 text-black/45">
                        {money(shipment.cod.remittedAmount)} / {money(shipment.cod.expectedAmount)} remitted
                      </p>
                    ) : null}
                  </td>
                  <td className="px-2 py-3">
                    <span className={"rounded-full px-2 py-1 font-semibold " + badge(cod.state)}>{cod.state}</span>
                    {cod.issues.length ? <p className="mt-1 max-w-xs leading-5 text-red-700/70">{cod.issues.join(" ")}</p> : null}
                  </td>
                  <td className="px-2 py-3 text-black/45">{when(shipment.updatedAt)}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr><td colSpan={7} className="px-2 py-8 text-center text-sm text-black/45">No shipment records yet. New website orders will initialize delivery intelligence automatically.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </AdminShell>
  );
}
