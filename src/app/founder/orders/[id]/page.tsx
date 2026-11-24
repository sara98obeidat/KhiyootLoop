import type { Metadata } from "next";
import Link from "next/link";
import { FounderGate } from "@/components/founder/FounderGate";
import { OrderCard } from "@/components/founder/OrderCard";
import { getFounderSession } from "@/lib/founder";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order details", robots: { index: false, follow: false } };

export default async function FounderOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getFounderSession();
  if (!session.ok) return <FounderGate session={session} />;
  const { id } = await params;
  const order = /^[0-9a-f-]{36}$/i.test(id) ? await session.orders.get(id) : null;
  return (
    <div className="stack">
      <Link href="/founder">← All orders</Link>
      {order ? <OrderCard order={order} detailed /> : <p className="notice notice-warn">Order not found.</p>}
    </div>
  );
}
