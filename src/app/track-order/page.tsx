import Link from "next/link";
import { redirect } from "next/navigation";
import { currentCustomerSession } from "@/lib/customer-auth";
import { fetchOrderTracking } from "@/lib/order-tracking";
import type { Metadata } from "next";
import { OrderTrackingClient } from "@/components/order-tracking-client";

export const metadata: Metadata = {
  title: "Track order",
  description: "Track the latest status of your Aloyri website order.",
  alternates: { canonical: "/track-order" },
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
  const session = await currentCustomerSession();
  if (!session) return <OrderTrackingClient initialOrder={order?.slice(0, 100) || ""} />;
  const orderNumber = order?.trim().toUpperCase() || "";
  if (!orderNumber) redirect("/account?section=orders");
  const ref = session.account.orderRefs.find((row) => row.orderNumber === orderNumber);
  if (!ref) return <main className="shell py-12"><h1 className="display text-4xl">Your order tracking</h1><p className="mt-4">{orderNumber ? "This order is not linked to your account." : "Choose Track order beside an order in your account."}</p><Link href="/account?section=orders" className="mt-6 inline-block font-semibold underline">View my orders</Link></main>;
  const result = await fetchOrderTracking({ orderNumber: ref.orderNumber, phone: ref.phone });
  return <OrderTrackingClient key={ref.orderNumber} initialOrder={ref.orderNumber} accountTracking initialResult={result.ok ? result.body : null} initialError={result.ok ? "" : "Order tracking is temporarily unavailable. Please refresh to try again."} />;
}
