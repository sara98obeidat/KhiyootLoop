import { z } from "zod";
import { getRuntime } from "@/lib/runtime";
import { requireFounder } from "@/lib/http/founderGuard";
import { json } from "@/lib/http/request";

/** Founder-only: record that the acknowledgment was sent by hand. Never creates an order. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireFounder(req, { mutating: true });
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return json({ ok: false, message: "Unknown order." }, 404);
  const visible = await guard.session.orders.get(id); // row-level security check
  if (!visible) return json({ ok: false, message: "Unknown order." }, 404);
  const runtime = getRuntime();
  if (!runtime.ok) return json({ ok: false, message: runtime.reason }, 503);
  const updated = await runtime.store.markManuallyAcknowledged(id);
  if (!updated) {
    return json({ ok: false, message: "This order is already acknowledged or an email is being sent." }, 409);
  }
  return json({ ok: true, emailStatus: updated.emailStatus });
}
