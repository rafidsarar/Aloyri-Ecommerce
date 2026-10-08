import { currentCustomerSession } from "@/lib/customer-auth";
import { redirect } from "next/navigation";
import { SignupDetailsForm } from "@/components/signup-details-form";
import { CustomerAuthLanding } from "@/components/customer-auth-landing";

export const metadata = {
  title: "Create your Aloyri account",
  robots: { index: false, follow: false },
};

const accountSections = new Set(["orders", "addresses", "wishlist", "support", "preferences"]);

function accountDestination(value: string | undefined): string {
  if (value === "/checkout") return "/checkout";
  if (value?.startsWith("/account?section=")) {
    const section = value.slice("/account?section=".length);
    if (accountSections.has(section)) return value;
  }
  return "/account";
}

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; auth?: string }>;
}) {
  const params = await searchParams;
  const nextPath = accountDestination(params.next);
  const session = await currentCustomerSession();

  if (!session || session.session.method !== "google") {
    return (
      <main className="shell min-h-[65vh] max-w-6xl py-10 md:py-16">
        <CustomerAuthLanding checkout={nextPath === "/checkout"} returnTo={nextPath} authError={params.auth} />
      </main>
    );
  }

  if (session.account.displayName.trim().length >= 2 && session.account.phone) {
    redirect(nextPath);
  }

  return (
    <SignupDetailsForm
      email={session.account.email}
      initialName={session.account.displayName}
      initialPhone={session.account.phone || ""}
      nextPath={nextPath}
    />
  );
}
