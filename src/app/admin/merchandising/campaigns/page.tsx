import Link from "next/link";
import {
  AdminCard,
  AdminNotice,
  AdminShell,
} from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import { campaignScheduleState } from "@/lib/merchandising";
import { readDraftStorefrontConfig } from "@/lib/storefront-admin-store";

function when(value: string) {
  if (!value) return "Open";
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const admin = await requireAdminPermission("merchandising.view");
  const [query, config] = await Promise.all([
    searchParams,
    readDraftStorefrontConfig(),
  ]);

  return (
    <AdminShell
      username={admin.username}
      title="Campaigns"
      subtitle="Schedule campaign presentation, creative and product targets while CRM remains authoritative for actual sale price and promotion eligibility."
    >
      {query.deleted ? <AdminNotice>Campaign removed from Draft.</AdminNotice> : null}

      <div className="mb-5 flex justify-end">
        <Link
          href="/admin/merchandising/campaigns/new"
          className="rounded-xl bg-[#713a35] px-5 py-3 text-sm font-semibold text-white"
        >
          New campaign
        </Link>
      </div>

      <AdminCard>
        {config.merchandising.campaigns.length ? (
          <div className="divide-y divide-black/7">
            {config.merchandising.campaigns.map((campaign) => {
              const state = campaignScheduleState(campaign);
              return (
                <div
                  key={campaign.id}
                  className="grid gap-4 py-4 lg:grid-cols-[1fr_140px_220px_110px_auto] lg:items-center"
                >
                  <div>
                    <p className="text-sm font-semibold">{campaign.title}</p>
                    <p className="mt-1 text-xs text-black/42">
                      {campaign.productIds.length} direct products
                      {campaign.collectionId ? " · collection target" : ""}
                      {campaign.promotionOnly ? " · CRM promotion only" : ""}
                    </p>
                  </div>
                  <span
                    className={
                      state === "live"
                        ? "w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-emerald-700"
                        : state === "invalid"
                          ? "w-fit rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-red-700"
                          : "w-fit rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-black/50"
                    }
                  >
                    {state}
                  </span>
                  <span className="text-xs leading-5 text-black/45">
                    {when(campaign.startAt)} → {when(campaign.endAt)}
                  </span>
                  <span className="text-xs text-black/45">
                    {campaign.showProducts ? "Products shown" : "Creative only"}
                  </span>
                  <Link
                    href={"/admin/merchandising/campaigns/" + campaign.id}
                    className="rounded-lg border border-[#713a35]/16 px-3 py-2 text-xs font-semibold text-[#713a35]"
                  >
                    Edit
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold">No campaigns yet.</p>
            <p className="mt-2 text-xs text-black/45">
              Create a campaign to schedule storefront creative and product presentation.
            </p>
          </div>
        )}
      </AdminCard>
    </AdminShell>
  );
}
