import Link from "next/link";
import { AdminCard, AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/admin-auth";
import { readStorefrontConfig } from "@/lib/storefront-admin-store";

const items = [
  ["About", "about", "Brand story and storefront operating philosophy"],
  ["Shipping & delivery", "shipping", "Delivery charges, order handling and tracking guidance"],
  ["Returns & refunds", "returns", "Customer-facing return and refund policy content"],
  ["Contact", "contact", "Support guidance and public contact details"],
  ["FAQ", "faq", "Frequently asked customer questions"],
];

export default async function AdminPagesPage() {
  const admin = await requireAdminPage();
  await readStorefrontConfig();

  return (
    <AdminShell
      username={admin.username}
      title="Pages & FAQ"
      subtitle="Manage customer-facing website information here instead of editing CRM or source code."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {items.map(([title, key, copy]) => (
          <AdminCard key={key}>
            <p className="text-lg font-semibold">{title}</p>
            <p className="mt-2 text-sm leading-6 text-black/48">{copy}</p>
            <Link
              href={`/admin/pages/${key}`}
              className="mt-5 inline-flex rounded-lg border border-[#713a35]/16 px-3 py-2 text-xs font-semibold text-[#713a35]"
            >
              Edit page
            </Link>
          </AdminCard>
        ))}
      </div>
    </AdminShell>
  );
}
