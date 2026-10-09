import Link from "next/link";

export function BrandMark({
  compact = false,
  className = "",
  onNavigate,
}: {
  compact?: boolean;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      aria-label="Aloyri home"
      className={`inline-flex flex-col items-center leading-none ${className}`}
    >
      <span
        className={`flex items-center font-light tracking-[0.18em] text-[#713a35] ${
          compact ? "text-[1.05rem] sm:text-xl" : "text-2xl sm:text-[1.7rem]"
        }`}
      >
        AL
        <span
          aria-hidden="true"
          className={`relative mx-[0.07em] inline-flex items-center justify-center rounded-full border border-[#b9725f] ${
            compact ? "h-[1.05em] w-[1.05em]" : "h-[1.08em] w-[1.08em]"
          }`}
        >
          <span className="absolute h-[36%] w-[36%] rotate-45 bg-[#c77b68] [clip-path:polygon(50%_0,62%_38%,100%_50%,62%_62%,50%_100%,38%_62%,0_50%,38%_38%)]" />
        </span>
        YRI
      </span>
      {!compact ? (
        <span className="mt-1 text-[8px] font-normal tracking-[0.34em] text-[#8d5f56] sm:text-[9px]">
          LET YOUR SKIN GLOW.
        </span>
      ) : null}
    </Link>
  );
}
