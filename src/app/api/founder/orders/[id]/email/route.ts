import { z } from "zod";
import { sendAcknowledgment } from "@/lib/orderService";
import { getRuntime } from "@/lib/runtime";
import { requireFounder } from "@/lib/http/founderGuard";
import { json } from "@/lib/http/request";

/**
 * Founder-only: (re)send the acknowledgment email for an EXISTING order.
 * Never creates an order. A database lock prevents two sends at once.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireFounder(req, { mutating: true });
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return json({ ok: false, message: "Unknown order." }, 404);
  // Confirm the founder can see this order through row-level security first.
  const visible = await guard.session.orders.get(id);
  if (!visible) return json({ ok: false, message: "Unknown order." }, 404);
  const runtime = getRuntime();
  if (!runtime.ok) return json({ ok: false, message: runtime.reason }, 503);
  if (runtime.acknowledgments === "manual") {
    return json({ ok: false, message: "Automatic email is switched off. Send the acknowledgment by hand and mark it as sent." }, 409);
  }
  try {
    const status = await sendAcknowledgment(visible, runtime);
    if (status === "sending") {
      return json({ ok: false, emailStatus: status, message: "An email for this order is already being sent. Wait a minute and refresh." }, 409);
    }
    return json({ ok: status === "accepted", emailStatus: status });
  } catch (e) {
    console.error("[founder] resend failed:", e instanceof Error ? e.message : e);
    return json({ ok: false, message: "Could not send the email. Please try again." }, 500);
  }
}
