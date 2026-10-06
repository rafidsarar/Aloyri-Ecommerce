"use client";

import { usePathname } from "next/navigation";
import { CatalogProvider } from "@/components/catalog-provider";
import { StorefrontAnalyticsTracker } from "@/components/storefront-analytics-tracker";
import { PerformanceReporter } from "@/components/performance-reporter";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { PerformanceReporter } from "@/components/performance-reporter";

export function SiteChrome({
  children,
  announcement,
  footerDescription,
  preview,
}: {
  children: React.ReactNode;
  announcement: string;
  footerDescription: string;
  preview: boolean;
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <CatalogProvider>
      {!preview ? <StorefrontAnalyticsTracker /> : null}
      {!preview ? <PerformanceReporter /> : null}
      {preview ? (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-950">
          <span>Draft preview — customers cannot see these changes yet.</span>
          <a href="/admin/publishing" className="underline underline-offset-2">
            Back to Publishing
          </a>
          <a href="/admin/preview/exit" className="underline underline-offset-2">
            Exit preview
          </a>
        </div>
      ) : null}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Header announcement={announcement} />
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
      <Footer description={footerDescription} />
      <PerformanceReporter />
    </CatalogProvider>
  );
}
