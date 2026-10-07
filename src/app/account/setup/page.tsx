import { currentCustomerSession } from "@/lib/customer-auth";
import { redirect } from "next/navigation";
import { SignupDetailsForm } from "@/components/signup-details-form";

export const metadata = { title: "Complete your Aloyri account", robots: { index: false, follow: false } };

export default async function SetupPage() {
  const session = await currentCustomerSession();
  if (!session || session.session.method !== "google") {
    return <main className="shell mx-auto max-w-xl py-16">
      <h1 className="display text-4xl">Create your Aloyri account</h1>
      <p className="mt-4 text-sm leading-7">Sign up or sign in securely with Google. Shopping and adding items to your cart do not require an account.</p>
      <a href="/api/customer-auth/google/start?next=/account/setup" className="mt-6 inline-flex rounded-full bg-[#713a35] px-6 py-3 text-sm font-semibold text-white">Continue with Google</a>
      <p className="mt-6 text-sm"><a href="/cart" className="underline">Return to cart</a></p>
    </main>;
  }
  if (session.account.displayName.trim().length >= 2 && session.account.phone) redirect("/checkout");
  return <SignupDetailsForm email={session.account.email} initialName={session.account.displayName} initialPhone={session.account.phone || ""} />;
}
