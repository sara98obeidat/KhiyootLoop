import { beforeEach, describe, expect, it } from "vitest";
import { defaultConfiguration, PREVIEW_VERSION } from "@/lib/configuration";
import { FakeEmailSender, NotConfiguredEmailSender } from "@/lib/email/sender";
import { RATE_LIMITS, sendAcknowledgment, submitOrder, type SubmitDeps } from "@/lib/orderService";
import { PRICING_VERSION } from "@/config/pricing";
import { previewImageId } from "@/config/previewImages";
import { MemoryOrderStore } from "@/lib/store/memoryStore";
import { orderAccessToken, sha256Hex } from "@/lib/security";
import { randomUUID } from "node:crypto";

const SECRET = "test-secret-test-secret-test-secret-1234";

function body(product: "bag" | "scarf", overrides: Record<string, unknown> = {}) {
  const { configuration: configOverrides, ...rest } = overrides;
  const configuration = {
    ...defaultConfiguration(product),
    tagText: product === "bag" ? "Sara" : "سارة",
    ...((configOverrides as object | undefined) ?? {}),
  };
  return {
    idempotencyKey: randomUUID(),
    configuration,
    previewVersion: PREVIEW_VERSION,
    previewImageId: previewImageId(configuration),
    displayedPriceJod: product === "bag" ? 63 : 56,
    displayedPricingVersion: PRICING_VERSION,
    customer: { name: "Participant 7", email: "p7@example.com" },
    ...rest,
  };
}

let store: MemoryOrderStore;
let email: FakeEmailSender;
let deps: SubmitDeps;

beforeEach(() => {
  store = new MemoryOrderStore();
  email = new FakeEmailSender("accept");
  deps = {
    store,
    email,
    mode: "test",
    secret: SECRET,
    clientId: "203.0.113.5",
    siteUrl: "https://example.test",
    acknowledgments: "automatic",
  };
});

describe("both product journeys", () => {
  it("saves a bag test order, then sends one acknowledgment", async () => {
    const r = await submitOrder(body("bag"), deps);
    expect(r.status).toBe(201);
    if (!r.body.ok) throw new Error("expected ok");
    expect(r.body.order.reference).toMatch(/^KL-TEST-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(r.body.order.emailStatus).toBe("accepted");
    expect(store.orders).toHaveLength(1);
    const o = store.orders[0];
    expect(o).toMatchObject({
      isTest: true,
      mode: "test",
      priceJod: 63,
      priceType: "demonstration",
      pricingVersion: PRICING_VERSION,
      previewVersion: PREVIEW_VERSION,
      status: "received",
      emailStatus: "accepted",
      emailAttempts: 1,
    });
    expect(o.configuration.tagText).toBe("Sara");
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0].content.subject).toMatch(/^\[TEST ORDER\]/);
  });

  it("saves a scarf test order with Arabic tag text exactly", async () => {
    const r = await submitOrder(body("scarf"), deps);
    expect(r.status).toBe(201);
    expect(store.orders[0].priceJod).toBe(56);
    expect(store.orders[0].configuration.tagText).toBe("سارة");
    expect(email.sent[0].content.html).toContain('dir="rtl"');
  });

  it("the acknowledgment link works from any device (server lookup by reference + token)", async () => {
    const r = await submitOrder(body("bag"), deps);
    if (!r.body.ok) throw new Error();
    const { reference, accessToken } = r.body.order;
    const found = await store.getByReferenceAndToken(reference, sha256Hex(accessToken));
    expect(found?.reference).toBe(reference);
    expect(await store.getByReferenceAndToken(reference, sha256Hex("0".repeat(40)))).toBeNull();
  });
});

describe("validation", () => {
  it("requires name and a valid email", async () => {
    const r1 = await submitOrder(body("bag", { customer: { name: "", email: "p7@example.com" } }), deps);
    expect(r1.status).toBe(400);
    const r2 = await submitOrder(body("bag", { customer: { name: "A", email: "not-an-email" } }), deps);
    expect(r2.status).toBe(400);
    if (r2.body.ok) throw new Error();
    expect(r2.body.fieldErrors?.["customer.email"]).toBeTruthy();
    expect(store.orders).toHaveLength(0);
  });

  it("rejects options outside the catalog", async () => {
    const b = body("bag");
    const r = await submitOrder({ ...b, configuration: { ...b.configuration, stitch: "hdc" } }, deps);
    expect(r.status).toBe(422);
    const r2 = await submitOrder({ ...b, configuration: { ...b.configuration, color: "purple" } }, deps);
    expect(r2.status).toBe(422);
    const r3 = await submitOrder({ ...b, configuration: { ...b.configuration, tagText: "1234567890123" } }, deps);
    expect(r3.status).toBe(422);
    expect(store.orders).toHaveLength(0);
  });

  it("rejects unknown fields such as a client-supplied price on the order", async () => {
    const r = await submitOrder({ ...body("bag"), priceJod: 1 }, deps);
    expect(r.status).toBe(400);
  });

  it("does not accept a phone number or address on test orders", async () => {
    const r = await submitOrder(body("bag", { customer: { name: "A", email: "a@example.com", phone: "0790000000" } }), deps);
    expect(r.status).toBe(400);
    expect(store.orders).toHaveLength(0);
  });

  it("rejects an outdated preview version", async () => {
    const r = await submitOrder(body("bag", { previewVersion: "svg-preview-v0" }), deps);
    expect(r.status).toBe(409);
  });

  it("rejects submissions that fill the hidden honeypot field", async () => {
    const r = await submitOrder(body("bag", { website: "http://spam" }), deps);
    expect(r.status).toBe(400);
    expect(store.orders).toHaveLength(0);
  });
});

