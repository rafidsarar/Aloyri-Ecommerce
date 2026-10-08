import { currentCustomerSession } from "@/lib/customer-auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CustomerAccountHub } from "@/components/customer-account-hub";

export const metadata: Metadata = {
  title: "Customer account",
  description: "Sign in to manage your Aloyri orders, addresses and account.",
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

  const session = await currentCustomerSession();
  if (session && (session.account.displayName.trim().length < 2 || !/^(?:\+?88)?01[3-9]\d{8}$/.test(session.account.phone || ""))) {
    redirect("/account/setup?next=" + encodeURIComponent("/account"));
  }
  const verified = completed && Boolean(session?.account.orderRefs.some(ref => ref.orderNumber === order));
  return (
    <>
      {verified ? (
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
      <CustomerAccountHub authenticated={Boolean(session)} displayName={session?.account.displayName || ""} profileComplete={Boolean(session && session.account.displayName.trim().length >= 2 && session.account.phone)} />
    </>
  );
}
