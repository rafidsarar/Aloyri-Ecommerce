import type { Metadata } from "next";
import { SupportRequestClient } from "@/components/support-request-client";

export const metadata: Metadata = {
  title: "Customer support",
  description: "Contact Aloyri Customer Service about an order, delivery, payment or product question.",
  alternates: { canonical: "/support-request" },
  robots: { index: false, follow: false },
};

export default function SupportRequestPage() {
  return (
    <main className="shell py-12 md:py-18">
      <div className="mx-auto max-w-3xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#713a35]/48">Customer service</p>
        <h1 className="display mt-3 text-5xl leading-[.94] sm:text-6xl">Tell us what you need help with.</h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-[#321f1c]/52">
          Use this for order, delivery, payment or product support. For a return or refund review, use the dedicated return request so the affected items can be selected.
        </p>
      </div>
      <SupportRequestClient />
    </main>
  );
}
