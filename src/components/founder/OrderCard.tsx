import Link from "next/link";
import { DesignPreview } from "@/components/preview/DesignPreview";
import { describeConfiguration } from "@/lib/configuration";
import { EMAIL_STATUS_LABELS, ORDER_STATUS_LABELS, type OrderRecord } from "@/lib/orders";
import { formatJod } from "@/lib/pricing";
import { textDirection } from "@/lib/tagText";
import { ResendEmailButton, StatusControl } from "./FounderActions";

export function formatAmman(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Amman", dateStyle: "medium", timeStyle: "short" });
}

export function OrderCard({ order, detailed = false }: { order: OrderRecord; detailed?: boolean }) {
  const d = describeConfiguration(order.configuration);
  const emailProblem = !["accepted", "delivered", "sending", "delayed"].includes(order.emailStatus);
  return (
    <article className="card order-item" aria-labelledby={`ref-${order.id}`}>
      <div className="thumb">
        <DesignPreview config={order.configuration} version={order.previewVersion} idPrefix={`o${order.id.slice(0, 8)}`} />
      </div>
      <div className="stack">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <h2 id={`ref-${order.id}`} style={{ fontSize: "1.15rem", margin: 0 }}>
            {detailed ? order.reference : <Link href={`/founder/orders/${order.id}`}>{order.reference}</Link>}
          </h2>
          {order.isTest ? <span className="badge">TEST</span> : <span className="badge badge-live">LIVE</span>}
          <span className="status-pill">{ORDER_STATUS_LABELS[order.status]}</span>
          <span className={`status-pill status-email-${order.emailStatus}`}>Email: {EMAIL_STATUS_LABELS[order.emailStatus]}</span>
        </div>
        <dl className="kv">
          <dt>Received</dt><dd>{formatAmman(order.createdAt)} (Amman)</dd>
          <dt>Customer</dt><dd><bdi>{order.customer.name}</bdi> · {order.customer.email}</dd>
          {order.customer.phone && (<><dt>Phone</dt><dd>{order.customer.phone}</dd></>)}
          {order.customer.deliveryAddress && (<><dt>Address</dt><dd style={{ whiteSpace: "pre-wrap" }}>{order.customer.deliveryAddress}</dd></>)}
          <dt>Product</dt><dd>{d.productName} · {d.sizeLabel}</dd>
          <dt>Stitch</dt><dd>{d.stitchLabel}</dd>
          <dt>Yarn</dt><dd>{d.materialLabel}</dd>
          <dt>Colour</dt><dd>{d.colorLabel}</dd>
          <dt>Tag</dt><dd>{d.tagMaterialLabel}</dd>
          <dt>Tag text</dt><dd><bdi className="tag-exact" dir={textDirection(d.tagText)}>{d.tagText}</bdi></dd>
          <dt>Price</dt><dd>{formatJod(order.priceJod)} {order.priceType === "demonstration" ? "(test price)" : ""}</dd>
          {detailed && (
            <>
              <dt>Pricing version</dt><dd>{order.pricingVersion}</dd>
              <dt>Catalog version</dt><dd>{order.catalogVersion}</dd>
              <dt>Preview version</dt><dd>{order.previewVersion}</dd>
              <dt>Email attempts</dt><dd>{order.emailAttempts} (last: {formatAmman(order.emailLastAttemptAt)})</dd>
              {order.emailError && (<><dt>Email error</dt><dd>{order.emailError}</dd></>)}
              {order.emailProviderId && (<><dt>Resend email id</dt><dd>{order.emailProviderId}</dd></>)}
              <dt>Last updated</dt><dd>{formatAmman(order.updatedAt)}</dd>
            </>
          )}
        </dl>
        <StatusControl orderId={order.id} status={order.status} reference={order.reference} />
        {(emailProblem || detailed) && <ResendEmailButton orderId={order.id} emailStatus={order.emailStatus} />}
      </div>
    </article>
  );
}
