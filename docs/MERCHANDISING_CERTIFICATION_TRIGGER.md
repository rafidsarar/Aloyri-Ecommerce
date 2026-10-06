# Merchandising release certification

Certified scope:
- Collections with manual product ordering, media, SEO and collection landing pages
- Campaign schedules in Bangladesh time, campaign creative, CTA, collection/direct product targeting
- Promotion-only campaign mode using CRM-authoritative sale prices
- Campaign, collection, global and per-product out-of-stock behavior
- Website product badges and manual merchandising priority
- Homepage hero and ordered Bestsellers / Featured / New Arrivals / Collection / Campaign sections
- Shop/category merchandising ordering after live CRM refresh
- Merchandising health checks
- Draft → Preview → Publish → Version History integration
- Legacy Production config migration
- Preview/Production datastore isolation
- CRM authority preserved for price, sale price, promotion eligibility, stock and orders

Validation:
- Vercel preview lint passed (one pre-fix warning only)
- TypeScript passed
- Next.js 16.3.8 production build passed
- Final Shop-client delta lint + TypeScript passed independently
- Campaign schedule / promotion-only / collection ordering / out-of-stock / health logic passed
- Legacy config → merchandising defaults → Draft → Publish → Version History migration passed
