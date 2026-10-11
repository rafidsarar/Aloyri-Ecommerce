import { notFound } from "next/navigation";
import { AdminNotice, AdminShell } from "@/components/admin/admin-shell";
import { WebsitePageEditor, type EditableWebsitePage } from "@/components/admin/website-page-editor";
import { requireAdminPermission } from "@/lib/admin-auth";
import { readDraftStorefrontConfig } from "@/lib/storefront-admin-store";

const editablePages = new Set<EditableWebsitePage>(["about", "shipping", "returns", "contact", "faq"]);

export default async function AdminContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ page: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const admin = await requireAdminPermission("pages.view");
  const [{ page }, query, config] = await Promise.all([params, searchParams, readDraftStorefrontConfig()]);
  if (!editablePages.has(page as EditableWebsitePage)) notFound();
  const title = page === "faq" ? "Frequently asked questions" : config.pages[page as Exclude<EditableWebsitePage, "faq">].title;
  return (
    <AdminShell username={admin.username} title={title} subtitle="Edit customer-facing website content without changing CRM operations.">
      {query.saved ? <AdminNotice>Page content saved live.</AdminNotice> : null}
      <WebsitePageEditor config={config} page={page as EditableWebsitePage} />
    </AdminShell>
  );
}
