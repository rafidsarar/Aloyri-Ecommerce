# Preview datastore isolation

Ecommerce Admin data is now namespaced by Vercel environment.

- Production uses the existing unprefixed private Blob paths.
- Preview deployments use the private `preview/` namespace.
- Preview setup, passwords, recovery codes, drafts, publish history, audit events and uploaded media cannot mutate Production.
- Public Production content continues to use the existing production Blob records.

This allows full destructive certification of Draft/Preview/Publish and Security workflows in Preview without touching the live website.

Certification note: destructive admin workflow tests must run only against the isolated preview namespace.
