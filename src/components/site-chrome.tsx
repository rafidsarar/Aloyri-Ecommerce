"use client";

import "./storefront-design.css";
import { useEffect, useState, type CSSProperties } from "react";
import { normalizePresentation, defaultPresentation, type StorefrontPresentation } from "@/lib/storefront-presentation";
import { usePathname } from "next/navigation";
import { CatalogProvider } from "@/components/catalog-provider";
import { StorefrontAnalyticsTracker } from "@/components/storefront-analytics-tracker";
import { PerformanceReporter } from "@/components/performance-reporter";
import { CustomerDataCleanup } from "@/components/customer-data-cleanup";
import { Footer } from "@/components/footer";
import { PublicPagePreviewBridge } from "@/components/public-page-preview-bridge";
import { Header } from "@/components/header";
import { GlobalStorefrontSearch } from "@/components/global-storefront-search";
import { KanvaMotion } from "@/components/kanva-motion";

export function SiteChrome({
  children,
  presentation = defaultPresentation,
  announcement,
  footerDescription,
  preview,
  searchSynonymGroups = [],
}: {
  children: React.ReactNode;
  presentation?: StorefrontPresentation;
  announcement: string;
  footerDescription: string;
  preview: boolean;
  searchSynonymGroups?: string[][];
}) {
  const pathname = usePathname();

  const [draft,setDraft]=useState<{presentation?:StorefrontPresentation;announcement?:string;footerDescription?:string} | null>(null);
  useEffect(()=>{
    if(window.parent===window || new URLSearchParams(window.location.search).get("builderPreview")!=="1")return;
    function receive(event:MessageEvent) {
      if(event.origin!==window.location.origin || event.source!==window.parent || !["aloyri-builder-site-draft","aloyri-builder-page-draft"].includes(event.data?.type))return;
      const value=event.data;
      setDraft({presentation:value.presentation?normalizePresentation(value.presentation):undefined,announcement:typeof value.siteContent?.announcement==="string"?value.siteContent.announcement:undefined,footerDescription:typeof value.siteContent?.footerDescription==="string"?value.siteContent.footerDescription:undefined});
      if(["rose","sage","sand"].includes(value.appearance)) document.body.dataset.storefrontTheme=value.appearance;
    }
    window.addEventListener("message",receive);
    return ()=>window.removeEventListener("message",receive);
  },[]);
  const displayPresentation=draft?.presentation || presentation;

  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <CatalogProvider>
      <div data-kanva-storefront className="storefront-design" data-storefront-page={pathname.split("/")[1] || "home"} data-storefront-columns={displayPresentation.desktopColumns} style={{"--storefront-width": displayPresentation.contentWidth === "comfortable" ? "1200px" : "1440px"} as CSSProperties}>
      <KanvaMotion key={pathname} />
      <CustomerDataCleanup />
      <PublicPagePreviewBridge />
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
      <Header announcement={draft?.announcement ?? announcement} presentation={displayPresentation} />
      <GlobalStorefrontSearch key={pathname} synonymGroups={searchSynonymGroups} />
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
      <Footer description={draft?.footerDescription ?? footerDescription} />
      </div>
    </CatalogProvider>
  );
}
