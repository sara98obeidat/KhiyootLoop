# Manual acceptance checklist (on the deployed site)

Do this on the **deployed** site after following `docs/SETUP.md`. The MVP is
not complete until every item marked ★ has passed on the deployed site.
Write the date, device and result next to each line.

Use two devices if possible: a phone (customer) and a laptop (founder).

## 0. Setup check
- [ ] ★ `https://YOUR-SITE/api/health` shows `database: configured`, `orderMode: test`, `acknowledgments: manual`.
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
- [ ] ★ Fill in alias + your real email, tick the tag confirmation, tap **Submit test order** twice quickly. One confirmation page appears with a reference like `KL-TEST-XXXX-XXXX`.
- [ ] ★ The confirmation page shows the complete order summary (all options, exact tag text, price, name, email, time) and says "Classroom test order — no payment or production commitment".
- [ ] It does **not** say an email was sent.
- [ ] **Print or save as PDF** opens the print window; "Save as PDF" produces a clean one-page-ish summary without the menu.

## 2. Scarf journey with Arabic text (laptop, keyboard only)
- [ ] Using only Tab, Shift+Tab, arrow keys, Space and Enter, configure a scarf: Small, back-loop HDC, acrylic–wool–alpaca (shows "Contains wool"), navy, metal tag.
- [ ] Focus is always visible (purple ring).
- [ ] Tag text `خيوط لوب`: the preview shows it right-to-left and correctly joined, on the tag in the image and in the enlarged tag.
- [ ] The concept image matches the chosen colour, and “Concept preview—final handmade details may vary.” is readable on it.
- [ ] Choosing a combination with no image (for example a black bag) says “No concept image yet for this combination” and shows no picture.
- [ ] Price shows **56 JOD** (test price).
- [ ] ★ Submit with a second email address. The confirmation page appears with the summary.

## 3. Persistence ★
- [ ] ★ Refresh the confirmation page: the same order is still shown.
- [ ] ★ Copy the confirmation page's address and open it on a different device: the same order appears.
- [ ] ★ Sign in at `/founder` on the laptop: both orders are listed with reference, details, drawing, exact tag text, price, TEST flag, status and acknowledgment status.
- [ ] ★ Each listed drawing matches what was reviewed on the customer device.
- [ ] Only one order exists for the double-tapped submission.

## 4. Manual acknowledgment ★
- [ ] ★ In the dashboard each new order shows "Acknowledgment: To acknowledge manually".
- [ ] ★ **Open email draft** opens your email app with the participant's address, a `[TEST ORDER]` subject and the full summary (including the Arabic tag text and a private link to the order page).
- [ ] ★ Send it from your own email account; the participant receives it.
- [ ] ★ Click **Mark acknowledgment sent**: the order shows "Acknowledged manually" after refresh, and no new order appears.
- [ ] **Copy acknowledgment text** copies the same text.

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
