import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review your Aloyri skincare cart before checkout.",
  alternates: { canonical: "/cart" },
  robots: { index: false, follow: false },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
