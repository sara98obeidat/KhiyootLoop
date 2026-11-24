import { z } from "zod";
import { cookies } from "next/headers";
import { supabaseConfigured } from "@/lib/env";
import {
  DEV_FOUNDER_COOKIE,
  devFounderCookieValue,
  devFounderLoginAllowed,
} from "@/lib/founder";
import { getRuntime } from "@/lib/runtime";
import { supabaseForUser } from "@/lib/supabase/server";
import { clientIpFromHeaders, safeEqual, sha256Hex } from "@/lib/security";
import { isSameOrigin, json, readJson } from "@/lib/http/request";

export const dynamic = "force-dynamic";

const LoginSchema = z.object({ email: z.email().max(254), password: z.string().min(1).max(200) }).strict();
const GENERIC = "Email or password is incorrect, or this account is not authorised.";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return json({ ok: false, message: "Cross-site request refused." }, 403);
  const body = await readJson(req);
  if (!body.ok) return json({ ok: false, message: body.message }, body.status);
  const parsed = LoginSchema.safeParse(body.value);
  if (!parsed.success) return json({ ok: false, message: GENERIC }, 400);
  const { email, password } = parsed.data;

  const runtime = getRuntime();
  if (runtime.ok) {
    const allowed = await runtime.store.checkRateLimit(
      `login:${sha256Hex(`${runtime.secret}|${clientIpFromHeaders(req.headers)}`).slice(0, 32)}`,
      900,
      10,
    );
    if (!allowed) return json({ ok: false, message: "Too many sign-in attempts. Please wait 15 minutes." }, 429);
  }

  if (supabaseConfigured()) {
    const db = await supabaseForUser();
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) return json({ ok: false, message: GENERIC }, 401);
    const { data: isFounder } = await db.rpc("is_founder");
    if (isFounder !== true) {
      await db.auth.signOut();
      return json({ ok: false, message: GENERIC }, 403);
    }
    return json({ ok: true });
  }

  if (devFounderLoginAllowed()) {
    const expected = process.env.KL_DEV_FOUNDER_PASSWORD ?? "";
    const devEmail = process.env.KL_DEV_FOUNDER_EMAIL ?? "founder@example.test";
    if (email.toLowerCase() !== devEmail.toLowerCase() || !safeEqual(password, expected)) {
      return json({ ok: false, message: GENERIC }, 401);
    }
    const jar = await cookies();
    jar.set(DEV_FOUNDER_COOKIE, devFounderCookieValue(email.toLowerCase()), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return json({ ok: true });
  }

  return json({ ok: false, message: "Founder sign-in is not set up yet (Supabase is not configured)." }, 503);
}
