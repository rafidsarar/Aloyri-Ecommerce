import { notFound } from "next/navigation";
import { saveFaq, saveInfoPage } from "@/app/admin/actions";
import { AdminCard, AdminNotice, AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPermission } from "@/lib/admin-auth";
import { readDraftStorefrontConfig, type ContentSection } from "@/lib/storefront-admin-store";

const infoKeys = new Set(["about", "shipping", "returns", "contact"]);

export default async function AdminContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ page: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const admin = await requireAdminPermission("pages.view");
  const [{ page }, query, config] = await Promise.all([
    params,
    searchParams,
    readDraftStorefrontConfig(),
  ]);

  if (page === "faq") {
    const items = [
      ...config.faq.items,
      { question: "", answer: "" },
    ].slice(0, 30);

    return (
      <AdminShell
        username={admin.username}
        title="Frequently asked questions"
        subtitle="Edit public FAQ content without touching CRM."
      >
        {query.saved ? <AdminNotice>FAQ draft saved.</AdminNotice> : null}
        <form action={saveFaq} className="grid gap-5">
          <AdminCard>
            <div className="grid gap-4">
              <label className="grid gap-1.5 text-sm font-medium">
                Eyebrow
                <input name="eyebrow" defaultValue={config.faq.eyebrow} className="rounded-xl border border-black/10 px-4 py-3" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Title
                <input name="title" defaultValue={config.faq.title} className="rounded-xl border border-black/10 px-4 py-3" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Intro
                <textarea name="intro" defaultValue={config.faq.intro} rows={3} className="rounded-xl border border-black/10 px-4 py-3" />
              </label>
            </div>
          </AdminCard>

          <input type="hidden" name="itemCount" value={items.length} />
          {items.map((item, index) => (
            <AdminCard key={index}>
              <p className="text-xs font-semibold uppercase tracking-[.13em] text-[#713a35]/50">
                FAQ {index + 1}
              </p>
              <div className="mt-3 grid gap-3">
                <label className="grid gap-1.5 text-sm font-medium">
                  Question
                  <input
                    name={`item_${index}_question`}
                    defaultValue={item.question}
                    maxLength={400}
                    className="rounded-xl border border-black/10 px-4 py-3"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Answer
                  <textarea
                    name={`item_${index}_answer`}
                    defaultValue={item.answer}
                    rows={3}
                    maxLength={1200}
                    className="rounded-xl border border-black/10 px-4 py-3"
                  />
                </label>
              </div>
            </AdminCard>
          ))}

          <div className="flex justify-end">
            <button className="rounded-xl bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white">
              Save FAQ
            </button>
          </div>
        </form>
      </AdminShell>
    );
  }

  if (!infoKeys.has(page)) notFound();

  const content =
    config.pages[page as keyof typeof config.pages];
  const sections: ContentSection[] = [
    ...content.sections,
    { title: "", paragraphs: [], bullets: [] },
  ].slice(0, 12);

  return (
    <AdminShell
      username={admin.username}
      title={content.title}
      subtitle="Edit the public page structure and customer-facing wording."
    >
      {query.saved ? <AdminNotice>Page draft saved.</AdminNotice> : null}

      <form action={saveInfoPage} className="grid gap-5">
        <input type="hidden" name="pageKey" value={page} />
        <input type="hidden" name="sectionCount" value={sections.length} />

        <AdminCard>
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              Eyebrow
              <input name="eyebrow" defaultValue={content.eyebrow} maxLength={120} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Page title
              <input name="title" defaultValue={content.title} maxLength={180} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Intro
              <textarea name="intro" defaultValue={content.intro} rows={4} maxLength={1000} className="rounded-xl border border-black/10 px-4 py-3" />
            </label>
          </div>
        </AdminCard>

        {sections.map((section, index) => (
          <AdminCard key={index}>
            <p className="text-xs font-semibold uppercase tracking-[.13em] text-[#713a35]/50">
              Section {index + 1}
            </p>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1.5 text-sm font-medium">
                Section title
                <input
                  name={`section_${index}_title`}
                  defaultValue={section.title}
                  maxLength={180}
                  className="rounded-xl border border-black/10 px-4 py-3"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Paragraphs
                <textarea
                  name={`section_${index}_paragraphs`}
                  defaultValue={section.paragraphs.join("\n")}
                  rows={5}
                  className="rounded-xl border border-black/10 px-4 py-3"
                />
                <span className="text-xs font-normal text-black/40">One paragraph per line.</span>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Bullets
                <textarea
                  name={`section_${index}_bullets`}
                  defaultValue={section.bullets.join("\n")}
                  rows={5}
                  className="rounded-xl border border-black/10 px-4 py-3"
                />
                <span className="text-xs font-normal text-black/40">One bullet per line.</span>
              </label>
            </div>
          </AdminCard>
        ))}

        <div className="flex justify-end">
          <button className="rounded-xl bg-[#713a35] px-6 py-3.5 text-sm font-semibold text-white">
            Save page
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
