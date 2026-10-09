import Link from "next/link";

/** The original artwork is preserved; the SVG viewport excludes only the motto. */
export function BrandMark({ compact = false, className = "" }: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link href="/" aria-label="Aloyri home"
      className={`brand-mark ${compact ? "brand-mark-compact" : ""} ${className}`}>
      <svg viewBox="15 115 1965 420" aria-hidden="true" focusable="false" className="brand-artwork">
        <image href="/brand/aloyri-original.png" width="2039" height="771" />
      </svg>
    </Link>
  );
}
