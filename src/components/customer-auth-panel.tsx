"use client";

import { useRouter } from "next/navigation";
import { volatileStorage } from "@/lib/volatile-storage";
import { FormEvent, useEffect, useState } from "react";
import {
  writeSavedProductIds,
} from "@/lib/product-preferences";

type Prefs = {
  postDelivery: boolean;
  reviewRequest: boolean;
  reorderReminder: boolean;
};

type Account = {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  savedProductIds: string[];
  emailPreferences: Prefs;
};

type Status = {
  enabled: boolean;
  authenticated: boolean;
  authMethod?: "google" | "email-link";
  authMethods?: { google?: boolean; emailLink?: boolean };
  account?: Account;
};

export function CustomerAuthPanel() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/customer-auth/status", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) =>
        response.ok ? ((await response.json()) as Status) : null,
      )
      .then((body) => {
        if (!body || controller.signal.aborted) return;
        setStatus(body);
        if (body.authenticated && body.account) {
          writeSavedProductIds(body.account.savedProductIds);
        }
      })
      .catch(() => setError("Unable to load sign-in. Refresh this page to try again."));
    return () => controller.abort();
  }, []);

  if (!status) return <p className="py-8 text-sm text-[#321f1c]/60" role={error?"alert":"status"}>{error||"Loading sign-in…"}</p>;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!status?.account) return;
    setSaving(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/customer/account", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          displayName: form.get("displayName"),
          phone: form.get("phone"),
          emailPreferences: {
            postDelivery: form.get("postDelivery") === "on",
            reviewRequest: form.get("reviewRequest") === "on",
            reorderReminder: form.get("reorderReminder") === "on",
          },
        }),
      });
      const body = (await response.json()) as {
        error?: string;
        account?: Account;
      };
      if (!response.ok || !body.account) {
        setError(body.error || "Unable to update account.");
        return;
      }
      setStatus((current) =>
        current && body.account ? { ...current, account: body.account } : current,
      );
      setNotice("Account preferences saved.");
    } catch {
      setError("Unable to update account.");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    try {
      const response = await fetch("/api/customer-auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error();
      volatileStorage.clear();
      writeSavedProductIds([]);
      window.dispatchEvent(new Event("aloyri:customer-signed-out"));
      window.dispatchEvent(new Event("aloyri-cart-updated"));
      router.replace("/account");
      router.refresh();
    } catch { setError("Unable to sign out. Please try again."); }
  }

  return (
    <section className="mt-6 rounded-[1.5rem] border border-[#713a35]/10 bg-[#fffaf7] p-5 sm:p-7">
      <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#713a35]/45">
        Customer account
      </p>

      {status.authenticated && status.account ? (
        <form onSubmit={save} className="mt-4 grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">
                Signed in as {status.account.email}
              </p>
              <p className="mt-1 text-xs text-[#321f1c]/45">
                Your details are saved securely in your Aloyri account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-full border border-[#713a35]/14 px-4 py-2 text-xs font-semibold text-[#713a35]"
            >
              Sign out
            </button>
          </div>

          <label className="text-xs font-medium">
            Display name
            <input
              name="displayName"
              defaultValue={status.account.displayName}
              maxLength={80}
              className="mt-2 h-11 w-full max-w-md rounded-xl border border-[#713a35]/12 bg-white px-3 text-sm"
            />
          </label>

          <label className="text-xs font-medium">Mobile number
            <input name="phone" type="tel" autoComplete="tel" required defaultValue={status.account.phone || ""} placeholder="01XXXXXXXXX" className="mt-2 h-11 w-full max-w-md rounded-xl border border-[#713a35]/12 bg-white px-3 text-sm" />
          </label>
          <div className="grid gap-3 rounded-xl bg-[#f5e8e2] p-4 text-xs leading-5">
            <p className="font-semibold">Email preferences</p>
            <label className="flex gap-3">
              <input
                type="checkbox"
                name="postDelivery"
                defaultChecked={status.account.emailPreferences.postDelivery}
              />
              Post-delivery follow-up
            </label>
            <label className="flex gap-3">
              <input
                type="checkbox"
                name="reviewRequest"
                defaultChecked={status.account.emailPreferences.reviewRequest}
              />
              Verified-review reminder
            </label>
            <label className="flex gap-3">
              <input
                type="checkbox"
                name="reorderReminder"
                defaultChecked={status.account.emailPreferences.reorderReminder}
              />
              Replenishment reminder
            </label>
          </div>

          <button
            disabled={saving}
            className="w-fit rounded-full bg-[#713a35] px-5 py-3 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save account preferences"}
          </button>
        </form>
      ) : (
        <div className="mt-4 max-w-xl">
          <h2 className="display text-3xl">Continue with Google.</h2>
          <p className="mt-2 text-xs leading-6 text-[#321f1c]/48">
            Aloyri customer accounts use Google sign-in. Your verified Gmail
            identity keeps orders, wishlist, addresses, support cases and
            post-purchase history together without a separate Aloyri password.
          </p>
          <a
            href="/api/customer-auth/google/start?next=/account"
            className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[#713a35]/15 bg-white px-5 text-sm font-semibold text-[#321f1c] shadow-sm transition hover:border-[#713a35]/30"
          >
            <span
              aria-hidden="true"
              className="grid h-6 w-6 place-items-center rounded-full border border-black/10 text-sm font-bold"
            >
              G
            </span>
            Continue with Google
          </a>
          <p className="mt-4 text-sm text-[#321f1c]/65">New to Aloyri? <a href="/account/setup" className="font-semibold text-[#713a35] underline underline-offset-4">Create your account</a></p>
        </div>
      )}

      {notice ? (
        <p className="mt-4 text-xs text-emerald-700" aria-live="polite">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
