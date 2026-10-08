"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function SignupDetailsForm({
  email,
  initialName,
  initialPhone,
  nextPath = "/account",
}: {
  email: string;
  initialName: string;
  initialPhone: string;
  nextPath?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const continuingToCheckout = nextPath === "/checkout";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fullName = name.trim().replace(/\s+/g, " ");
    const mobile = phone.replace(/[\s-]/g, "");
    if (fullName.length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }
    if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(mobile)) {
      setError("Enter a valid Bangladesh mobile number, such as 017XXXXXXXX.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await fetch("/api/customer/account", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: fullName, phone: mobile }),
      });
      if (!result.ok) {
        const response = (await result.json().catch(() => ({}))) as { error?: string };
        throw new Error(response.error || "We could not save your details.");
      }
      router.replace(nextPath);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save your details.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="shell mx-auto min-h-[65vh] max-w-5xl py-10 md:py-16">
      <nav aria-label="Account setup breadcrumb" className="account-muted mb-7 flex items-center gap-2 text-xs">
        <Link href="/account" className="account-inline-link">My account</Link>
        <span aria-hidden="true">/</span>
        <span>Finish registration</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-12">
        <div className="lg:pt-8">
          <p className="account-overline">Step 2 of 2 · Customer signup</p>
          <h1 className="account-display display mt-4 text-4xl leading-tight sm:text-5xl">
            One last step, and you&apos;re in.
          </h1>
          <p className="account-muted mt-5 max-w-md text-sm leading-7">
            Your Google email is already verified. Add your full name and mobile
            number to finish creating your Aloyri account.
          </p>
          <div className="account-info-strip mt-7 rounded-[1.5rem] p-5">
            <p className="text-sm font-semibold">What happens next?</p>
            <ol className="account-number-list mt-4 space-y-4 text-sm">
              <li><span aria-hidden="true">✓</span> Verified Google email</li>
              <li><span aria-hidden="true">2</span> Name and phone number</li>
              <li><span aria-hidden="true">3</span> Delivery address when ordering</li>
            </ol>
          </div>
          <p className="account-muted mt-5 text-xs leading-6">
            Your personal information is stored in your account, not in browser
            storage. You can update your delivery details later.
          </p>
        </div>

        <section aria-labelledby="complete-account-heading" className="account-panel rounded-[1.75rem] border p-6 sm:p-9">
          <h2 id="complete-account-heading" className="account-display display text-3xl">Complete your details</h2>
          <p className="account-muted mt-2 text-sm">Fields marked * are required.</p>
          <form onSubmit={submit} className="mt-7 grid gap-5">
            <label className="grid gap-2 text-sm font-semibold" htmlFor="signup-email">
              Verified email address
              <span className="relative">
                <input id="signup-email" name="email" type="email" value={email} readOnly
                  autoComplete="email" className="account-input w-full rounded-xl border px-4 py-3 pr-12 text-sm" />
                <span aria-label="Verified by Google" title="Verified by Google"
                  className="account-verified absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold">
                  ✓
                </span>
              </span>
            </label>
            <label className="grid gap-2 text-sm font-semibold" htmlFor="signup-name">
              Full name *
              <input id="signup-name" name="displayName" autoComplete="name" required minLength={2}
                maxLength={80} value={name} onChange={(event) => setName(event.target.value)}
                placeholder="Your full name" className="account-input w-full rounded-xl border px-4 py-3 text-sm" />
            </label>
            <label className="grid gap-2 text-sm font-semibold" htmlFor="signup-phone">
              Mobile number *
              <input id="signup-phone" name="phone" type="tel" autoComplete="tel"
                inputMode="tel" required maxLength={20} placeholder="017XXXXXXXX"
                aria-describedby="signup-phone-hint" value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="account-input w-full rounded-xl border px-4 py-3 text-sm" />
              <span id="signup-phone-hint" className="account-muted text-xs font-normal leading-5">
                Bangladesh mobile number. Used to contact you about your orders.
              </span>
            </label>
            {error ? (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
                {error}
              </p>
            ) : null}
            <button disabled={saving} type="submit"
              className="account-primary-button flex min-h-12 items-center justify-center rounded-full px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? "Saving your details…" : continuingToCheckout ? "Save and continue to checkout →" : "Create my account →"}
            </button>
          </form>
          <div className="account-muted mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--store-border)] pt-5 text-xs">
            <p>Delivery address is only needed when placing an order.</p>
            <Link href={continuingToCheckout ? "/cart" : "/account"}
              className="account-inline-link font-semibold underline underline-offset-4">
              {continuingToCheckout ? "Back to cart" : "Back to account"}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
