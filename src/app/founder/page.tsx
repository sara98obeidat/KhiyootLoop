import { PreviewCoverage } from "@/components/founder/PreviewCoverage";
import type { Metadata } from "next";
import { FounderGate } from "@/components/founder/FounderGate";
import { LogoutButton } from "@/components/founder/FounderActions";
import { OrderCard } from "@/components/founder/OrderCard";
import { getFounderSession } from "@/lib/founder";
import { ackDraftFor } from "@/lib/founderAck";
import {
  EMAIL_STATUSES,
  EMAIL_STATUS_LABELS,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  isOrderStatus,
  type EmailStatus,
  type OrderRecord,
} from "@/lib/orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Founder dashboard", robots: { index: false, follow: false } };

type SP = { q?: string; status?: string; kind?: string; email?: string; product?: string };

export default async function FounderDashboard({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getFounderSession();
  if (!session.ok) return <FounderGate session={session} />;
  const sp = await searchParams;
  const status = isOrderStatus(sp.status) ? sp.status : undefined;
  const emailStatus = (EMAIL_STATUSES as readonly string[]).includes(sp.email ?? "") ? (sp.email as EmailStatus) : undefined;
  const product = sp.product === "bag" || sp.product === "scarf" ? sp.product : undefined;
  const kind = sp.kind === "test" || sp.kind === "live" ? sp.kind : "";
  const q = (sp.q ?? "").slice(0, 60);
  let orders: OrderRecord[];
  let loadError: string | null = null;
  try {
    orders = await session.orders.list({
      status,
      emailStatus,
      product,
      isTest: kind === "" ? undefined : kind === "test",
      search: q || undefined,
    });
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load orders.";
    orders = [];
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Orders</h1>
        <div className="inline-form">
          <span className="small muted">Signed in as {session.email}</span>
          <LogoutButton />
        </div>
      </div>
      {session.backend === "memory" && (
        <p className="notice notice-warn small" style={{ marginTop: 12 }}>Development mode: these orders are in temporary memory, not Supabase.</p>
      )}
      <PreviewCoverage />
      <form className="card filters" method="get" style={{ marginTop: 16 }} role="search" aria-label="Filter orders">
        <div>
          <label className="field" htmlFor="q">Search</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Reference, name or email" />
        </div>
        <div>
          <label className="field" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status ?? ""}>
            <option value="">All</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="field" htmlFor="kind">Test / live</label>
          <select id="kind" name="kind" defaultValue={kind}>
            <option value="">All</option>
            <option value="test">Test only</option>
            <option value="live">Live only</option>
          </select>
        </div>
        <div>
          <label className="field" htmlFor="email">Email</label>
          <select id="email" name="email" defaultValue={emailStatus ?? ""}>
            <option value="">All</option>
            {EMAIL_STATUSES.map((s) => <option key={s} value={s}>{EMAIL_STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="field" htmlFor="product">Product</label>
          <select id="product" name="product" defaultValue={product ?? ""}>
            <option value="">All</option>
            <option value="bag">Bag</option>
            <option value="scarf">Scarf</option>
          </select>
        </div>
        <button className="btn btn-primary" type="submit">Filter</button>
      </form>
      {loadError && <p className="notice notice-error">{loadError}</p>}
      <p className="small muted" style={{ marginTop: 12 }} aria-live="polite">{orders.length} order{orders.length === 1 ? "" : "s"} shown</p>
      <div className="order-list">
        {orders.map((o) => <OrderCard key={o.id} order={o} ack={ackDraftFor(o)} />)}
      </div>
    </div>
  );
}
