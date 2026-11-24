import { z } from "zod";
import { ORDER_STATUSES } from "@/lib/orders";
import { requireFounder } from "@/lib/http/founderGuard";
import { json, readJson } from "@/lib/http/request";

const Body = z.object({ status: z.enum(ORDER_STATUSES) }).strict();

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireFounder(req, { mutating: true });
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return json({ ok: false, message: "Unknown order." }, 404);
  const body = await readJson(req);
  if (!body.ok) return json({ ok: false, message: body.message }, body.status);
  const parsed = Body.safeParse(body.value);
  if (!parsed.success) return json({ ok: false, message: "Unknown status." }, 400);
  const order = await guard.session.orders.updateStatus(id, parsed.data.status);
  if (!order) return json({ ok: false, message: "Unknown order." }, 404);
  return json({ ok: true, status: order.status });
}
