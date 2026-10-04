import type { Metadata } from "next";
import { CatalogProvider } from "@/components/catalog-provider";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { safeJsonLd } from "@/lib/seo";
import { absoluteUrl, siteConfig } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: "Aloyri — Let Your Skin Glow.",
    template: "%s | Aloyri",
  },
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: "/",
    siteName: siteConfig.name,
    title: "Aloyri — Let Your Skin Glow.",
    description: siteConfig.description,
  },
  twitter: {
    card: "summary",
    title: "Aloyri — Let Your Skin Glow.",
    description: siteConfig.description,
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteSchema) }}
        />
        <CatalogProvider>
          <Header />
          {children}
          <Footer />
        </CatalogProvider>
      </body>
    </html>
  );
}
