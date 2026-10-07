"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function SignupDetailsForm({ email, initialName, initialPhone }: { email: string; initialName: string; initialPhone: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length < 2 || !/^(?:\+?88)?01[3-9]\d{8}$/.test(phone.replace(/[\s-]/g, ""))) {
      setError("Enter your full name and a valid Bangladesh mobile number.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await fetch("/api/customer/account", {
        method: "PUT", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name, phone }),
      });
      if (!result.ok) {
        const response = await result.json().catch(() => ({}));
        throw new Error(response.error || "We could not save your details.");
      }
      router.replace("/checkout");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save your details.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="shell mx-auto max-w-xl py-12 md:py-20">
    <p className="text-xs font-semibold uppercase tracking-widest text-[#713a35]">First-time signup</p>
    <h1 className="display mt-3 text-4xl sm:text-5xl">Complete your account.</h1>
    <p className="mt-4 text-sm leading-7 text-[#321f1c]/70">Your email is verified by Google. Your name and mobile number are required. Delivery address is collected securely when you check out, not during signup.</p>
    <form onSubmit={submit} className="mt-8 grid gap-5 rounded-2xl border border-[#713a35]/15 bg-white p-6">
      <label className="grid gap-2 text-sm font-medium">Verified email
        <input type="email" value={email} readOnly className="h-12 rounded-xl border border-[#713a35]/15 bg-gray-50 px-4" />
      </label>
      <label className="grid gap-2 text-sm font-medium">Full name *
        <input autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={event => setName(event.target.value)} className="h-12 rounded-xl border border-[#713a35]/15 px-4" />
      </label>
      <label className="grid gap-2 text-sm font-medium">Mobile number *
        <input type="tel" autoComplete="tel" required inputMode="tel" placeholder="01XXXXXXXXX" value={phone} onChange={event => setPhone(event.target.value)} className="h-12 rounded-xl border border-[#713a35]/15 px-4" />
      </label>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <button disabled={saving} className="h-12 rounded-full bg-[#713a35] px-5 font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save and continue to checkout"}</button>
    </form>
    <Link href="/cart" className="mt-6 inline-block text-sm underline">Return to cart</Link>
  </main>;
}
