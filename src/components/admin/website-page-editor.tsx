import { saveFaq, saveInfoPage } from "@/app/admin/actions";
import { AdminCard } from "@/components/admin/admin-shell";
import { EditableContentList } from "@/components/admin/editable-content-list";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import type { StorefrontConfig } from "@/lib/storefront-admin-store";

export type EditableWebsitePage = "about" | "shipping" | "returns" | "contact" | "faq" | "privacy" | "terms";

/** Keeps the exact, existing page/FAQ save forms available inside Builder. */
export function WebsitePageEditor({ config, page, inBuilder = false }: {
  config: StorefrontConfig;
  page: EditableWebsitePage;
  inBuilder?: boolean;
}) {
  if (page === "faq") {

    return (
      <>
        <form key={config.updatedAt} action={saveFaq} className="grid gap-5">
          {inBuilder ? <input type="hidden" name="builderWorkspace" value="pages" /> : null}
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

          <EditableContentList mode="faq" initialItems={config.faq.items} />

          <div className="flex justify-end">
            <AdminSubmitButton>Save FAQ</AdminSubmitButton>
          </div>
        </form>
      </>
    );
  }
  const content = config.pages[page];

  return (
    <>
      <form key={config.updatedAt} action={saveInfoPage} className="grid gap-5">
        {inBuilder ? <input type="hidden" name="builderWorkspace" value="pages" /> : null}
        <input type="hidden" name="pageKey" value={page} />

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

        <EditableContentList mode="sections" initialItems={content.sections} />

        <div className="flex justify-end">
          <AdminSubmitButton>Save page</AdminSubmitButton>
        </div>
      </form>
    </>
  );
}
