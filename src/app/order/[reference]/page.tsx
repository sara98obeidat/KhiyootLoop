import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCTION_ESTIMATE_TEXT } from "@/config/catalog";
import { TEST_NOTICE } from "@/config/site";
import { DesignPreview } from "@/components/preview/DesignPreview";
import { SpecTable } from "@/components/SpecTable";
import { getRuntime } from "@/lib/runtime";
import { REFERENCE_PATTERN, sha256Hex } from "@/lib/security";
import { formatJod } from "@/lib/pricing";
import type { EmailStatus } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order request received", robots: { index: false } };

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "your email address";
  return `${user.slice(0, 2)}${"•".repeat(Math.max(1, user.length - 2))}@${domain}`;
}

function EmailMessage({ status, email }: { status: EmailStatus; email: string }) {
  const masked = maskEmail(email);
  switch (status) {
    case "accepted":
    case "delayed":
      return (
        <p className="notice notice-info">
          Our email service has accepted a confirmation email to <strong>{masked}</strong>. It usually arrives
          within a few minutes. If you cannot find it, check your spam folder. Keep your order reference either way.
        </p>
      );
    case "delivered":
      return <p className="notice notice-ok">The email service reports that the confirmation email to <strong>{masked}</strong> was delivered.</p>;
    case "sending":
    case "pending":
      return <p className="notice notice-info">Your confirmation email to <strong>{masked}</strong> is being sent. Refresh this page in a minute to check.</p>;
    case "not_configured":
      return (
        <p className="notice notice-warn">
          Your order request is saved, but <strong>no confirmation email was sent</strong> because email sending is
          not set up yet. Please note your order reference. The founder can see this and will send the email later.
        </p>
      );
    default:
      return (
        <p className="notice notice-warn">
          Your order request is saved, but <strong>we could not send the confirmation email</strong> to {masked}.
          Please note your order reference. The founder can see this and will resend it. You do not need to order again.
        </p>
      );
  }
}

export default async function OrderReceivedPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { reference } = await params;
  const { key } = await searchParams;
  const runtime = getRuntime();
  const ref = decodeURIComponent(reference);
  const order =
    runtime.ok && REFERENCE_PATTERN.test(ref) && typeof key === "string" && /^[a-f0-9]{40}$/.test(key)
      ? await runtime.store.getByReferenceAndToken(ref, sha256Hex(key))
      : null;

  if (!order) {
    return (
      <div className="card">
        <h1>Order not found</h1>
        <p>
          We could not find an order for this link. Please use the full link from your confirmation email or the
          page you saw after submitting. If you think something went wrong, contact KhiyootLoop with your order reference.
        </p>
        <Link href="/" className="btn btn-primary">Back to the home page</Link>
      </div>
    );
  }

  return (
    <div className="configurator">
      <div className="stack">
        {order.isTest && <p className="notice notice-test"><strong>{TEST_NOTICE}.</strong> This was a test order: nothing will be made or charged.</p>}
        <h1>Order request received</h1>
        <p>
          Thank you. Your order request has been saved.
        </p>
        <div className="card">
          <p className="eyebrow">Your order reference</p>
          <p style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, letterSpacing: "0.04em" }}>{order.reference}</p>
          <p className="small muted" style={{ margin: "4px 0 0" }}>
            Saved {new Date(order.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Amman", dateStyle: "medium", timeStyle: "short" })} (Jordan time)
          </p>
        </div>
        <EmailMessage status={order.emailStatus} email={order.customer.email} />
        <section className="card">
          <h2 style={{ fontSize: "1.2rem" }}>What you ordered</h2>
          <SpecTable
            config={order.configuration}
            priceLabel={
              <>
                <strong>{formatJod(order.priceJod)}</strong>{" "}
                {order.priceType === "demonstration" && <span className="badge">Test price</span>}
              </>
            }
          />
        </section>
        <section className="card">
          <h2 style={{ fontSize: "1.2rem" }}>What happens next</h2>
          <p>
            This page and the email confirm that we <strong>received</strong> your request. Production is
            <strong> not confirmed yet</strong>.
            {order.isTest
              ? " Because this is a classroom test, it will not enter the production queue."
              : " We will check materials, tag engraving, capacity and payment arrangements, then contact you to confirm."}
          </p>
          <p className="small muted">{PRODUCTION_ESTIMATE_TEXT}</p>
        </section>
        <Link href="/" className="btn btn-quiet">Back to the home page</Link>
      </div>
      <div className="preview-panel">
        <figure className="card">
          <DesignPreview config={order.configuration} version={order.previewVersion} idPrefix="ack" />
          <figcaption>Illustrative preview of the design you submitted. Handmade texture and screen colours vary.</figcaption>
        </figure>
      </div>
    </div>
  );
}
