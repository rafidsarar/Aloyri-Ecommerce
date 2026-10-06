import { AdminCard, AdminShell } from "@/components/admin/admin-shell";
import { UtmBuilder } from "@/components/admin/utm-builder";
import { requireAdminPermission } from "@/lib/admin-auth";
import { siteConfig } from "@/lib/site";

export default async function AnalyticsUtmPage() {
  const admin = await requireAdminPermission("analytics.view");

  return (
    <AdminShell
      username={admin.username}
      title="Campaign UTM builder"
      subtitle="Create clean trackable links for social, creator, referral and campaign traffic."
    >
      <AdminCard>
        <UtmBuilder origin={siteConfig.url} />
      </AdminCard>
    </AdminShell>
  );
}
