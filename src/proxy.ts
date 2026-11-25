import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Keeps the founder's Supabase sign-in fresh on founder pages and API routes.
 * Authorisation itself is checked on the server in every founder page/route
 * and again by row-level security in the database.
 */
export async function proxy(request: NextRequest) {
  const raw = process.env.SUPABASE_URL?.trim();
  let url: string | undefined;
  try {
    url = raw ? new URL(raw).origin : undefined;
  } catch {
    url = undefined;
  }
  const key = process.env.SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/founder/:path*", "/api/founder/:path*"],
};
