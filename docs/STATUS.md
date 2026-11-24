# Status: what works, what is simulated, what is blocked

Last updated: 24 November 2026.

## Works (implemented and tested automatically)

- Six pages: home, configurator (bag and scarf), review and contact, acknowledgment, founder dashboard, information.
- Catalog exactly as specified: sizes, stitches, materials (with plain-language descriptions), colours, leather/metal tag. Colour availability is configurable per material.
- Tag text: 1–12 visible characters including spaces, Arabic and English, exact text preserved, direction-control and invisible characters rejected, always rendered as text (never HTML).
- Layered SVG preview: silhouette and proportions by size, colour, a distinct pattern per stitch, yarn finish (matte cord, glossy cord, smooth blend, fuzzy blend), tag material and exact tag text, with close-ups. Labelled as an illustration. Versioned (`svg-preview-v1`), and the dashboard redraws each order from its stored configuration.
- Pricing: demonstration prices in test mode (labelled as test prices), an empty table for costed variant prices, server-side recalculation, manipulated prices rejected, and price plus pricing version stored with each order.
- Classroom test mode by default: visible notice, "Submit test order" button, only alias and email collected, test flag on every record and email. Live mode is locked behind four readiness switches plus an environment flag.
- Orders: unique reference, timestamp, test/live flag, contact, all options, price snapshot, catalog/pricing/preview versions, order status and email status.
- Duplicate protection: the button disables, network retries reuse the same idempotency key, and a unique database constraint backs this up (tested with 10 simultaneous requests).
- Abuse protection: same-origin check, a hidden honeypot field, request size limit, strict schema, and rate limits per client (30 per 10 minutes, so a whole class can share one network) and overall (500 per hour).
- Email: sent only after the order is saved. "Accepted" is never shown as "delivered". Failures are recorded and shown to the customer accurately. The founder can retry without creating an order, and a lock prevents parallel sends. An optional signed Resend webhook sets delivered or bounced.
- Founder: Supabase email/password sign-in, plus a check that the account is the one row in `founders` (the database allows only one). Pages and API routes check this on the server, and row-level security enforces it again in the database. The founder can change only the status column.
- Security headers (Content Security Policy, no framing, no-store on private pages). No secrets reach the browser.

## Tested here (automated)

- 63 unit tests (`npm test`): validation, pricing, both journeys, duplicates, retries, manipulated prices, rate limits, email success, failure and retry, escaping, preview determinism.
- 25 database checks (`npm run test:db`): the real migration applied to PostgreSQL 16 with Supabase-style roles. Anonymous visitors and other signed-in users cannot read or change orders, and the founder cannot change prices, tag text or email status, or add a second founder.
- 57 browser checks (`npm run test:e2e`, Chromium, iPhone 13 / Pixel 7 / desktop): both journeys, Arabic text, keyboard-only use, double-click, refresh and another device, anonymous access, manipulated price, founder dashboard, email failure and retry, and no sideways scrolling on phones.

## Simulated (only in automated tests and local development)

- The browser tests use a **temporary in-memory order store** and a **simulated email sender**, because no Supabase or Resend account is connected here. These cannot switch on in a production build, and a yellow banner shows whenever they are active.
- The database tests use plain PostgreSQL with stand-ins for Supabase's `auth` schema and roles. They are not a live Supabase project.

## Blocked: needs the founder (see docs/SETUP.md)

- **Supabase project**, founder user and founder row: needs the founder's account.
- **Resend** API key and a **verified sending domain**. Without a domain, emails can only go to the founder's own address.
- **Vercel deployment** and `SITE_URL`.
- **Deployed acceptance test** (`docs/ACCEPTANCE.md`): the MVP is **not complete** until the deployed order journey, database persistence and real email delivery have been checked there.

## Not built (out of MVP scope, or waiting for decisions)

- Online payment, customer accounts, delivery booking and a 360° preview (excluded by the concept report).
- Real product photographs: none were supplied, so cards use clearly labelled illustrations.
- Fibre percentages and care instructions: waiting for supplier labels.
- Costed variant prices, confirmed availability, payment and delivery arrangements, which are needed before live orders.
- A privacy notice for live orders (they collect phone numbers and addresses).
