import "server-only";

export const MAX_BODY_BYTES = 16 * 1024;

/** Rejects cross-site POSTs (basic CSRF protection for cookie-authenticated routes). */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function readJson(req: Request): Promise<{ ok: true; value: unknown } | { ok: false; status: number; message: string }> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    return { ok: false, status: 415, message: "Expected JSON." };
  }
  const length = Number(req.headers.get("content-length") ?? "0");
  if (length > MAX_BODY_BYTES) return { ok: false, status: 413, message: "Request too large." };
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return { ok: false, status: 413, message: "Request too large." };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, message: "Invalid JSON." };
  }
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
