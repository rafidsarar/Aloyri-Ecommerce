import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { SiteChrome } from "@/components/site-chrome";
import { safeJsonLd } from "@/lib/seo";
import { absoluteUrl, siteConfig } from "@/lib/site";
import { readStorefrontConfig } from "@/lib/storefront-admin-store";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: "Aloyri — Let Your Skin Glow.",
    template: "%s | Aloyri",
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  url: siteConfig.url,
  logo: absoluteUrl("/icon.svg"),
  slogan: siteConfig.tagline,
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: siteConfig.url,
  potentialAction: {
    "@type": "SearchAction",
    target: absoluteUrl("/shop?q={search_term_string}"),
    "query-input": "required name=search_term_string",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [config, previewState] = await Promise.all([
    readStorefrontConfig(),
    draftMode(),
  ]);

  return (
    <html lang="en">
      <body data-storefront-theme={config.site.appearance}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteSchema) }}
        />
        <SiteChrome
          announcement={config.site.announcement}
          footerDescription={config.site.footerDescription}
          preview={previewState.isEnabled}
        >
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
