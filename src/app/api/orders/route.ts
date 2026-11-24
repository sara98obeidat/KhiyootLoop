import { submitOrder } from "@/lib/orderService";
import { getRuntime } from "@/lib/runtime";
import { clientIpFromHeaders } from "@/lib/security";
import { isSameOrigin, json, readJson } from "@/lib/http/request";

export const dynamic = "force-dynamic";

/** Public order submission endpoint. Creates an order exactly once per idempotency key. */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return json({ ok: false, code: "forbidden", message: "Requests must come from this website." }, 403);
  }
  const runtime = getRuntime();
  if (!runtime.ok) {
    console.error("[orders] not configured:", runtime.reason);
    return json(
      { ok: false, code: "not_configured", message: "Ordering is not available right now because the order database is not set up. Nothing was saved." },
      503,
    );
  }
  const body = await readJson(req);
  if (!body.ok) return json({ ok: false, code: "bad_request", message: body.message }, body.status);
  try {
    const result = await submitOrder(body.value, {
      store: runtime.store,
      email: runtime.email,
      mode: runtime.mode,
      secret: runtime.secret,
      siteUrl: runtime.siteUrl,
      acknowledgments: runtime.acknowledgments,
      clientId: clientIpFromHeaders(req.headers),
    });
    return json(result.body, result.status);
  } catch (e) {
    console.error("[orders] submission failed:", e instanceof Error ? e.message : e);
    return json(
      { ok: false, code: "server_error", message: "We could not confirm that your order was saved because of a server problem. Please press the button again: the same order will not be created twice." },
      500,
    );
  }
}

export function GET() {
  return json({ ok: false, code: "method_not_allowed", message: "Orders cannot be listed here." }, 405);
}
