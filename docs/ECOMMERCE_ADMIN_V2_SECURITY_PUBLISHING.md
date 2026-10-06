# Ecommerce Admin v2

This release adds a protected content release workflow to Aloyri Ecommerce Admin.

- All Homepage, Product, Page/FAQ and Store Settings edits save to Draft.
- Preview mode shows Draft content only to the authenticated admin browser.
- Publish is the only action that replaces customer-facing content.
- Each publish creates a version snapshot and audit event.
- Historical versions restore to Draft first and must be explicitly republished.
- Password changes rotate session signing keys.
- Recovery codes are one-time, stored as hashes and replace older recovery-code sets.
- Session rotation invalidates other logged-in admin browsers.
- Login, setup and recovery actions are rate-limited.
- CRM remains authoritative for price, stock and order operations.
