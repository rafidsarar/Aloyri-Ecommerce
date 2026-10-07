"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export type AdminNavItem = { label: string; href: string; group: string };
export function AdminNavigation({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = items.filter(item => `${item.label} ${item.group}`.toLowerCase().includes(query.trim().toLowerCase()));
  const groups = [...new Set(filtered.map(item => item.group))];
  const current = items.find(item => item.href === pathname) || items.find(item => item.href !== "/admin" && pathname.startsWith(item.href + "/"));
  return <>
    <button type="button" className="admin-menu-toggle" aria-expanded={open} aria-controls="admin-sections" onClick={() => setOpen(value => !value)}>
      <span>{current?.label || "Admin sections"}</span><span>{open ? "Close menu" : "Browse sections"}</span>
    </button>
    <div id="admin-sections" className={`admin-sections ${open ? "is-open" : ""}`}>
      <label className="admin-nav-search"><span className="sr-only">Find an admin section</span><input type="search" placeholder="Find a section…" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <nav aria-label="Admin navigation">
        {groups.map(group => <div className="admin-nav-group" key={group}>
          <p>{group}</p>
          {filtered.filter(item => item.group === group).map(item => {
            const active = item.href === "/admin" ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
            return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={active ? "is-active" : ""} onClick={() => { setOpen(false); setQuery(""); }}>{item.label}</Link>;
          })}
        </div>)}
        {!filtered.length ? <p className="px-3 py-4 text-sm text-black/60">No sections found.</p> : null}
      </nav>
    </div>
  </>;
}
