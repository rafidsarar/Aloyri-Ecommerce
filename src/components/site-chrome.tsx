"use client";

import { usePathname } from "next/navigation";
import { CatalogProvider } from "@/components/catalog-provider";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { PerformanceReporter } from "@/components/performance-reporter";

export function SiteChrome({
  children,
  announcement,
  footerDescription,
}: {
  children: React.ReactNode;
  announcement: string;
  footerDescription: string;
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <CatalogProvider>
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
