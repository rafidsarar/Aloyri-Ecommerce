"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/** Protect unsaved forms and bind saves to the live version they were opened from. */
export function AdminEditGuard({ version }: { version: string }) {
  const pathname = usePathname();
  const dirty = useRef(false);
  const [changed, setChanged] = useState(false);
  useEffect(() => {
    const root = document.getElementById("admin-content");
    if (!root) return;
    dirty.current = false;
    const mark = () => { dirty.current = true; setChanged(true); };
    const bindForms = () => root.querySelectorAll("form").forEach(form => {
      if (!form.querySelector('input[name="storefrontVersion"]')) {
        const input = document.createElement("input");
        input.type = "hidden"; input.name = "storefrontVersion"; input.value = version;
        form.appendChild(input);
      }
    });
    const edit = (event: Event) => {
      if (event.target instanceof HTMLElement && event.target.closest("form")) mark();
    };
    const submit = (event: Event) => {
      if (event.target instanceof HTMLFormElement) {
        if (!event.target.checkValidity()) return;
        dirty.current = false; setChanged(false);
      }
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current) { event.preventDefault(); event.returnValue = ""; }
    };
    const navigate = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (!dirty.current || !anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || anchor.getAttribute("href")?.startsWith("#")) return;
      if (anchor.href === window.location.href) return;
      if (!window.confirm("You have unsaved changes. Leave this page and discard them?")) {
        event.preventDefault(); event.stopPropagation();
      } else { dirty.current = false; setChanged(false); }
    };
    bindForms();
    const observer = new MutationObserver(bindForms);
    observer.observe(root, { childList: true, subtree: true });
    root.addEventListener("input", edit); root.addEventListener("change", edit);
    root.addEventListener("admin:dirty", mark);
    root.addEventListener("submit", submit, true);
    document.addEventListener("click", navigate, true);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      observer.disconnect(); root.removeEventListener("input", edit); root.removeEventListener("change", edit);
      root.removeEventListener("admin:dirty", mark); root.removeEventListener("submit", submit, true);
      document.removeEventListener("click", navigate, true); window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [pathname, version]);
  return changed ? <p role="status" className="sticky top-0 z-20 mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Unsaved changes — save before leaving this page.</p> : null;
}