describe("price manipulation", () => {
  it.each([1, 0, -63, 62.999, 70])("rejects a displayed price of %s and saves nothing", async (price) => {
    const r = await submitOrder(body("bag", { displayedPriceJod: price }), deps);
    expect(r.status).toBe(409);
    if (r.body.ok) throw new Error();
    expect(r.body.code).toBe("price_mismatch");
    expect(r.body.currentPriceJod).toBe(63);
    expect(store.orders).toHaveLength(0);
  });

  it("rejects a stale pricing version", async () => {
    const r = await submitOrder(body("scarf", { displayedPricingVersion: "old" }), deps);
    expect(r.status).toBe(409);
  });

  it("never stores a client price: the saved price is the server's", async () => {
    await submitOrder(body("scarf"), deps);
    expect(store.orders[0].priceJod).toBe(56);
  });
});

describe("duplicate submissions", () => {
  it("returns the same order for a retried request and sends one email", async () => {
    const b = body("bag");
    const r1 = await submitOrder(b, deps);
    const r2 = await submitOrder(b, deps);
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(200);
    if (!r1.body.ok || !r2.body.ok) throw new Error();
    expect(r2.body.duplicate).toBe(true);
    expect(r2.body.order.reference).toBe(r1.body.order.reference);
    expect(store.orders).toHaveLength(1);
    expect(email.sent).toHaveLength(1);
  });

  it("creates exactly one order for 10 simultaneous clicks", async () => {
    const b = body("scarf");
    const results = await Promise.all(Array.from({ length: 10 }, () => submitOrder(b, deps)));
    expect(store.orders).toHaveLength(1);
    expect(email.sent).toHaveLength(1);
    const refs = new Set(results.map((r) => (r.body.ok ? r.body.order.reference : r.body.code)));
    expect(refs.size).toBe(1);
  });

  it("refuses to reuse a key with different details", async () => {
    const b = body("bag");
    await submitOrder(b, deps);
    const r = await submitOrder({ ...b, customer: { name: "Someone else", email: "x@example.com" } }, deps);
    expect(r.status).toBe(409);
    expect(store.orders).toHaveLength(1);
  });

  it("recovers from a database error with a retry using the same key", async () => {
    const b = body("bag");
    store.failNextInserts = 1;
    await expect(submitOrder(b, deps)).rejects.toThrow();
    expect(store.orders).toHaveLength(0);
    const r = await submitOrder(b, deps);
    expect(r.status).toBe(201);
    expect(store.orders).toHaveLength(1);
  });
});

describe("abuse protection", () => {
  it("rate-limits new submissions from one client", async () => {
    for (let i = 0; i < RATE_LIMITS.perClient.max; i++) {
      expect((await submitOrder(body("bag"), deps)).status).toBe(201);
    }
    const r = await submitOrder(body("bag"), deps);
    expect(r.status).toBe(429);
    // A different client is unaffected.
    expect((await submitOrder(body("bag"), { ...deps, clientId: "198.51.100.9" })).status).toBe(201);
  });

  it("does not count retries of an existing order against the limit", async () => {
    const b = body("bag");
    await submitOrder(b, deps);
    for (let i = 0; i < RATE_LIMITS.perClient.max + 5; i++) {
      expect((await submitOrder(b, deps)).status).toBe(200);
    }
  });
});

