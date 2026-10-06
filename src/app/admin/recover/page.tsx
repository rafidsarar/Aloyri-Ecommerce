import Link from "next/link";
import { redirect } from "next/navigation";
import { recoverAdminAccount } from "@/app/admin/actions";
import { adminIsConfigured, currentAdmin } from "@/lib/admin-auth";

export default async function AdminRecoverPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await adminIsConfigured())) redirect("/admin/setup");
  if (await currentAdmin()) redirect("/admin/security");
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4f2] px-5 py-12">
      <div className="w-full max-w-md rounded-[1.75rem] border border-black/8 bg-white p-7 shadow-[0_30px_90px_rgba(50,31,28,.09)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#713a35]/55">
          Aloyri Ecommerce
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Recover admin access.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#2f211f]/55">
          Use one unused recovery code to set a new password. The code is
          consumed immediately and all older sessions are invalidated.
        </p>

        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form action={recoverAdminAccount} className="mt-6 grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium">
            Username
            <input
              name="username"
              autoComplete="username"
              required
              className="rounded-xl border border-black/10 bg-[#fffdfb] px-4 py-3"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Recovery code
            <input
              name="recoveryCode"
              autoComplete="one-time-code"
              required
              className="rounded-xl border border-black/10 bg-[#fffdfb] px-4 py-3 uppercase"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            New password
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              className="rounded-xl border border-black/10 bg-[#fffdfb] px-4 py-3"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Confirm new password
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              className="rounded-xl border border-black/10 bg-[#fffdfb] px-4 py-3"
            />
          </label>
          <button className="mt-2 rounded-xl bg-[#713a35] px-5 py-3.5 text-sm font-semibold text-white">
            Recover account
          </button>
        </form>

        <Link
          href="/admin/login"
          className="mt-5 inline-block text-sm font-semibold text-[#713a35]"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
