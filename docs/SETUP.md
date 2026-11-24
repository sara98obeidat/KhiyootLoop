# Putting KhiyootLoop online: step-by-step setup

This guide is written for a non-technical founder. It takes about 45 minutes
the first time. You will create two free accounts (Supabase and Vercel) and
copy some values from one website to another. **No domain and no email service
are needed for the classroom test**: the site uses the free address Vercel
gives it (like `https://khiyootloop.vercel.app`), and you send acknowledgments
yourself.

> **Keep keys secret.** Some values below are secret keys. Paste them **only**
> into the Vercel "Environment Variables" screen. Never paste them into a
> chat, an email, a document or a GitHub file. If a secret key is ever shared
> by mistake, create a new one in the same dashboard and delete the old one.

You will need:

- The GitHub repository with this code (`sara98obeidat/KhiyootLoop`).
- An email address and password that you will use to sign in as the founder.

Keep a note (on paper or in a password manager) as you go of: your Supabase
project URL, your founder email, and your website address.

---

## A. Supabase: the order database and founder login

1. Go to <https://supabase.com> and sign up (signing in with GitHub is easiest).
2. Click **New project**.
   - Name: `khiyootloop`
   - Database password: click **Generate a password** and save it in your password manager.
   - Region: choose the one closest to Jordan that is offered (for example Central EU / Frankfurt).
   - Click **Create new project** and wait about two minutes.
3. **Create the database tables.**
   - In the left menu, open **SQL Editor** → **New query**.
   - In GitHub, open the file `supabase/migrations/20261124000001_initial_schema.sql`,
     click the **Copy raw file** button, and paste everything into the Supabase query box.
   - Click **Run**. You should see "Success. No rows returned".
   - Click **New query** again and do the same with the second file,
     `supabase/migrations/20261125000001_manual_acknowledgments.sql`.
4. **Stop strangers from creating accounts.**
   - Left menu → **Authentication** → **Sign In / Providers** (on some
     dashboards: **Providers** or **Settings**).
   - Turn **off** "Allow new users to sign up" and click **Save**.
   - (Even if someone did manage to sign up, they still could not see orders:
     only the founder account you add in step 6 is authorised.)
5. **Create your founder account.**
   - Left menu → **Authentication** → **Users** → **Add user** → **Create new user**.
   - Enter your founder email and a strong password (at least 12 characters).
   - Tick **Auto Confirm User**, then **Create user**.
6. **Authorise that account as the founder.**
   - Open **SQL Editor** → **New query**, paste the line below, and replace
     `you@example.com` with your founder email (keep the quotes):

     ```sql
     insert into public.founders (user_id)
     select id from auth.users where email = 'you@example.com';
     ```

   - Click **Run**. It should say "Success. 1 rows affected".
     If it says "0 rows", the email does not match the user you created in step 5.
   - Only **one** founder can be added. To change the founder later, run
     `delete from public.founders;` and then the insert again with the new email.
7. **Find the three values Vercel will need.**
   - Left menu → **Project Settings** (gear icon) → **API** or **API Keys**.
   - Leave this tab open. You need:
     - **Project URL** (looks like `https://abcd1234.supabase.co`) → goes into `SUPABASE_URL`
     - **anon / publishable** key → goes into `SUPABASE_ANON_KEY`
     - **service_role / secret** key → goes into `SUPABASE_SERVICE_ROLE_KEY` (**secret**)

> Free Supabase projects pause after about a week with no visits. If the site
> says the database is unavailable, open the Supabase dashboard and click
> **Restore project**.

---

## B. Make an app secret

The site needs one long random password of its own (`APP_SECRET`). It signs
the private link each customer gets to their order page.

- Open <https://generate-secret.vercel.app/48> and copy the text it shows.
  (Each visit gives a new random value.) Keep this tab open for step D.

---

## C. Vercel: putting the website online

1. Go to <https://vercel.com> and sign up **with GitHub**.
2. Click **Add New…** → **Project**, find **KhiyootLoop** and click **Import**.
   (If it is not listed, click "Adjust GitHub App Permissions" and allow the repository.)
3. Leave the framework as **Next.js**. Open **Environment Variables** and add
   each line below (Name on the left, Value on the right):

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | Supabase Project URL (step A7) |
   | `SUPABASE_ANON_KEY` | Supabase anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role / secret key |
   | `APP_SECRET` | the random text from step B |
   | `EMAIL_ACKNOWLEDGMENTS` | `manual` |
   | `ENABLE_LIVE_ORDERS` | `false` |

   You do **not** need `SITE_URL` or any Resend values for the classroom test.

4. Click **Deploy** and wait for "Congratulations".
5. Your site's address is shown on the project page under **Domains**
   (for example `https://khiyootloop.vercel.app`). The site picks this address up
   automatically. If you later change environment variables, go to
   **Deployments**, click **⋯** next to the newest one → **Redeploy**.
6. **Check the setup:** open `https://YOUR-SITE/api/health`. You should see
   `"database":"configured"`, `"orderMode":"test"` and `"acknowledgments":"manual"`.
   If the database says `not_configured`, re-check those variable names and values, then redeploy.

