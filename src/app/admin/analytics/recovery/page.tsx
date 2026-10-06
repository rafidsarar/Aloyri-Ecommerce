import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  cartRecoveryReadiness,
  listCartRecoveries,
} from "@/lib/cart-recovery";

export default async function CartRecoveryAdminPage() {
  const admin = await requireAdminPermission("analytics.view");
  const [status, rows] = await Promise.all([
    Promise.resolve(cartRecoveryReadiness()),
    listCartRecoveries(),
  ]);
  const counts = {
    pending: rows.filter((row) => row.status === "pending").length,
    sent: rows.filter((row) => row.status === "sent").length,
    cancelled: rows.filter((row) => row.status === "cancelled").length,
    expired: rows.filter((row) => row.status === "expired").length,
  };

  return (
    <AdminShell
      username={admin.username}
      title="Abandoned cart recovery"
      subtitle="Consent-only recovery infrastructure. Email capture and sending remain disabled until the Aloyri sending domain, sender and explicit recovery switch are all configured."
    >
      {!status.enabled ? (
        <AdminNotice tone="neutral">
          Recovery is safely dormant. No abandoned-cart email address is captured and no recovery email is sent while the readiness checks below are incomplete.
        </AdminNotice>
      ) : (
        <AdminNotice>
          Cart recovery is enabled. Customers who explicitly opt in can receive one secure cart reminder.
        </AdminNotice>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Domain verified", status.domainReady ? "Ready" : "Pending"],
          ["Sender configured", status.senderReady ? "Ready" : "Pending"],
          ["Recovery switch", status.recoveryEnabled ? "Enabled" : "Disabled"],
          ["Overall status", status.enabled ? "Active" : "Dormant"],
        ].map(([label, value]) => (
          <AdminCard key={label}>
            <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-black/42">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </AdminCard>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Pending", counts.pending],
          ["Sent", counts.sent],
          ["Cancelled", counts.cancelled],
          ["Expired", counts.expired],
        ].map(([label, value]) => (
          <AdminCard key={label}>
            <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-black/42">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </AdminCard>
        ))}
      </div>

      <AdminCard className="mt-5">
        <p className="text-sm font-semibold">Activation checklist</p>
        <div className="mt-4 grid gap-3 text-sm text-black/58">
          <p>1. Verify the Aloyri sending domain with the email provider.</p>
          <p>2. Set a verified <code>ALOYRI_RECOVERY_FROM_EMAIL</code> sender.</p>
          <p>3. Set <code>RESEND_API_KEY</code> securely in Vercel.</p>
          <p>4. Set <code>ALOYRI_EMAIL_DOMAIN_VERIFIED=1</code>.</p>
          <p>5. Set <code>ALOYRI_CART_RECOVERY_ENABLED=1</code>.</p>
          <p>6. Schedule the protected <code>/api/cron/cart-recovery</code> endpoint using the existing <code>CRON_SECRET</code>.</p>
        </div>
        <p className="mt-5 text-xs leading-6 text-black/42">
          No paid Vercel upgrade is required by this implementation itself. Scheduling cadence can be chosen later based on the hosting limits available at that time.
        </p>
      </AdminCard>
    </AdminShell>
  );
}
