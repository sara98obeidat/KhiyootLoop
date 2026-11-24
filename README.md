# KhiyootLoop: made-to-order crochet MVP

A website where customers design a handmade crochet **bag** or **scarf**:
size, stitch, yarn, colour and a personalised leather or metal tag. They
see an illustrative 2D preview and submit an order request. The founder
reviews orders in a private dashboard.

The site starts in **classroom test mode**: every order and email is marked as a
test, prices are labelled demonstration prices (bag 63 JOD, scarf 56 JOD),
and no payment or production commitment is made. Real orders stay disabled
until the founder confirms variant prices, availability, payment and
delivery (see `docs/SETUP.md` → "Switching on real orders").

- **Setup and deployment (non-technical, step by step):** [`docs/SETUP.md`](docs/SETUP.md)
- **Manual acceptance checklist:** [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md)
- **What works, what is simulated, what is blocked:** [`docs/STATUS.md`](docs/STATUS.md)

## Stack

- Next.js 16 (App Router) + TypeScript, deployable on Vercel
- Supabase Postgres for orders, Supabase Auth for the single founder account, row-level security
- Resend for acknowledgment emails (optional webhook for delivered/bounced status)
- No client-side secrets: there are no `NEXT_PUBLIC_` variables

## Pages

| Path | Purpose |
|---|---|
| `/` | Brand proposition, two product cards, customization buttons |
| `/customize/bag`, `/customize/scarf` | Configurator with live layered SVG preview and dimensions |
| `/review` | Full specification, exact tag text, contact form, "Submit test order" |
| `/order/[reference]?key=…` | Acknowledgment, read back from the database (private link) |
| `/founder` | Founder sign-in and order dashboard (filter, status, email retry) |
| `/founder/orders/[id]` | One order in full, including versions and email attempts |
| `/info` | Materials, tags, care, production and ordering |
| `/api/health` | Says which services are configured (never shows secret values) |

## Where things live

| What | File |
|---|---|
| Products, options, material descriptions, colour availability | `src/config/catalog.ts` |
| Demonstration prices, real variant prices, pricing version | `src/config/pricing.ts` |
| Test/live mode switch and readiness checklist | `src/config/site.ts` |
| Tag text rules (12 visible characters, Arabic/English) | `src/lib/tagText.ts` |
| Server-side order validation, pricing, idempotency, rate limit, email | `src/lib/orderService.ts` |
| SVG preview (versioned: `svg-preview-v1`) | `src/components/preview/` |
| Database schema + RLS | `supabase/migrations/` |

## How an order is handled

1. The browser keeps the unfinished design in `localStorage` (a convenience only).
2. On submit, the browser sends the configuration, the price it showed, the
   pricing version, the preview version and a random **idempotency key**.
3. The server validates every option against the catalog, recalculates the
   price and rejects any mismatch, checks the rate limit, and inserts the order
   with a unique reference (`KL-TEST-XXXX-XXXX`). A unique database constraint on
   the idempotency key means double clicks and network retries return the same
   order instead of creating another one.
4. Only **after** the order is saved is the acknowledgment email sent. Its result is
   stored as `accepted` (accepted by Resend, not proof of delivery), `failed` or
   `not_configured`. A failed email never removes the order. The founder can retry
   from the dashboard, and that never creates a new order.
5. The customer sees the acknowledgment page, which reads the order back from the database.

## Commands

```bash
npm install
npm run dev          # local site (see .env.example)
npm test             # unit tests
npm run test:db      # migration + row-level security tests on a throw-away PostgreSQL
npm run test:e2e     # browser tests (Playwright/Chromium, development memory backend)
npm run typecheck
npm run lint
npm run build
```

For local development without Supabase, set `KL_DEV_MEMORY_BACKEND=1` (and
optionally `KL_DEV_FAKE_EMAIL=accept`, `KL_DEV_FOUNDER_EMAIL`, `KL_DEV_FOUNDER_PASSWORD`).
These only work in development builds, and the site shows a warning banner while they are on.
