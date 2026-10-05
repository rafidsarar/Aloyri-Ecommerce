# Aloyri Ecommerce Admin architecture

Aloyri Ecommerce owns storefront operations. Aloyri CRM is not the website CMS.

## CRM remains authoritative
- Product reference used for integration
- Selling price and active promotional selling price
- Available stock
- Order creation and idempotency
- Order status and customer-safe tracking
- Returns/refunds where order, finance or inventory state changes

## Ecommerce Admin owns
- Homepage content and hero merchandising
- Product descriptions, routine guidance, website badges and custom media
- Featured/bestseller presentation
- About, shipping, returns, contact and FAQ content
- Announcement bar, footer content and public support details
- Ecommerce media storage
- Admin authentication and website configuration

Website-owned configuration and media are stored in the private Vercel Blob store attached only to Aloyri Ecommerce. Internal CRM inventory, supplier, purchasing, accounting and management data must never be exposed to the storefront or Ecommerce Admin.
