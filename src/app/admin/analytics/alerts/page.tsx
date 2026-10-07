import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import { customerAuthReadiness } from "@/lib/customer-auth";
import { transactionalEmailReadiness } from "@/lib/email-delivery";
import {
  listLifecycleQueue,
} from "@/lib/lifecycle-email-queue";
import { lifecycleReadiness } from "@/lib/lifecycle-orchestration";
import {
  listProductAlerts,
  productAlertsReadiness,
} from "@/lib/product-alerts";

export default async function EmailAlertsAdminPage() {
  const admin = await requireAdminPermission("analytics.view");
  const [email, auth, alerts, lifecycle, alertRows, queueRows] =
    await Promise.all([
      Promise.resolve(transactionalEmailReadiness()),
      Promise.resolve(customerAuthReadiness()),
      Promise.resolve(productAlertsReadiness()),
      Promise.resolve(lifecycleReadiness()),
      listProductAlerts(),
      listLifecycleQueue(),
    ]);

  const alertCounts = {
    active: alertRows.filter((row) => row.status === "active").length,
    sent: alertRows.filter((row) => row.status === "sent").length,
    cancelled: alertRows.filter((row) => row.status === "cancelled").length,
  };
  const queueCounts = {
    pending: queueRows.filter((row) => row.status === "pending").length,
    sent: queueRows.filter((row) => row.status === "sent").length,
    cancelled: queueRows.filter((row) => row.status === "cancelled").length,
  };
  const cronReady = Boolean(process.env.CRON_SECRET);

  return (
    <AdminShell
      username={admin.username}
      title="Email, alerts & customer authentication"
      subtitle="Operational readiness for product alerts, secure passwordless customer accounts and consent-controlled lifecycle email automation."
    >
      {!email.ready ? (
        <AdminNotice tone="neutral">
          Email-dependent customer features are intentionally fail-closed. No product-alert email, magic sign-in link or lifecycle message can send until the sending domain and sender are verified and configured.
        </AdminNotice>
      ) : (
        <AdminNotice>
          Transactional email infrastructure is ready. Individual feature switches and consent still control each workflow.
        </AdminNotice>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Email domain", email.domainReady ? "Ready" : "Pending"],
          ["Transactional sender", email.senderReady ? "Ready" : "Pending"],
          ["Product alerts", alerts.enabled ? "Active" : "Dormant"],
          ["Customer auth", auth.enabled ? "Active" : "Dormant"],
          ["Lifecycle email", lifecycle.lifecycleEnabled ? "Active" : "Dormant"],
          ["CRM lifecycle feed", lifecycle.crmEventsReady ? "Ready" : "Pending"],
          ["Protected cron", cronReady ? "Ready" : "Pending"],
          ["Overall email", email.ready ? "Ready" : "Blocked"],
        ].map(([label, value]) => (
          <AdminCard key={label}>
            <p className="text-[10px] font-semibold uppercase tracking-[.13em] text-black/42">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </AdminCard>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <AdminCard>
          <p className="text-sm font-semibold">Product alert records</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              ["Active", alertCounts.active],
              ["Sent", alertCounts.sent],
              ["Cancelled", alertCounts.cancelled],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-[#f7f4f2] p-4">
                <p className="text-[10px] uppercase tracking-[.12em] text-black/42">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-black/42">
            Back-in-stock alerts trigger only after an unavailable item becomes available. Price-drop alerts trigger only below the price captured at subscription.
          </p>
        </AdminCard>

        <AdminCard>
          <p className="text-sm font-semibold">Lifecycle delivery queue</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              ["Pending", queueCounts.pending],
              ["Sent", queueCounts.sent],
              ["Cancelled", queueCounts.cancelled],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-[#f7f4f2] p-4">
                <p className="text-[10px] uppercase tracking-[.12em] text-black/42">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-black/42">
            Delivery events only create messages for authenticated customers who explicitly enabled the matching email preference.
          </p>
        </AdminCard>
      </div>

      <AdminCard className="mt-5">
        <p className="text-sm font-semibold">Activation checklist</p>
        <div className="mt-4 grid gap-3 text-sm text-black/58">
          <p>1. Purchase/attach the Aloyri email domain.</p>
          <p>2. Add the domain to the email provider and publish its DNS verification records.</p>
          <p>3. Configure the verified transactional sender and email-provider API credential in Vercel.</p>
          <p>4. Set <code>ALOYRI_EMAIL_DOMAIN_VERIFIED=1</code>.</p>
          <p>5. Enable <code>ALOYRI_PRODUCT_ALERTS_ENABLED=1</code> and <code>ALOYRI_CUSTOMER_AUTH_ENABLED=1</code>.</p>
          <p>6. Connect CRM delivery events, then set <code>ALOYRI_CRM_LIFECYCLE_EVENTS_READY=1</code> and <code>ALOYRI_LIFECYCLE_EMAIL_ENABLED=1</code>.</p>
          <p>7. Configure <code>CRON_SECRET</code> and schedule the product-alert and lifecycle sender endpoints at a cadence supported by the hosting plan.</p>
        </div>
      </AdminCard>
    </AdminShell>
  );
}
