# Aloyri Ecommerce

Official Aloyri skincare ecommerce storefront.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- pnpm
- Node.js 24+

## Getting started

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Project structure

```text
src/
  app/          App Router pages and layouts
  components/   Shared storefront UI components
  lib/          Storefront utilities and domain logic
public/         Static assets
```

The storefront is intentionally separate from the Aloyri CRM. CRM integration will be added only where required, through a narrow server-side integration boundary.
