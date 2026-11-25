// End-to-end browser checks against a local development server.
//
// Uses the DEVELOPMENT-ONLY in-memory backend and a simulated email sender,
// so it can run without Supabase or Resend. It proves the browser journeys,
// duplicate protection, access control and layout. The real database and real
// email must still be checked on the deployed site (see docs/ACCEPTANCE.md).
//
// Usage: npm run test:e2e   (needs Playwright + Chromium: `npx playwright install chromium`)

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "e2e", "output");
mkdirSync(OUT, { recursive: true });

const FOUNDER_EMAIL = "founder@example.test";
const FOUNDER_PASSWORD = "e2e-only-password";
let failures = 0;
let passes = 0;

async function visible(locator, timeout = 15000) {
  try {
    await locator.waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

function check(cond, label) {
  if (cond) {
    passes++;
    console.log(`  PASS  ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}`);
  }
}

async function startServer(port, emailMode) {
  const proc = spawn(path.join(ROOT, "node_modules", ".bin", "next"), ["dev", "-p", String(port)], {
    cwd: ROOT,
    detached: true,
    env: {
      ...process.env,
      NODE_ENV: "development",
      NEXT_TELEMETRY_DISABLED: "1",
      KL_DEV_MEMORY_BACKEND: "1",
      KL_DEV_FAKE_EMAIL: emailMode, // "" = manual acknowledgments (classroom default)
      EMAIL_ACKNOWLEDGMENTS: "",
      KL_DEV_FOUNDER_EMAIL: FOUNDER_EMAIL,
      KL_DEV_FOUNDER_PASSWORD: FOUNDER_PASSWORD,
      SUPABASE_URL: "",
      SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      RESEND_API_KEY: "",
      SITE_URL: `http://localhost:${port}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  proc.stdout.on("data", (d) => (log += d));
  proc.stderr.on("data", (d) => (log += d));
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`${base}/api/health`);
      if (r.ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  // Warm up the main pages so timings are stable.
  for (const p of ["/", "/customize/bag", "/customize/scarf", "/review", "/info", "/founder"]) {
    await fetch(base + p).catch(() => {});
  }
  const stop = () => {
    try {
      process.kill(-proc.pid, "SIGTERM");
    } catch {}
  };
  process.on("exit", stop);
  return { proc, base, stop, log: () => log };
}

async function noHorizontalScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

async function configure(page, base, product, choices) {
  await page.goto(`${base}/customize/${product}`);
  // A fresh development server compiles on first visit; wait until the page is interactive.
  await page.waitForLoadState("networkidle");
  for (const label of choices.labels) {
    await page.getByLabel(label, { exact: false }).first().check();
  }
  await page.getByLabel("Tag text (one line)").fill(choices.tag);
  await page.getByRole("button", { name: "Review my design" }).click();
  await page.waitForURL(`${base}/review`);
}

async function main() {
  const browser = await chromium.launch();
  const origNewContext = browser.newContext.bind(browser);
  browser.newContext = async (opts) => {
    const ctx = await origNewContext(opts);
    ctx.setDefaultTimeout(20000);
    ctx.setDefaultNavigationTimeout(60000);
    return ctx;
  };
  const server = await startServer(3107, "");
  const { base } = server;
  const created = [];
  try {
    // ------------------------------------------------------------------ 1
    console.log("\nBag journey on a phone (with double-click on submit)");
    const phone = await browser.newContext({ ...devices["iPhone 13"] });
    const p1 = await phone.newPage();
    await p1.goto(base);
    check(await p1.getByText("Classroom test — no payment or production commitment").first().isVisible(), "test-mode notice visible");
    check(await noHorizontalScroll(p1), "home: no horizontal scroll at phone width");
    await p1.screenshot({ path: path.join(OUT, "01-home-phone.png"), fullPage: true });
    await p1.getByRole("link", { name: "Customize a bag" }).first().click();
    await p1.waitForURL(`${base}/customize/bag`);
    check(await noHorizontalScroll(p1), "configurator: no horizontal scroll at phone width");
    check((await p1.locator("dl.dims").textContent()).includes("25 × 20 × 6 cm"), "dimensions shown beside preview");
    const panel = p1.locator(".preview-panel .concept-preview");
    const ready = () => p1.locator('.preview-panel .concept-preview[data-status="ready"]').waitFor({ timeout: 10000 });
    await ready();
    check((await panel.getAttribute("data-base-id")) === "bag-single_crochet-cotton_cord_3mm-base-v1", "bag starts on its single crochet / cotton base photo");
    check(await visible(p1.getByText("AI-generated concept preview. Size is shown in the dimensions; final yarn shades and handmade details may vary.").first()), "new label shown on the preview");
    const canvasLit = await p1.evaluate(() => {
      const c = document.querySelector(".preview-panel canvas");
      const d = c.getContext("2d").getImageData(512, 600, 1, 1).data;
      return Array.from(d);
    });
    check(canvasLit[3] === 255 && canvasLit[0] < 120, `fabric recoloured to black in the browser (${canvasLit})`);
    await p1.getByRole("radio", { name: /^Small/ }).check();
    check((await p1.locator("dl.dims").textContent()).includes("20 × 15 × 5 cm"), "small dimensions shown");
    check(await visible(p1.locator(".dim-diagram", { hasText: "Small: 20 × 15 cm front, 5 cm deep" })), "size diagram follows the size; photo not stretched");
    const box = await p1.locator(".preview-panel .concept-frame").boundingBox();
    check(Math.abs(box.width - box.height) < 2, "photo keeps its proportions");
    const t0 = Date.now();
    await p1.getByLabel("Burgundy").check();
    await ready();
    const ms = Date.now() - t0;
    check(ms < 3000, `colour change applied in the browser (${ms} ms)`);
    await p1.getByRole("radio", { name: /^Waistcoat stitch/ }).check();
    await ready();
    check((await panel.getAttribute("data-base-id")) === "bag-waistcoat-cotton_cord_3mm-base-v1", "stitch change loads the waistcoat base photo");
    await p1.getByRole("radio", { name: /^Polyester macramé cord/ }).check();
    await ready();
    check((await panel.getAttribute("data-base-id")) === "bag-waistcoat-polyester_macrame_2mm-base-v1", "material change loads the polyester base photo");
    await p1.getByRole("radio", { name: /^Metal tag/ }).check();
    // Tag validation: 13 characters is rejected
    await p1.getByLabel("Tag text (one line)").fill("1234567890123");
    await p1.getByRole("button", { name: "Review my design" }).click();
    check(await p1.getByText("at most 12 characters").isVisible(), "13-character tag rejected with a clear message");
    check(p1.url().endsWith("/customize/bag"), "cannot continue with invalid tag");
    await p1.getByLabel("Tag text (one line)").fill("Sara & Co");
    check((await p1.locator("figure svg text", { hasText: "Sara & Co" }).count()) >= 1, "preview shows exact tag text");
    await p1.screenshot({ path: path.join(OUT, "02-configurator-bag-phone.png"), fullPage: true });
    await p1.getByRole("button", { name: "Review my design" }).click();
    await p1.waitForURL(`${base}/review`);
    // Refresh keeps the unfinished design (localStorage)
    await p1.reload();
    check(await visible(p1.locator("table.spec td", { hasText: "Waistcoat stitch" })), "review survives refresh (draft in browser)");
    check(await p1.getByText("63 JOD").first().isVisible(), "demonstration price shown");
    // Required fields
    await p1.getByRole("button", { name: "Submit test order" }).click();
    check(await p1.getByText("Please enter your name or participant alias.").isVisible(), "name required");
    check(await p1.getByText("Please enter your email address.").isVisible(), "email required");
    check(await p1.getByText("Please confirm that the tag text").isVisible(), "tag confirmation required");
    check((await p1.getByLabel("Phone number").count()) === 0, "no phone field in test mode");
    await p1.getByLabel("Name or participant alias").fill("Participant 7");
    await p1.getByLabel("Email address").fill("not-an-email");
    await p1.getByRole("button", { name: "Submit test order" }).click();
    check(await p1.getByText("Please enter a valid email address.").isVisible(), "invalid email rejected");
    await p1.getByLabel("Email address").fill("p7@example.com");
    await p1.getByLabel("I checked the tag text", { exact: false }).check();
    await p1.screenshot({ path: path.join(OUT, "03-review-phone.png"), fullPage: true });
    const posts = [];
    p1.on("request", (r) => r.url().endsWith("/api/orders") && r.method() === "POST" && posts.push(r));
    const btn = p1.getByRole("button", { name: "Submit test order" });
    await btn.dblclick();
    await btn.click({ force: true, trial: false }).catch(() => {});
    await p1.waitForURL(/\/order\/KL-TEST-/, { timeout: 30000 });
    check(posts.length === 1, `double click sent one request (sent ${posts.length})`);
    check(await p1.getByText("Order request received").first().isVisible(), "acknowledgment page shown");
    const ref1 = (await p1.locator("text=/KL-TEST-[A-Z0-9]{4}-[A-Z0-9]{4}/").first().textContent()).trim();
    created.push(ref1);
    check(await visible(p1.getByText("Please print or save this page")), "asks participant to print or save");
    check((await p1.getByText(/email (was |has been )?sent|accepted a confirmation email/i).count()) === 0, "does not claim an email was sent");
    check(await p1.getByText("Classroom test order — no payment or production commitment.").isVisible(), "labelled as classroom test order");
    check(await p1.locator("table.spec td", { hasText: "Participant 7" }).isVisible(), "summary includes name");
    check(await p1.locator("table.spec td", { hasText: "Waistcoat stitch" }).isVisible(), "summary includes options");
    check(await p1.getByRole("button", { name: "Print or save as PDF" }).isVisible(), "print/save button shown");
    await p1.emulateMedia({ media: "print" });
    check(!(await p1.getByRole("button", { name: "Print or save as PDF" }).isVisible()), "print view hides buttons");
    check(!(await p1.locator("nav").isVisible()), "print view hides navigation");
    await p1.emulateMedia({ media: "screen" });
    check(await p1.getByText("Production is not confirmed yet", { exact: false }).isVisible() || (await p1.getByText("not confirmed yet").count()) > 0, "production not confirmed wording");
    await p1.screenshot({ path: path.join(OUT, "04-ack-phone.png"), fullPage: true });
    const ackUrl = p1.url();
    await p1.reload();
    check(await p1.getByText(ref1).first().isVisible(), "acknowledgment survives refresh (read from server)");
    const other = await browser.newContext();
    const o1 = await other.newPage();
    await o1.goto(ackUrl);
    check(await o1.getByText(ref1).first().isVisible(), "order visible from another browser/device via its link");
    await o1.goto(ackUrl.replace(/key=[a-f0-9]+/, "key=" + "0".repeat(40)));
    check(await o1.getByText("Order not found").isVisible(), "wrong link key shows nothing");
    await other.close();

    // ------------------------------------------------------------------ 2
    console.log("\nScarf journey on desktop with Arabic tag, keyboard only");
    const desk = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const p2 = await desk.newPage();
    await p2.goto(`${base}/customize/scarf`);
    // Keyboard: focus the first size radio and use arrow keys
    await p2.getByRole("radio", { name: /^Regular/ }).focus();
    await p2.keyboard.press("ArrowLeft");
    check(await p2.getByRole("radio", { name: /^Small/ }).isChecked(), "arrow keys change size");
    await p2.keyboard.press("Tab");
    await p2.keyboard.press("ArrowRight");
    check(await p2.getByRole("radio", { name: /^Back-loop half double crochet/ }).isChecked(), "Tab + arrow changes stitch");
    await p2.keyboard.press("Tab");
    await p2.keyboard.press("ArrowRight");
    check(await p2.getByRole("radio", { name: /^Acrylic–wool–alpaca blend/ }).isChecked(), "Tab + arrow changes yarn");
    check(await p2.getByText("Contains wool.").isVisible(), "wool content identified");
    const focusRing = await p2.evaluate(() => getComputedStyle(document.activeElement.closest("label")).boxShadow);
    check(focusRing && focusRing !== "none", "visible focus indicator");
    await p2.getByRole("radio", { name: /^Half double crochet/ }).check();
    await p2.getByRole("radio", { name: /^Cotton–acrylic blend/ }).check();
    await p2.getByLabel("Burgundy").check();
    await p2.locator('.preview-panel .concept-preview[data-status="ready"]').waitFor({ timeout: 10000 });
    check((await p2.locator(".preview-panel .concept-preview").getAttribute("data-base-id")) === "scarf-hdc-cotton_acrylic-base-v1", "scarf uses its hdc / cotton–acrylic base photo");
    await p2.getByLabel("Tag text (one line)").fill("خيوط لوب");
    check((await p2.locator('figure .concept-overlay text[direction="rtl"]', { hasText: "خيوط لوب" }).count()) === 1, "Arabic tag text drawn right-to-left on the image");
    await p2.screenshot({ path: path.join(OUT, "05-configurator-scarf-desktop.png"), fullPage: true });
    await p2.getByLabel("Tag text (one line)").press("Enter");
    await p2.waitForURL(`${base}/review`);
    check(await visible(p2.getByText("56 JOD").first()), "scarf demonstration price");
    await p2.getByLabel("Name or participant alias").fill("مشارك ٣");
    await p2.getByLabel("Email address").fill("p3@example.com");
    await p2.getByLabel("I checked the tag text", { exact: false }).check();
    await p2.getByLabel("I checked the tag text", { exact: false }).press("Tab");
    await p2.keyboard.press("Enter");
    await p2.waitForURL(/\/order\/KL-TEST-/, { timeout: 30000 });
    const ref2 = (await p2.locator("text=/KL-TEST-[A-Z0-9]{4}-[A-Z0-9]{4}/").first().textContent()).trim();
    created.push(ref2);
    check(await p2.locator("bdi.tag-exact", { hasText: "خيوط لوب" }).first().isVisible(), "Arabic tag text saved exactly");
    check((await p2.locator(".preview-panel .concept-preview").getAttribute("data-base-id")) === "scarf-hdc-cotton_acrylic-base-v1", "order page redraws the preview from the saved base photo");
    await p2.screenshot({ path: path.join(OUT, "06-ack-desktop.png"), fullPage: true });

    // ------------------------------------------------------------------ 3
    console.log("\nServer-side protections (anonymous)");
    const anon = await desk.request;
    const r1 = await anon.get(`${base}/api/founder/orders`);
    check(r1.status() === 401, `anonymous order list refused (${r1.status()})`);
    const r2 = await anon.get(`${base}/api/orders`);
    check(r2.status() === 405, `public endpoint cannot list orders (${r2.status()})`);
    const r3 = await anon.post(`${base}/api/founder/orders/00000000-0000-0000-0000-000000000000/status`, {
      headers: { Origin: base, "Content-Type": "application/json" },
      data: { status: "completed" },
    });
    check(r3.status() === 401, `anonymous status change refused (${r3.status()})`);
    const r4 = await anon.post(`${base}/api/founder/orders/00000000-0000-0000-0000-000000000000/email`, { headers: { Origin: base } });
    check(r4.status() === 401, `anonymous email resend refused (${r4.status()})`);
    const r5 = await anon.post(`${base}/api/founder/orders/00000000-0000-0000-0000-000000000000/acknowledged`, { headers: { Origin: base } });
    check(r5.status() === 401, `anonymous "mark acknowledged" refused (${r5.status()})`);
    const p3 = await desk.newPage();
    await p3.goto(`${base}/founder`);
    check(await p3.getByRole("heading", { name: "Founder sign-in" }).isVisible(), "founder page asks for sign-in");
    check((await p3.getByText(ref1).count()) === 0, "no order data on the sign-in page");
    // Manipulated price from the browser
    await p3.goto(`${base}/`);
    const manipulated = await p3.evaluate(async () => {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          configuration: { product: "bag", size: "regular", stitch: "single_crochet", material: "cotton_cord_3mm", color: "black", tagMaterial: "leather", tagText: "Cheap" },
          previewVersion: "recolor-preview-v1",
          previewImageId: "bag-single_crochet-cotton_cord_3mm-base-v1",
          displayedPriceJod: 1,
          displayedPricingVersion: "pricing-2026-11-24-classroom-v1",
          customer: { name: "Mallory", email: "m@example.com" },
        }),
      });
      return { status: res.status, body: await res.json() };
    });
    check(manipulated.status === 409 && manipulated.body.code === "price_mismatch", `manipulated price rejected (${manipulated.status})`);
    const badOption = await p3.evaluate(async () => {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          configuration: { product: "bag", size: "regular", stitch: "hdc", material: "cotton_cord_3mm", color: "pink", tagMaterial: "gold", tagText: "x" },
          previewVersion: "recolor-preview-v1",
          previewImageId: "bag-single_crochet-cotton_cord_3mm-base-v1",
          displayedPriceJod: 63,
          displayedPricingVersion: "pricing-2026-11-24-classroom-v1",
          customer: { name: "Mallory", email: "m@example.com" },
        }),
      });
      return res.status;
    });
    check(badOption === 422, `invalid options rejected (${badOption})`);
    const cross = await anon.post(`${base}/api/orders`, { headers: { Origin: "https://evil.example", "Content-Type": "application/json" }, data: {} });
    check(cross.status() === 403, `cross-site submission refused (${cross.status()})`);
    // Retried request with the same key returns the same order
    const retry = await p3.evaluate(async () => {
      const body = JSON.stringify({
        idempotencyKey: crypto.randomUUID(),
        configuration: { product: "scarf", size: "regular", stitch: "hdc", material: "cotton_acrylic", color: "cream", tagMaterial: "leather", tagText: "Retry" },
        previewVersion: "recolor-preview-v1",
        previewImageId: "scarf-hdc-cotton_acrylic-base-v1",
        displayedPriceJod: 56,
        displayedPricingVersion: "pricing-2026-11-24-classroom-v1",
        customer: { name: "Retry Tester", email: "retry@example.com" },
      });
      const send = () => fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body }).then((r) => r.json().then((j) => ({ s: r.status, j })));
      const [a, b, c] = await Promise.all([send(), send(), send()]);
      return [a, b, c];
    });
    const refs = new Set(retry.map((x) => x.j.order?.reference));
    check(refs.size === 1 && retry.filter((x) => x.s === 201).length === 1, "3 concurrent retries → one order");
    created.push([...refs][0]);

    // ------------------------------------------------------------------ 4
    console.log("\nFounder dashboard");
    await p3.goto(`${base}/founder`);
    await p3.getByLabel("Email").fill(FOUNDER_EMAIL);
    await p3.getByLabel("Password").fill("wrong-password");
    await p3.getByRole("button", { name: "Sign in" }).click();
    check(await visible(p3.getByText("Email or password is incorrect")), "wrong password refused");
    await p3.getByLabel("Password").fill(FOUNDER_PASSWORD);
    await p3.getByRole("button", { name: "Sign in" }).click();
    await p3.getByRole("heading", { name: "Orders" }).waitFor();
    const shown = await p3.locator("article.order-item").count();
    check(shown === created.length, `dashboard lists exactly the ${created.length} saved orders (shows ${shown})`);
    for (const ref of created) check((await p3.getByText(ref).count()) > 0, `dashboard shows ${ref}`);
    check((await p3.locator(".order-item .thumb .concept-preview").count()) === created.length, "each order has its saved preview");
    check(await visible(p3.getByText(/Base photos: 8 of 8 stitch and material combinations/)), "dashboard lists base photo coverage");
    check(await p3.locator("bdi.tag-exact", { hasText: "Sara & Co" }).first().isVisible(), "exact tag text in dashboard");
    check(await p3.getByText("Acknowledgment: To acknowledge manually").first().isVisible(), "dashboard shows manual acknowledgment pending");
    const draftHref = await p3.locator("article.order-item", { hasText: "Sara & Co" }).getByRole("link", { name: "Open email draft" }).getAttribute("href");
    check(draftHref.startsWith("mailto:p7%40example.com?subject=%5BTEST%20ORDER%5D"), "email draft addressed to participant with [TEST ORDER] subject");
    check(decodeURIComponent(draftHref).includes("Sara & Co") && decodeURIComponent(draftHref).includes("/order/KL-TEST-"), "email draft has the exact tag text and order link");
    await p3.screenshot({ path: path.join(OUT, "07-dashboard-desktop.png"), fullPage: true });
    const ackCard = p3.locator("article.order-item", { hasText: "Sara & Co" });
    await ackCard.getByRole("button", { name: "Mark acknowledgment sent" }).click();
    await ackCard.getByText("Acknowledgment: Acknowledged manually").waitFor();
    check((await p3.locator("article.order-item").count()) === created.length, "marking acknowledged did not create an order");
    const again = await desk.request.post(`${base}/api/founder/orders/${(await (await desk.request.get(`${base}/api/founder/orders`)).json()).orders.find((o) => o.configuration.tagText === "Sara & Co").id}/acknowledged`, { headers: { Origin: base } });
    check(again.status() === 409, "cannot mark the same order twice");
    const autoOff = await desk.request.post(`${base}/api/founder/orders/${(await (await desk.request.get(`${base}/api/founder/orders`)).json()).orders[0].id}/email`, { headers: { Origin: base } });
    check(autoOff.status() === 409, "automatic email refused while switched off");
    const card = p3.locator("article.order-item", { hasText: ref1 });
    await card.getByLabel(`Order status for ${ref1}`).selectOption("awaiting_confirmation_payment");
    await card.getByRole("button", { name: "Update status" }).click();
    await card.getByText("Saved: Awaiting confirmation/payment").waitFor();
    await p3.goto(`${base}/founder?status=awaiting_confirmation_payment`);
    check((await p3.locator("article.order-item").count()) === 1, "filter by status works");
    const api = await desk.request.get(`${base}/api/founder/orders`);
    const saved = (await api.json()).orders;
    check(saved.find((o) => o.configuration.tagText === "خيوط لوب")?.previewImageId === "scarf-hdc-cotton_acrylic-base-v1", "base photo id saved with the scarf order");
    const bagSaved = saved.find((o) => o.configuration.tagText === "Sara & Co");
    check(bagSaved?.previewImageId === "bag-waistcoat-polyester_macrame_2mm-base-v1" && bagSaved?.configuration.color === "burgundy" && bagSaved?.configuration.size === "small" && bagSaved?.configuration.tagMaterial === "metal", "base id, colour, size and tag saved with the bag order");
    check(api.status() === 200, "signed-in founder can use the order API");
    const bogus = await desk.request.post(`${base}/api/founder/orders/${(await api.json()).orders[0].id}/status`, {
      headers: { Origin: base, "Content-Type": "application/json" },
      data: { status: "shipped" },
    });
    check(bogus.status() === 400, "unknown status refused");
    const csrf = await desk.request.post(`${base}/api/founder/orders/${(await api.json()).orders[0].id}/status`, {
      headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
      data: { status: "cancelled" },
    });
    check(csrf.status() === 403, "cross-site status change refused even when signed in");
    const pm = await browser.newContext({ ...devices["Pixel 7"] });
    const pmPage = await pm.newPage();
    await pmPage.goto(`${base}/info`);
    check(await noHorizontalScroll(pmPage), "info page: no horizontal scroll on phone");
    await pmPage.screenshot({ path: path.join(OUT, "08-info-phone.png"), fullPage: true });
    await pm.close();
    await desk.close();
    await phone.close();
  } finally {
    server.stop();
  }

  // -------------------------------------------------------------------- 5
  console.log("\nAutomatic email switched on later: failure behaviour (separate server, failing email)");
  const failing = await startServer(3108, "fail");
  try {
    const ctx = await browser.newContext({ ...devices["iPhone 13"] });
    const p = await ctx.newPage();
    await configure(p, failing.base, "bag", { labels: [], tag: "Fail test" });
    await p.getByLabel("Name or participant alias").fill("Participant 9");
    await p.getByLabel("Email address").fill("p9@example.com");
    await p.getByLabel("I checked the tag text", { exact: false }).check();
    await p.getByRole("button", { name: "Submit test order" }).click();
    await p.waitForURL(/\/order\/KL-TEST-/, { timeout: 30000 });
    check(await visible(p.getByText("we could not send a confirmation email")), "customer told accurately that email failed");
    check(await p.getByText("Order request received").first().isVisible(), "order still acknowledged as saved");
    await p.screenshot({ path: path.join(OUT, "09-ack-email-failed.png"), fullPage: true });
    await p.goto(`${failing.base}/founder`);
    await p.getByLabel("Email").fill(FOUNDER_EMAIL);
    await p.getByLabel("Password").fill(FOUNDER_PASSWORD);
    await p.getByRole("button", { name: "Sign in" }).click();
    await p.getByRole("heading", { name: "Orders" }).waitFor();
    check(await visible(p.getByText("Email: Failed to send")), "dashboard shows email failure");
    await p.getByRole("button", { name: "Retry email" }).click();
    await p.locator("[role=status]", { hasText: "Failed to send" }).waitFor();
    await p.reload();
    check((await p.locator("article.order-item").count()) === 1, "retrying email did not create another order");
    await ctx.close();
  } finally {
    failing.stop();
  }
  await browser.close();
  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
