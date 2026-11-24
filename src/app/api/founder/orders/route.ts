import { EMAIL_STATUSES, isOrderStatus, type EmailStatus } from "@/lib/orders";
import { requireFounder } from "@/lib/http/founderGuard";
import { json } from "@/lib/http/request";

export const dynamic = "force-dynamic";

/** Founder-only order list (JSON). Anonymous callers get 401. */
export async function GET(req: Request) {
  const guard = await requireFounder(req, { mutating: false });
  if (!guard.ok) return guard.response;
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const email = url.searchParams.get("email");
  const orders = await guard.session.orders.list({
    status: isOrderStatus(status) ? status : undefined,
    emailStatus: (EMAIL_STATUSES as readonly string[]).includes(email ?? "") ? (email as EmailStatus) : undefined,
    search: url.searchParams.get("q") ?? undefined,
  });
  return json({ ok: true, orders });
}