---

## D. Running the classroom test

- Customer site: `https://YOUR-SITE`
- Founder dashboard: `https://YOUR-SITE/founder` (sign in with the founder account from step A5).

After each submission the participant sees their **order reference and the
complete order summary**, with a **Print or save as PDF** button. No automatic
email is sent, and the site never says one was.

To acknowledge an order by hand, open the dashboard and, on that order:

1. Click **Open email draft**. Your email app opens with the participant's address,
   a subject starting with `[TEST ORDER]` and the full acknowledgment text, including
   a private link back to their order summary. (Or click **Copy acknowledgment text**
   and paste it into any email.)
2. Send it from your own email account.
3. Click **Mark acknowledgment sent**. The dashboard then shows "Acknowledged manually".

Then work through `docs/ACCEPTANCE.md` before the session.

---

## E. Later (optional): automatic acknowledgment emails

The email code is already in the site and switched off. To switch it on later
you need a domain you own (Resend only sends to other people from a verified domain).
No code changes are needed, only settings and a redeploy:

1. Go to <https://resend.com> and sign up.
2. **Verify a sending domain.**
   - Left menu → **Domains** → **Add domain**, type your domain (for example `khiyootloop.com`).
   - Resend shows a few DNS records. Sign in where you bought the domain
     (for example Namecheap or GoDaddy), open its DNS settings, and add each
     record exactly as shown. Resend has a guide for each provider.
   - Back in Resend, click **Verify**. It can take from a few minutes to a few hours.
   - **No domain yet?** You can still test: use `KhiyootLoop <onboarding@resend.dev>`
     as `EMAIL_FROM`. Resend then only sends to the email address of your own
     Resend account, so this is only for your own test, not for the class.
3. **Create an API key.**
   - Left menu → **API Keys** → **Create API key**, name it `khiyootloop`,
     permission **Sending access**. Copy the key (it starts with `re_`).
     It is shown only once: paste it straight into Vercel.
4. Decide your sender line, for example `KhiyootLoop <orders@khiyootloop.com>`.
   The part after `@` must be your verified domain. This goes into `EMAIL_FROM`.
5. In Vercel → **Settings** → **Environment Variables**, add `RESEND_API_KEY`,
   `EMAIL_FROM` (and optionally `EMAIL_REPLY_TO` with your own address), and change
   `EMAIL_ACKNOWLEDGMENTS` to `automatic`. If you use your own domain for the website
   too, also set `SITE_URL` to it. Then **Redeploy**.
6. `/api/health` should now show `"acknowledgments":"automatic"` and `"email":"configured"`.
   New orders are then emailed automatically; the dashboard shows the email status and a
   **Retry email** button if sending fails.

---

### Optional extra: real "delivered" and "bounced" email status

Without this, the dashboard shows "Accepted by email service (delivery not
confirmed)". With it, it can show "Delivered" or "Bounced".

1. Resend → **Webhooks** → **Add webhook**.
2. Endpoint URL: `https://YOUR-SITE/api/webhooks/resend`
3. Events: `email.delivered`, `email.bounced`, `email.delivery_delayed`,
   `email.complained`, `email.failed`. Save.
4. Copy the **Signing secret** into a new Vercel variable `RESEND_WEBHOOK_SECRET`, then redeploy.

---

## Changing prices, colours or options later

All of these are in small files that you can edit on the GitHub website
(open the file → pencil icon → **Commit changes**). Vercel redeploys
automatically after each commit.

- **Prices:** `src/config/pricing.ts`. Change `DEMONSTRATION_PRICES`, and bump
  `PRICING_VERSION` (for example to `...-v2`). Each order remembers the version it was priced with.
- **Colour availability:** `src/config/catalog.ts` → `AVAILABILITY`. Set a
  colour to `false` to hide it for that yarn. Bump `CATALOG_VERSION`.
- **Material descriptions:** `src/config/catalog.ts` → `description`. Do not
  add fibre percentages or care instructions until you have them from the supplier.

### Switching on real orders (not yet)

Real-order mode stays **off** until all of these are true. Each one is a
switch in `src/config/site.ts`, and `ENABLE_LIVE_ORDERS` must also be `true` in Vercel:

1. Every sellable variant has a costed price in `VARIANT_PRICES` (`src/config/pricing.ts`).
2. Colour and material availability matches real stock.
3. Payment arrangements are decided.
4. Delivery arrangements are decided.

Ask your developer (or Claude) to help with this step. In live mode the order
form also asks for a phone number and delivery address, and the website needs a
privacy notice explaining how that data is used.

---

## For developers

```bash
npm install
cp .env.example .env.local     # fill in, or use the development-only memory backend
npm run dev                    # http://localhost:3000
npm test                       # unit tests (Vitest)
npm run test:db                # applies migrations to a throw-away PostgreSQL and checks RLS
npm run test:e2e               # browser tests (Playwright + Chromium; uses the dev memory backend)
npm run typecheck && npm run lint && npm run build
```

With the Supabase CLI you can apply migrations with `supabase link` then `supabase db push`
instead of pasting SQL.
