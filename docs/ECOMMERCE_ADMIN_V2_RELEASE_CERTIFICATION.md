# Ecommerce Admin v2 release certification

Certified release scope:
- admin password rotation and session invalidation
- one-time recovery codes and recovery flow
- login/setup/recovery throttling
- Draft-only editing for website-managed content
- private draft preview
- explicit publish
- publish version history
- restore historical versions to Draft
- audit trail
- Preview/Production Blob namespace isolation
- CRM remains authoritative for price, stock and order operations

Validation completed:
- Vercel preview: lint passed, typecheck passed, production build passed
- final isolation delta: independent TypeScript check passed
- Draft/Publish/Restore/Discard/version-history logic: isolated functional test passed
- password/recovery/session rotation logic: isolated functional test passed
