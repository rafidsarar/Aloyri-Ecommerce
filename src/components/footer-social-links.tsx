import { normalizeSocialLinks, socialPlatformOptions, type SocialLinks, type SocialPlatform } from "@/lib/social-links";

function SocialIcon({ platform }: { platform: SocialPlatform }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", "aria-hidden": true as const, focusable: false as const };
  switch (platform) {
    case "instagram":
      return <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>;
    case "facebook":
      return <svg {...common} fill="currentColor">
        <path d="M13.8 21v-8.1h2.8l.42-3.15H13.8V7.72c0-.91.25-1.53 1.6-1.53H17V3.37C16.22 3.13 15.4 3 14.56 3 12.07 3 10.4 4.52 10.4 7.31v2.44H7.7v3.15h2.7V21h3.4Z" />
      </svg>;
    case "x":
      return <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 3.5h4.2l12.8 17h-4.2zM20.1 3.5 3.9 20.5" />
      </svg>;
    case "linkedin":
      return <svg {...common} fill="currentColor">
        <path d="M5.15 3.2a1.95 1.95 0 1 0 0 3.9 1.95 1.95 0 0 0 0-3.9ZM3.5 8.8h3.3V21H3.5V8.8Zm5.6 0h3.17v1.66h.05a3.5 3.5 0 0 1 3.17-1.86c3.39 0 4.01 2.2 4.01 5.06V21h-3.31v-6.48c0-1.55-.03-3.53-2.18-3.53-2.2 0-2.53 1.69-2.53 3.42V21H9.1V8.8Z" />
      </svg>;
  }
}

export function FooterSocialLinks({ links }: { links: SocialLinks }) {
  const normalized = normalizeSocialLinks(links);
  const configured = socialPlatformOptions.filter(({ key }) => normalized[key]);
  if (!configured.length) return null;

  return <nav aria-label="Aloyri social media" className="mt-6">
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--store-muted)]">Follow Aloyri</p>
    <div className="flex flex-wrap items-center gap-2">
      {configured.map(({ key, label }) => (
        <a key={key} href={normalized[key]} target="_blank" rel="noopener noreferrer"
          aria-label={`Aloyri on ${label}`} title={`Aloyri on ${label}`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[var(--store-border)] bg-[var(--store-surface)] text-[var(--store-accent)] transition-colors hover:border-[var(--store-accent)] hover:bg-[var(--store-panel)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--store-accent)]">
          <SocialIcon platform={key} />
        </a>
      ))}
    </div>
  </nav>;
}
