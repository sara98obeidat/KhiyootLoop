import "server-only";
import { getFounderSession, type FounderSession } from "../founder";
import { isSameOrigin, json } from "./request";

/**
 * Server-side authorisation for founder API routes. Returns either the
 * founder session or a ready-made error response.
 */
export async function requireFounder(
  req: Request,
  opts: { mutating: boolean },
): Promise<{ ok: true; session: Extract<FounderSession, { ok: true }> } | { ok: false; response: Response }> {
  if (opts.mutating && !isSameOrigin(req)) {
    return { ok: false, response: json({ ok: false, code: "forbidden", message: "Cross-site request refused." }, 403) };
  }
  const session = await getFounderSession();
  if (!session.ok) {
    const status = session.reason === "not_founder" ? 403 : 401;
    return {
      ok: false,
      response: json({ ok: false, code: session.reason, message: "Founder sign-in required." }, status),
    };
  }
  return { ok: true, session };
}
