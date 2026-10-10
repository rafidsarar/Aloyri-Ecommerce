type IconProps = { className?: string };

export function SearchIcon({ className = "h-5 w-5" }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.75" stroke="currentColor" strokeWidth="1.5"/><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}

export function BagIcon({ className = "h-5 w-5" }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.5 8.5h11l1 11h-13l1-11Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 9V6.75A3 3 0 0 1 12 3.75a3 3 0 0 1 3 3V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}

export function ArrowIcon({ className = "h-4 w-4" }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export function MenuIcon({ className = "h-5 w-5" }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 8h16M4 16h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}

export function CloseIcon({ className = "h-5 w-5" }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}

/** A consistent outline icon set for customer account navigation and shortcuts. */
export function AccountSectionIcon({
  section,
  className = "h-5 w-5",
}: IconProps & { section: "orders" | "addresses" | "wishlist" | "support" | "preferences" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {section === "orders" ? (
        <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M8.5 9h7M8.5 13h7M8.5 17h4" /></>
      ) : section === "addresses" ? (
        <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></>
      ) : section === "wishlist" ? (
        <path d="M20.5 8.5c0 4.3-8.5 10.7-8.5 10.7S3.5 12.8 3.5 8.5a4.5 4.5 0 0 1 8.5-2.1 4.5 4.5 0 0 1 8.5 2.1Z" />
      ) : section === "support" ? (
        <><path d="M5 13v-2a7 7 0 0 1 14 0v2M5 13h2v5H5a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2ZM19 13h-2v5h2a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2ZM17 19a4 4 0 0 1-4 2h-2" /></>
      ) : (
        <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="2" fill="var(--store-surface)" /><circle cx="16" cy="17" r="2" fill="var(--store-surface)" /></>
      )}
    </svg>
  );
}

export function CheckIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4.5 4.5L19 7" />
    </svg>
  );
}
