"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRODUCTION_ESTIMATE_TEXT } from "@/config/catalog";
import { DEMONSTRATION_PRICE_NOTE } from "@/config/pricing";
import { TEST_NOTICE, type OrderMode } from "@/config/site";
import { ProductPreviewV1 } from "./preview/ProductPreview";
import { SpecTable } from "./SpecTable";
import { PREVIEW_VERSION, validateConfiguration, type ProductConfiguration } from "@/lib/configuration";
import { clearDraft, loadContact, loadDraft, saveContact } from "@/lib/draft";
import { formatJod, quotePrice } from "@/lib/pricing";

type Phase = "loading" | "empty" | "ready" | "submitting";

interface ApiError {
  ok: false;
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function newKey(): string {
  return crypto.randomUUID();
}

export function ReviewForm({ mode }: { mode: OrderMode }) {
  const router = useRouter();
  const test = mode === "test";
  const [phase, setPhase] = useState<Phase>("loading");
  const [config, setConfig] = useState<ProductConfiguration | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [tagConfirmed, setTagConfirmed] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  // One idempotency key per exact submission. Retries (double clicks,
  // network retries) reuse it so the server saves the order only once.
  const attempt = useRef<{ key: string; body: string } | null>(null);
  const inFlight = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- browser storage can only be read after hydration */
  useEffect(() => {
    const d = loadDraft();
    if (d && validateConfiguration(d.config).ok) {
      setConfig(d.config);
      const c = loadContact();
      setName(c.name ?? "");
      setEmail(c.email ?? "");
      setPhase("ready");
    } else {
      setPhase("empty");
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (phase === "ready" || phase === "submitting") saveContact({ name, email });
  }, [name, email, phase]);

  if (phase === "loading") return <p>Loading your design…</p>;
  if (phase === "empty" || !config) {
    return (
      <div className="card">
        <h1>Nothing to review yet</h1>
        <p>Start by designing a bag or a scarf.</p>
        <div className="cta-row">
          <Link className="btn btn-primary" href="/customize/bag">Customize a bag</Link>
          <Link className="btn btn-secondary" href="/customize/scarf">Customize a scarf</Link>
        </div>
      </div>
    );
  }

  const quote = quotePrice(config, mode);

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = test ? "Please enter your name or participant alias." : "Please enter your name.";
    else if (name.trim().length > 80) e.name = "Please use at most 80 characters.";
    if (!email.trim()) e.email = "Please enter your email address.";
    else if (!EMAIL_RE.test(email.trim()) || email.trim().length > 254) e.email = "Please enter a valid email address.";
    if (!test) {
      if (!phone.trim()) e.phone = "Please enter a phone number.";
      if (!address.trim()) e.address = "Please enter a delivery address.";
    }
    if (!tagConfirmed) e.tagConfirmed = "Please confirm that the tag text is spelled exactly as you want it.";
    return e;
  }

  async function submit() {
    if (inFlight.current) return; // ignore repeated clicks
    setServerError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const first = Object.keys(e)[0];
      document.getElementById(first === "tagConfirmed" ? "tagConfirmed" : first)?.focus();
      return;
    }
    if (!quote.available || quote.priceJod === null) return;

    const payload = {
      configuration: config,
      previewVersion: PREVIEW_VERSION,
      displayedPriceJod: quote.priceJod,
      displayedPricingVersion: quote.pricingVersion,
      customer: {
        name: name.trim(),
        email: email.trim(),
        ...(test ? {} : { phone: phone.trim(), deliveryAddress: address.trim() }),
      },
      website,
    };
    const body = JSON.stringify(payload);
    if (!attempt.current || attempt.current.body !== body) attempt.current = { key: newKey(), body };
    const requestBody = JSON.stringify({ ...payload, idempotencyKey: attempt.current.key });

    inFlight.current = true;
    setPhase("submitting");
    let navigating = false;
    try {
      let res: Response | null = null;
      let lastError: unknown = null;
      // Retry network failures with the SAME key; the server returns the
      // existing order instead of creating a second one.
      for (let i = 0; i < 3 && !res; i++) {
        try {
          res = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: requestBody,
          });
        } catch (err) {
          lastError = err;
          await new Promise((r) => setTimeout(r, 800 * (i + 1)));
        }
      }
      if (!res) throw lastError ?? new Error("network");
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        navigating = true;
        clearDraft();
        router.push(`/order/${encodeURIComponent(data.order.reference)}?key=${encodeURIComponent(data.order.accessToken)}`);
        return; // keep the button disabled while navigating
      }
      const err = data as ApiError | null;
      if (err?.code === "price_mismatch") {
        setServerError("The price was updated since you opened this page. Please check the price below and submit again.");
        router.refresh();
      } else if (err?.code === "invalid_option" || err?.code === "preview_outdated" || err?.code === "not_priced") {
        setServerError(`${err.message} Please go back and update your design.`);
      } else if (err?.code === "idempotency_conflict") {
        attempt.current = null;
        setServerError(err.message);
      } else if (err?.fieldErrors) {
        const fe: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.fieldErrors)) {
          if (k === "customer.name") fe.name = v;
          else if (k === "customer.email") fe.email = v;
          else if (k === "customer.phone") fe.phone = v;
          else if (k === "customer.deliveryAddress") fe.address = v;
        }
        setErrors(fe);
        setServerError(err.message);
      } else {
        setServerError(err?.message ?? "Your order could not be submitted. Nothing was saved. Please try again.");
      }
    } catch {
      setServerError(
        "We could not reach the server, so we cannot tell whether your order was saved. Please press the button again: if it was saved, you will see the same order and no duplicate will be created.",
      );
    } finally {
      if (!navigating) {
        inFlight.current = false;
        setPhase("ready");
      }
    }
    if (!navigating) setTimeout(() => errorRef.current?.focus(), 0);
  }

  const busy = phase === "submitting";

  return (
    <div className="configurator">
      <div className="preview-panel">
        <figure className="card">
          <ProductPreviewV1 config={config} idPrefix="rev" />
          <figcaption>
            <strong>Illustrative preview.</strong> Handmade texture and screen colours vary.
          </figcaption>
        </figure>
      </div>
      <div className="stack">
        <h1>Review your order request</h1>
        {test && <p className="notice notice-test"><strong>{TEST_NOTICE}.</strong> This is a test order. Nothing will be made or charged.</p>}

        <section className="card" aria-labelledby="spec-title">
          <h2 id="spec-title" style={{ fontSize: "1.2rem" }}>Your design</h2>
          <SpecTable
            config={config}
            caption="Your design"
            priceLabel={
              quote.available ? (
                <>
                  <strong>{formatJod(quote.priceJod)}</strong>{" "}
                  {quote.priceType === "demonstration" && <span className="badge">Test price</span>}
                  {quote.priceType === "demonstration" && <div className="small muted">{DEMONSTRATION_PRICE_NOTE}</div>}
                  {quote.priceType === "variant" && <div className="small muted">Delivery is additional.</div>}
                </>
              ) : (
                "Not available to order yet"
              )
            }
          />
          <p className="small muted" style={{ marginTop: 10 }}>{PRODUCTION_ESTIMATE_TEXT}</p>
          <Link href={`/customize/${config.product}`} className="btn btn-quiet btn-small">Change design</Link>
        </section>

        <form
          className="card"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          aria-labelledby="contact-title"
        >
          <h2 id="contact-title" style={{ fontSize: "1.2rem" }}>Your contact details</h2>
          {test && (
            <p className="small muted">
              For the classroom test we only need a name or participant alias and an email address for the
              confirmation. Please do not enter a home address or phone number.
            </p>
          )}
          <div className="form-row">
            <label className="field" htmlFor="name">{test ? "Name or participant alias" : "Full name"}</label>
            <input id="name" type="text" autoComplete={test ? "off" : "name"} value={name} maxLength={80}
              onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby="name-err" dir="auto" required />
            <p id="name-err" className="field-error">{errors.name ?? ""}</p>
          </div>
          <div className="form-row">
            <label className="field" htmlFor="email">Email address</label>
            <input id="email" type="email" autoComplete="email" inputMode="email" value={email} maxLength={254}
              onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} aria-describedby="email-hint email-err" required />
            <p id="email-hint" className="hint">Used only to contact you about this order request.</p>
            <p id="email-err" className="field-error">{errors.email ?? ""}</p>
          </div>
          {!test && (
            <>
              <div className="form-row">
                <label className="field" htmlFor="phone">Phone number</label>
                <input id="phone" type="tel" autoComplete="tel" value={phone} maxLength={40}
                  onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone} aria-describedby="phone-err" required />
                <p id="phone-err" className="field-error">{errors.phone ?? ""}</p>
              </div>
              <div className="form-row">
                <label className="field" htmlFor="address">Delivery address</label>
                <textarea id="address" autoComplete="street-address" value={address} maxLength={500} rows={3}
                  onChange={(e) => setAddress(e.target.value)} aria-invalid={!!errors.address} aria-describedby="address-err" required />
                <p id="address-err" className="field-error">{errors.address ?? ""}</p>
              </div>
            </>
          )}
          <div className="hp-field" aria-hidden="true">
            <label htmlFor="website">Leave this empty</label>
            <input id="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <div className="form-row">
            <label className="option" style={{ cursor: "pointer" }}>
              <input id="tagConfirmed" type="checkbox" checked={tagConfirmed} onChange={(e) => setTagConfirmed(e.target.checked)}
                aria-invalid={!!errors.tagConfirmed} aria-describedby="tag-confirm-err" />
              <span>
                <span className="opt-label">
                  I checked the tag text: <bdi className="tag-exact" style={{ fontSize: "1rem" }}>{config.tagText}</bdi>
                </span>
                <span className="opt-desc">It will be saved exactly as shown. Engraving support is confirmed before production.</span>
              </span>
            </label>
            <p id="tag-confirm-err" className="field-error">{errors.tagConfirmed ?? ""}</p>
          </div>

          <div ref={errorRef} tabIndex={-1} aria-live="assertive">
            {serverError && <p className="notice notice-error">{serverError}</p>}
          </div>

          <p className="small muted">
            Submitting sends an order <em>request</em>. We confirm production separately after checking
            materials, capacity{test ? "" : " and payment arrangements"}.
          </p>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy || !quote.available} aria-disabled={busy}>
            {busy ? "Submitting…" : test ? "Submit test order" : "Submit order request"}
          </button>
        </form>
      </div>
    </div>
  );
}
