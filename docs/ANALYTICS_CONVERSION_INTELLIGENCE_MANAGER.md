# Website Analytics + Conversion Intelligence Manager

Aloyri Ecommerce now has a first-party analytics and reporting layer designed around privacy and CRM-confirmed commerce.

## Measurement
- Anonymous visitors and sessions
- Page views
- Product views and clicks
- Add-to-cart activity
- Checkout starts and review step
- CRM-confirmed orders only
- Revenue, AOV and items/order
- Cart abandonment
- Conversion funnel
- Campaign, collection and homepage placement attribution
- Storefront search analytics
- Traffic source / UTM / referral attribution
- Mobile / tablet / desktop conversion
- Real-user LCP, INP, CLS and TTFB

## Conversion intelligence
- Product view-to-cart and cart-to-order rates
- Campaign impressions, CTR, orders and attributed revenue
- Collection engagement and attributed conversion
- Homepage hero / section placement analytics
- Search demand without product engagement
- Recommendations for high-view/low-cart and high-cart/low-order products

## Privacy boundary
Analytics never stores customer name, email, phone, address, order number, CRM customer/order IDs, IP address, raw user-agent or checkout free text.
- Browser-generated visitor/session identifiers are one-way hashed before storage.
- Revenue is written only after CRM confirms the order.
- Order number is one-way hashed only to deduplicate conversions.
- Sanitized search phrases reject email-like text and long digit sequences.
- Do Not Track and the customer analytics-disable preference are respected.
- Admin and Draft Preview activity are excluded.

## Management
- 1 / 7 / 30 / 90 day reporting
- Previous-period comparisons
- CSV exports
- UTM link builder
- Protected Analytics Admin pages
- Analytics cannot modify price, stock, finance or order state.
