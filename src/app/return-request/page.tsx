import type { Metadata } from "next";
import { ReturnRequestClient } from "@/components/return-request-client";

export const metadata: Metadata = {
  title: "Request a return or refund review",
  description:
    "Verify a delivered Aloyri website order and submit products for return or refund review.",
  alternates: { canonical: "/return-request" },
  robots: { index: false, follow: false },
};

export default async function ReturnRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  return <ReturnRequestClient initialOrder={order?.slice(0, 100) || ""} />;
}