describe("email success and failure", () => {
  it("keeps the order when the email fails, and the founder can retry without a new order", async () => {
    email.mode = "fail";
    const r = await submitOrder(body("bag"), deps);
    expect(r.status).toBe(201);
    if (!r.body.ok) throw new Error();
    expect(r.body.order.emailStatus).toBe("failed");
    expect(store.orders).toHaveLength(1);
    expect(store.orders[0].emailError).toMatch(/Simulated/);

    email.mode = "accept";
    const status = await sendAcknowledgment(store.orders[0], deps);
    expect(status).toBe("accepted");
    expect(store.orders).toHaveLength(1);
    expect(store.orders[0]).toMatchObject({ emailStatus: "accepted", emailAttempts: 2, emailError: null });
    // Each attempt uses its own provider idempotency key.
    expect(email.sent[0].idempotencyKey).toMatch(/\/2$/);
  });

  it("reports 'not configured' honestly when no email service is set up", async () => {
    const r = await submitOrder(body("bag"), { ...deps, email: new NotConfiguredEmailSender() });
    if (!r.body.ok) throw new Error();
    expect(r.body.order.emailStatus).toBe("not_configured");
    expect(store.orders[0].emailStatus).toBe("not_configured");
  });

  it("never reports 'delivered' just because the API accepted the email", async () => {
    await submitOrder(body("bag"), deps);
    expect(store.orders[0].emailStatus).toBe("accepted");
    await store.updateEmailStatusByProviderId(store.orders[0].emailProviderId!, "delivered");
    expect(store.orders[0].emailStatus).toBe("delivered");
  });

  it("does not send twice when a send is already in progress", async () => {
    await submitOrder(body("bag"), deps);
    const o = store.orders[0];
    o.emailStatus = "sending";
    o.emailLastAttemptAt = new Date().toISOString();
    expect(await sendAcknowledgment(o, deps)).toBe("sending");
    expect(email.sent).toHaveLength(1);
  });

  it("includes a working order link in the email", async () => {
    const b = body("bag");
    await submitOrder(b, deps);
    const token = orderAccessToken(SECRET, b.idempotencyKey);
    expect(email.sent[0].content.text).toContain(`https://example.test/order/${store.orders[0].reference}?key=${token}`);
  });
});

describe("manual acknowledgments (automatic email switched off)", () => {
  beforeEach(() => {
    deps.acknowledgments = "manual";
  });

  it("saves the order, sends no email and marks it for manual acknowledgment", async () => {
    const r = await submitOrder(body("bag"), deps);
    expect(r.status).toBe(201);
    if (!r.body.ok) throw new Error();
    expect(r.body.order.emailStatus).toBe("manual_pending");
    expect(email.sent).toHaveLength(0);
    expect(store.orders[0]).toMatchObject({ emailStatus: "manual_pending", emailAttempts: 0 });
  });

  it("works even when no email service exists at all", async () => {
    const r = await submitOrder(body("scarf"), { ...deps, email: new NotConfiguredEmailSender() });
    if (!r.body.ok) throw new Error();
    expect(r.body.order.emailStatus).toBe("manual_pending");
  });

  it("lets the founder mark the acknowledgment as sent, once", async () => {
    await submitOrder(body("bag"), deps);
    const id = store.orders[0].id;
    expect((await store.markManuallyAcknowledged(id))?.emailStatus).toBe("manual_sent");
    expect(await store.markManuallyAcknowledged(id)).toBeNull();
    expect(store.orders).toHaveLength(1);
  });

  it("duplicate submissions still create one order", async () => {
    const b = body("bag");
    await Promise.all([submitOrder(b, deps), submitOrder(b, deps), submitOrder(b, deps)]);
    expect(store.orders).toHaveLength(1);
  });
});

describe("concept preview image", () => {
  it("saves the image id of the concept image the customer saw", async () => {
    const b = body("bag");
    expect(b.previewImageId).toBe("bag-single_crochet-cotton_cord_3mm-cream-v1");
    const r = await submitOrder(b, deps);
    expect(r.status).toBe(201);
    const saved = await store.getByIdempotencyKey(b.idempotencyKey);
    expect(saved?.previewImageId).toBe("bag-single_crochet-cotton_cord_3mm-cream-v1");
    expect(saved?.previewVersion).toBe("image-preview-v1");
  });

  it("saves null when no image exists for the combination", async () => {
    const b = body("bag", { configuration: { color: "black" } });
    expect(b.previewImageId).toBeNull();
    const r = await submitOrder(b, deps);
    expect(r.status).toBe(201);
    expect((await store.getByIdempotencyKey(b.idempotencyKey))?.previewImageId).toBeNull();
  });

  it("rejects an image id that does not belong to the chosen options", async () => {
    const b = body("bag", { previewImageId: "bag-single_crochet-cotton_cord_3mm-burgundy-v1" });
    const r = await submitOrder(b, deps);
    expect(r.status).toBe(409);
    expect(await store.getByIdempotencyKey(b.idempotencyKey)).toBeNull();
    const missing = await submitOrder(body("scarf", { previewImageId: undefined }), deps);
    expect(missing.status).toBe(400);
  });
});
