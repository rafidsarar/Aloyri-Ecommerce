import Link from "next/link";
import { updateSupportCaseAction } from "@/app/admin/customer-service/actions";
import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import {
  hasAdminPermission,
  requireAdminPermission,
} from "@/lib/admin-auth";
import { listCourierShipments } from "@/lib/courier-shipment";
import { listPaymentSettlements } from "@/lib/payment-settlement";
import {
  listSupportCases,
} from "@/lib/support-cases";
import {
  supportCaseIntelligence,
  type SupportCaseStatus,
} from "@/lib/support-case-model";

const filters = [
  "open",
  "new",
  "reviewing",
  "waiting-customer",
  "waiting-operations",
  "resolved",
  "closed",
  "all",
] as const;

function when(value: string) {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

function badge(value: string) {
  if (["resolved", "closed", "clear", "low"].includes(value)) {
    return "bg-emerald-50 text-emerald-700";
  }
  if (["urgent", "attention"].includes(value)) {
    return "bg-red-50 text-red-700";
  }
  return "bg-amber-50 text-amber-800";
}

export default async function CustomerServiceAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; saved?: string; error?: string }>;
}) {
  const admin = await requireAdminPermission("support.view");
  const query = await searchParams;
  const selected = filters.includes(query.status as (typeof filters)[number])
    ? (query.status as (typeof filters)[number])
    : "open";

  const [cases, payments, shipments] = await Promise.all([
    listSupportCases(500),
    listPaymentSettlements(500),
    listCourierShipments(500),
  ]);
  const paymentByOrder = new Map(payments.map((row) => [row.orderNumber, row]));
  const shipmentByOrder = new Map(shipments.map((row) => [row.orderNumber, row]));
  const openStatuses = new Set<SupportCaseStatus>([
    "new",
    "reviewing",
    "waiting-customer",
    "waiting-operations",
  ]);

  const enriched = cases.map((row) => {
    const payment = row.orderNumber ? paymentByOrder.get(row.orderNumber) : undefined;
    const shipment = row.orderNumber ? shipmentByOrder.get(row.orderNumber) : undefined;
    const intelligence = supportCaseIntelligence({
      createdAt: row.createdAt,
      status: row.status,
      category: row.category,
      preferredResolution: row.preferredResolution,
      paymentState: payment?.state,
      refundState: payment?.refundState,
      paymentReconciliation: payment?.reconciliation.state,
      shipmentState: shipment?.state,
      shipmentReconciliation: shipment?.reconciliation.state,
      codState: shipment?.cod.state,
    });
    return { row, payment, shipment, intelligence };
  });

  const rows = enriched.filter(({ row }) => {
    if (selected === "all") return true;
    if (selected === "open") return openStatuses.has(row.status);
    return row.status === selected;
  });

  const open = enriched.filter(({ row }) => openStatuses.has(row.status)).length;
  const attention = enriched.filter(({ intelligence }) => intelligence.level === "attention").length;
  const refunds = enriched.filter(({ row }) => row.preferredResolution === "Refund" && openStatuses.has(row.status)).length;
  const delivery = enriched.filter(({ row, intelligence }) =>
    row.category === "delivery" || intelligence.signals.some((signal) => signal.key === "delivery-exception"),
  ).length;
  const canManage = hasAdminPermission(admin, "support.manage");

  return (
    <AdminShell
      username={admin.username}
      title="Customer service"
      subtitle="One queue for website support, returns, refunds, delivery exceptions and order questions. CRM remains the order and finance authority; this workspace adds customer-service context and follow-up intelligence."
    >
      {query.saved ? <AdminNotice>Support case updated.</AdminNotice> : null}
      {query.error ? <AdminNotice tone="warning">{query.error}</AdminNotice> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminCard><p className="text-[10px] font-semibold uppercase tracking-[.13em] text-black/42">Open cases</p><p className="mt-2 text-3xl font-semibold">{open}</p></AdminCard>
        <AdminCard><p className="text-[10px] font-semibold uppercase tracking-[.13em] text-black/42">Needs attention</p><p className="mt-2 text-3xl font-semibold">{attention}</p></AdminCard>
        <AdminCard><p className="text-[10px] font-semibold uppercase tracking-[.13em] text-black/42">Refund follow-up</p><p className="mt-2 text-3xl font-semibold">{refunds}</p></AdminCard>
        <AdminCard><p className="text-[10px] font-semibold uppercase tracking-[.13em] text-black/42">Delivery-linked</p><p className="mt-2 text-3xl font-semibold">{delivery}</p></AdminCard>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Link
            key={filter}
            href={"/admin/customer-service?status=" + filter}
            className={
              filter === selected
                ? "rounded-full bg-[#713a35] px-4 py-2 text-xs font-semibold text-white"
                : "rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-black/55"
            }
          >
            {filter.replace("-", " ").replace(/^./, (value) => value.toUpperCase())}
          </Link>
        ))}
      </div>

      <AdminNotice tone="neutral">
        Payment and courier records are read here for context only. Customer Service cannot mark a COD payment paid, approve a refund in finance, or change CRM inventory from this screen.
      </AdminNotice>

      <div className="mt-5 grid gap-4">
        {rows.map(({ row, payment, shipment, intelligence }) => (
          <AdminCard key={row.id}>
            <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={"rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] " + badge(row.priority)}>{row.priority}</span>
                  <span className="rounded-full border border-black/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-black/50">{row.status}</span>
                  <span className="rounded-full bg-[#f2e8e4] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-[#713a35]">{row.category}</span>
                  <span className={"rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] " + badge(intelligence.level)}>{intelligence.level}</span>
                </div>
                <h2 className="mt-4 text-lg font-semibold">
                  {row.orderNumber || "General support"} · {row.customerName || row.reason || "Customer request"}
                </h2>
                <p className="mt-2 text-sm leading-7 text-black/58">{row.note || "No customer note provided."}</p>
                <div className="mt-4 grid gap-2 text-xs text-black/45 sm:grid-cols-2">
                  <span>Case: <span className="font-mono">{row.id.slice(0, 12)}</span></span>
                  <span>Created: {when(row.createdAt)}</span>
                  <span>Phone: {row.phone}</span>
                  <span>Source: {row.source}</span>
                  {row.email ? <span>Email: {row.email}</span> : null}
                  {row.crmReturnRequestId ? <span>CRM return: {row.crmReturnRequestId}</span> : null}
                  {row.preferredResolution ? <span>Preferred: {row.preferredResolution}</span> : null}
                  {row.condition ? <span>Condition: {row.condition}</span> : null}
                </div>

                {intelligence.signals.length ? (
                  <div className="mt-5 grid gap-2">
                    {intelligence.signals.map((signal) => (
                      <div key={signal.key} className={"rounded-xl px-4 py-3 text-xs leading-5 " + (signal.level === "attention" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800")}>
                        <strong>{signal.label}.</strong> {signal.detail}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
                    No payment, delivery or aging exception is currently detected.
                  </p>
                )}

                {row.orderNumber ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-black/8 p-4 text-xs">
                      <p className="font-semibold">Payment</p>
                      <p className="mt-2 text-black/50">
                        {payment ? payment.state + " · refund " + payment.refundState + " · reconciliation " + payment.reconciliation.state : "No website settlement record"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-black/8 p-4 text-xs">
                      <p className="font-semibold">Delivery</p>
                      <p className="mt-2 text-black/50">
                        {shipment ? shipment.state + " · COD " + shipment.cod.state + " · reconciliation " + shipment.reconciliation.state : "No website shipment record"}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              {canManage ? (
                <form action={updateSupportCaseAction} className="grid h-fit gap-3 rounded-xl bg-[#f7f4f2] p-4">
                  <input type="hidden" name="id" value={row.id} />
                  <label className="text-xs font-semibold">
                    Status
                    <select name="status" defaultValue={row.status} className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-xs">
                      {["new", "reviewing", "waiting-customer", "waiting-operations", "resolved", "closed"].map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold">
                    Priority
                    <select name="priority" defaultValue={row.priority} className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-xs">
                      {["low", "normal", "high", "urgent"].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold">
                    Internal note
                    <textarea name="internalNote" maxLength={1200} rows={4} defaultValue={row.internalNote || ""} className="mt-2 w-full rounded-lg border border-black/10 bg-white p-3 text-xs" />
                  </label>
                  <button className="rounded-lg bg-[#713a35] px-4 py-3 text-xs font-semibold text-white">Save case update</button>
                </form>
              ) : null}
            </div>
          </AdminCard>
        ))}
        {!rows.length ? (
          <AdminCard><p className="py-8 text-center text-sm text-black/45">No customer-service cases match this filter.</p></AdminCard>
        ) : null}
      </div>
    </AdminShell>
  );
}
