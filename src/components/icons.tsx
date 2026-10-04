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
