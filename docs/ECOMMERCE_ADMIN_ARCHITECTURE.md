# Aloyri Ecommerce Admin architecture

Aloyri Ecommerce owns storefront operations. Aloyri CRM is not the website CMS.

## CRM remains authoritative

- Product reference/identity used for integration
- Selling price and active promotional selling price
- Available stock
- Order creation and idempotency
- Order status and customer-safe tracking data
- Returns/refunds where order, finance or inventory state changes

These fields must never be independently overwritten by Ecommerce Admin.

## Ecommerce Admin owns

- Homepage content and hero merchandising
- Product descriptions, routine guidance, website badges and custom media
- Featured/bestseller presentation
- About, shipping, returns, contact and FAQ content
- Announcement bar, footer content and public support details
- Ecommerce media storage
- Admin authentication and website configuration

## Datastore boundary

Website-owned configuration and media are stored in the private Vercel Blob store attached to the Aloyri Ecommerce project. The CRM database is not used as the website CMS.

## Integration rule

The storefront may read customer-safe CRM catalog data and send signed order operations through the existing HMAC integration. Internal CRM inventory, purchasing, supplier, accounting and management data must never be exposed to the storefront or Ecommerce Admin.
