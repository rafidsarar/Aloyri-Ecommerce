# Owner Admin acceptance — 18 October 2026

Status: partial acceptance; not certified for release. Production unchanged.

Environment: isolated Vercel Sandbox, production source ff5928a9 with disposable PGlite database, local media gateway and synthetic CRM catalog. Development runtime; ordering/customer authentication disabled; outbound production connections denied.

## Verified in browser

- Owner session and all top-level Admin destinations loaded.
- Settings, homepage, product editorial content and FAQ saves survived reload. Settings, homepage image/text and product description appeared on the isolated storefront.
- Media-library and brand image uploads survived reload and decoded successfully. Library image was selectable and rendered on homepage.
- Campaign and collection creation succeeded with synthetic product selection.
- FAQ SEO title saved and survived reload.
- Audit activity recorded tested changes with actor and changed fields.
- Health snapshot save and private configuration backup creation succeeded.
- Version restore succeeded, created a new history entry, and reverted the tested FAQ SEO title.
- Sign-out completed; direct navigation to /admin/operations then redirected to /admin/login.
- Payments and delivery displayed read-only ledgers and dormant provider states. Analytics, coverage, security, customer-service and reviews sections loaded.

## Confirmed defect and prepared fix

Collection editor prefilled `/collections/` as the canonical path for a new collection. Saving retained this generic path instead of its slug URL. Published URL help also remained a placeholder after saving.

Fix: leave automatic canonical blank so the existing server fallback derives the collection URL; treat the old generic default as automatic when editing; display the saved collection path. Explicit custom canonicals remain editable. Existing production records are not migrated or changed automatically.

Browser verification: resaving synthetic collection after applying fix persisted `/collections/isolated-acceptance`. TypeScript, targeted ESLint and owner-admin regression passed.

## Unverified / environment limitations

- Genuine mobile widths: cloud browser advertises no viewport/device controls. Desktop rendering is not mobile certification.
- Customer-service case changes, review moderation and populated shipment/settlement workflows: synthetic environment contains no corresponding records. Empty states alone do not certify these actions.
- Password rotation/recovery generation: inspected only; credential changes require user participation.
- Operational backup import/restore, download byte integrity, all individual form variants and upload formats/limits remain unverified.
- Staff rejection passed automated owner-admin regression (login, existing session, authorization, removed routes), not a second-role browser sign-in.
- Health reports order bridge error because ordering/delivery configuration is intentionally disabled in this fixture; not evidence of a production failure. Runtime/migration warnings also reflect fixture configuration.

No production merge or deployment performed. Browser left signed out after authorization verification.
