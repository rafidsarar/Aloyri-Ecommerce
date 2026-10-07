import type { Metadata } from "next";
import { CustomerAccountHub } from "@/components/customer-account-hub";

export const metadata: Metadata = {
  title: "Customer account",
  description: "Your Aloyri customer hub for wishlist, cart and order tools.",
  robots: { index: false, follow: true },
};

export default async function CustomerAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; order?: string }>;
}) {
  const params = await searchParams;
  const completed = params.checkout === "complete";
  const order =
    typeof params.order === "string" &&
    /^WEB-[A-Z0-9-]{8,90}$/i.test(params.order)
      ? params.order.toUpperCase()
      : "";

  return (
    <>
      {completed ? (
        <div className="shell pt-8">
          <div className="rounded-[1.2rem] border border-emerald-700/10 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
            <strong>Order confirmed.</strong>
            <span className="ml-2">
              {order
                ? `${order} is now linked to this Google account and will appear in your order history below.`
                : "Your new order is linked to this Google account and will appear in your order history below."}
            </span>
          </div>
        </div>
      ) : null}
      <CustomerAccountHub />
    </>
  );
}
