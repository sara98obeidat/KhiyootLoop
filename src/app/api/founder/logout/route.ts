import { cookies } from "next/headers";
import { supabaseConfigured } from "@/lib/env";
import { DEV_FOUNDER_COOKIE } from "@/lib/founder";
import { supabaseForUser } from "@/lib/supabase/server";
import { isSameOrigin, json } from "@/lib/http/request";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return json({ ok: false }, 403);
  if (supabaseConfigured()) {
    const db = await supabaseForUser();
    await db.auth.signOut();
  }
  (await cookies()).delete(DEV_FOUNDER_COOKIE);
  return json({ ok: true });
}
