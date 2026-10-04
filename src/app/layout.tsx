import type { Metadata } from "next";
import { CatalogProvider } from "@/components/catalog-provider";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Aloyri — Let Your Skin Glow.",
    template: "%s | Aloyri",
  },
  description:
    "Aloyri is a curated skincare storefront for Bangladesh, featuring cleansers, moisturizers and daily sunscreen.",
  metadataBase: new URL("https://aloyri-ecommerce.vercel.app"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <CatalogProvider>
          <Header />
          {children}
          <Footer />
        </CatalogProvider>
      </body>
    </html>
  );
}
