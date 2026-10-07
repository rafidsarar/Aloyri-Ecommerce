"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  readSavedProductIds,
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
  savedProductIds: string[];
  emailPreferences: Prefs;
};

type Status = {
  enabled: boolean;
  authenticated: boolean;
  authMethod?: "google" | "email-link";
  authMethods?: {
    google?: boolean;
    emailLink?: boolean;
  };
  account?: Account;
};

export function CustomerAuthPanel() {
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
          const local = readSavedProductIds();
          const merged = [
            ...new Set([...body.account.savedProductIds, ...local]),
          ].slice(0, 100);
          if (JSON.stringify(merged) !== JSON.stringify(local)) {
            writeSavedProductIds(merged);
          }
          if (
            JSON.stringify(merged) !==
            JSON.stringify(body.account.savedProductIds)
          ) {
            void fetch("/api/customer/account", {
              method: "PUT",
              headers: { "content-type": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({ savedProductIds: merged }),
            });
          }
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!status?.enabled) return null;

  async function requestLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/customer-auth/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: form.get("email"),
          nextPath: "/account",
        }),
      });
      const body = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        setError(body.error || "Unable to send sign-in link.");
        return;
      }
      setNotice(
        body.message || "Check your email for a secure sign-in link.",
      );
    } catch {
      setError("Unable to send sign-in link.");
    } finally {
      setSaving(false);
    }
  }

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
          savedProductIds: readSavedProductIds(),
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
      setStatus({ ...status, account: body.account });
      setNotice("Secure account preferences saved.");
    } catch {
      setError("Unable to update account.");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await fetch("/api/customer-auth/logout", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => undefined);
    setStatus({
      enabled: true,
      authenticated: false,
      authMethods: status?.authMethods,
    });
    setNotice("Signed out.");
  }

  return (
    <section className="mt-6 rounded-[1.5rem] border border-[#713a35]/10 bg-[#fffaf7] p-5 sm:p-7">
      <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#713a35]/45">
        Secure cloud account
      </p>

      {status.authenticated && status.account ? (
        <form onSubmit={save} className="mt-4 grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">
                Signed in as {status.account.email}
              </p>
              <p className="mt-1 text-xs text-[#321f1c]/45">
                {status.authMethod === "google"
                  ? "Signed in securely with Google · HttpOnly Aloyri session"
                  : "Passwordless one-time email sign-in · HttpOnly secure session"}
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

          <div className="grid gap-3 rounded-xl bg-[#f5e8e2] p-4 text-xs leading-5">
            <p className="font-semibold">Lifecycle email preferences</p>
            <label className="flex gap-3">
              <input
                type="checkbox"
                name="postDelivery"
                defaultChecked={
                  status.account.emailPreferences.postDelivery
                }
              />
              Post-delivery follow-up
            </label>
            <label className="flex gap-3">
              <input
                type="checkbox"
                name="reviewRequest"
                defaultChecked={
                  status.account.emailPreferences.reviewRequest
                }
              />
              Verified-review reminder
            </label>
            <label className="flex gap-3">
              <input
                type="checkbox"
                name="reorderReminder"
                defaultChecked={
                  status.account.emailPreferences.reorderReminder
                }
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
          <h2 className="display text-3xl">Sign in to your Aloyri account.</h2>
          <p className="mt-2 text-xs leading-6 text-[#321f1c]/48">
            Your account keeps order history, wishlist, saved addresses,
            support cases and post-purchase details together.
          </p>

          {status.authMethods?.google ? (
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
          ) : null}

          {status.authMethods?.emailLink ? (
            <>
              {status.authMethods?.google ? (
                <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[.14em] text-[#321f1c]/30">
                  <span className="h-px flex-1 bg-[#713a35]/10" />
                  or
                  <span className="h-px flex-1 bg-[#713a35]/10" />
                </div>
              ) : null}
              <form onSubmit={requestLink}>
                <p className="text-xs leading-6 text-[#321f1c]/48">
                  You can also use a single-use email link when Aloyri email
                  sign-in is enabled.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    className="h-11 min-w-0 flex-1 rounded-xl border border-[#713a35]/12 bg-white px-3 text-sm"
                  />
                  <button
                    disabled={saving}
                    className="rounded-full bg-[#713a35] px-5 py-3 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Sending…" : "Email secure sign-in link"}
                  </button>
                </div>
              </form>
            </>
          ) : null}
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
