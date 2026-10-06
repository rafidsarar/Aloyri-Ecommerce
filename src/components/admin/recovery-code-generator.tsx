"use client";

import { useActionState } from "react";
import {
  generateRecoveryCodesAction,
  type RecoveryCodeActionState,
} from "@/app/admin/actions";

const initialState: RecoveryCodeActionState = {};

export function RecoveryCodeGenerator() {
  const [state, action, pending] = useActionState(
    generateRecoveryCodesAction,
    initialState,
  );

  return (
    <div>
      <form action={action} className="grid gap-3">
        <label className="grid gap-1.5 text-sm font-medium">
          Current password
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            className="rounded-xl border border-black/10 px-4 py-3"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-xl border border-[#713a35]/18 px-5 py-3 text-sm font-semibold text-[#713a35] disabled:opacity-50"
        >
          {pending ? "Generating…" : "Generate new recovery codes"}
        </button>
      </form>

      {state.error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {state.codes?.length ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-900">
            Save these codes now. They will not be shown again.
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-800/75">
            Each code works once. Generating another set immediately invalidates
            every previous recovery code.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {state.codes.map((code) => (
              <code
                key={code}
                className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-semibold tracking-[0.08em] text-[#2f211f]"
              >
                {code}
              </code>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
