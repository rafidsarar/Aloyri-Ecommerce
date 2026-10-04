import type { Metadata } from "next";
import { OrderTrackingClient } from "@/components/order-tracking-client";

export const metadata: Metadata = {
  title: "Track order",
  description: "Track the latest status of your Aloyri website order.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  return <OrderTrackingClient initialOrder={order?.slice(0, 100) || ""} />;
}
