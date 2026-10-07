"use client";
import { useFormStatus } from "react-dom";
export function AdminSubmitButton({ children, pendingLabel = "Saving…", disabled = false }: { children: React.ReactNode; pendingLabel?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={disabled || pending} aria-busy={pending} className="w-fit rounded-lg bg-[#713a35] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{pending ? pendingLabel : children}</button>;
}
