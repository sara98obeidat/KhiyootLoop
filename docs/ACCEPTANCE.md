# Manual acceptance checklist (on the deployed site)

Do this on the **deployed** site after following `docs/SETUP.md`. The MVP is
not complete until every item marked ★ has passed on the deployed site.
Write the date, device and result next to each line.

Use two devices if possible: a phone (customer) and a laptop (founder).

## 0. Setup check
- [ ] ★ `https://YOUR-SITE/api/health` shows `database: configured`, `email: configured`, `orderMode: test`.
- [ ] The pink "Classroom test — no payment or production commitment" bar is on every page.

## 1. Bag journey (phone)
- [ ] Home shows the logo (not stretched), the two product cards and both "Customize" buttons.
- [ ] Product cards say they are illustrations, not photographs.
- [ ] In the bag configurator, switch Small ↔ Regular: the drawing changes size and the dimensions beside it change (20 × 15 × 5 cm / 25 × 20 × 6 cm).
- [ ] Single crochet ↔ Waistcoat stitch: the stitch pattern visibly changes.
- [ ] Cotton cord ↔ Polyester cord: the texture changes; each has a short description.
- [ ] Each colour changes the drawing. Only the five bag colours are offered.
- [ ] Leather ↔ Metal tag changes the tag in the drawing and the close-up.
- [ ] Type a tag text: the drawing shows exactly that text. Type 13 characters: a clear error appears and you cannot continue.
- [ ] The price shows **63 JOD** with a "Test price" label and the note that other variants are not fully costed.
- [ ] The 3–7 working days estimate says delivery is additional and it is not a guarantee.
- [ ] Review page lists every option and the exact tag text.
- [ ] Press **Submit test order** with empty name/email: clear messages appear; nothing is submitted.
- [ ] There is no phone or address field.
- [ ] ★ Fill in alias + your real email, tick the tag confirmation, tap **Submit test order** twice quickly. One acknowledgment page appears with a reference like `KL-TEST-XXXX-XXXX`.

## 2. Scarf journey with Arabic text (laptop, keyboard only)
- [ ] Using only Tab, Shift+Tab, arrow keys, Space and Enter, configure a scarf: Small, back-loop HDC, acrylic–wool–alpaca (shows "Contains wool"), navy, metal tag.
- [ ] Focus is always visible (purple ring).
- [ ] Tag text `خيوط لوب`: the preview shows it right-to-left and correctly joined.
- [ ] Price shows **56 JOD** (test price).
- [ ] ★ Submit with a second real email address. Acknowledgment page appears.

## 3. Persistence ★
- [ ] ★ Refresh the acknowledgment page: the same order is still shown.
- [ ] ★ Open the acknowledgment link (from the email) on a different device: the same order appears.
- [ ] ★ Sign in at `/founder` on the laptop: both orders are listed with reference, details, drawing, exact tag text, price, TEST flag, status and email status.
- [ ] ★ Each listed drawing matches what was reviewed on the customer device.
- [ ] Only one order exists for the double-tapped submission.

## 4. Email ★
- [ ] ★ Both confirmation emails arrive (check spam). Subject starts with `[TEST ORDER]`. They show the reference, specification, exact tag text, price (test price), the 3–7 working day estimate, and say production is not yet confirmed.
- [ ] ★ The Arabic tag text in the email is correct.
- [ ] Dashboard email status says "Accepted by email service (delivery not confirmed)", or "Delivered" if the optional webhook is set up.
- [ ] **Failure test:** in Vercel, temporarily change `RESEND_API_KEY` to `re_invalid`, redeploy, submit a test order. The acknowledgment page says the order is saved but the email could not be sent. The dashboard shows "Failed to send".
- [ ] Restore the correct key, redeploy, press **Retry email** on that order: the status changes to accepted, the email arrives, and **no new order** appears.

## 5. Founder dashboard
- [ ] Change an order's status to "Awaiting confirmation/payment": it is saved after refresh.
- [ ] Filter by status, test/live, email status and product; search by reference.
- [ ] Sign out: `/founder` asks for sign-in again.

## 6. Security ★
- [ ] ★ In a private/incognito window (not signed in), open `/founder`: only the sign-in form, no orders.
- [ ] ★ In that window open `/api/founder/orders`: it shows `"not_signed_in"` (status 401), no orders.
- [ ] ★ Open `/api/orders`: "Orders cannot be listed here."
- [ ] Sign in with a wrong password: refused.
- [ ] (If you created a second, non-founder test user in Supabase) signing in with it says "not authorised" and shows no orders.

## 7. Phone layout
- [ ] On a phone, no page scrolls sideways; all buttons are easy to tap; text is readable without zooming.
- [ ] Rotate the phone: layout still works.

## Result
- Date / tester:
- Devices used:
- Problems found:
