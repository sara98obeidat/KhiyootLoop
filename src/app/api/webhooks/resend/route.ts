import { Resend } from "resend";
import { env } from "@/lib/env";
import { getRuntime } from "@/lib/runtime";
import type { EmailStatus } from "@/lib/orders";
import { json } from "@/lib/http/request";

export const dynamic = "force-dynamic";

const EVENT_TO_STATUS: Record<string, EmailStatus> = {
  "email.delivered": "delivered",
  "email.delivery_delayed": "delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
};

/**
 * Optional: Resend calls this when an email is delivered, bounces, etc.
 * Only signed requests (RESEND_WEBHOOK_SECRET) are accepted. This is the only
 * way an order's email status can become "delivered".
 */
export async function POST(req: Request) {
  if (!env.resendWebhookSecret || !env.resendApiKey) {
    return json({ ok: false, message: "Webhook not configured." }, 503);
  }
  const payload = await req.text();
  if (payload.length > 64 * 1024) return json({ ok: false }, 413);
  let event: { type?: string; data?: { email_id?: string } };
  try {
    event = new Resend(env.resendApiKey).webhooks.verify({
      payload,
      headers: {
        id: req.headers.get("svix-id") ?? "",
        timestamp: req.headers.get("svix-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? "",
      },
      webhookSecret: env.resendWebhookSecret,
    }) as typeof event;
  } catch {
    return json({ ok: false, message: "Invalid signature." }, 401);
  }
  const status = event.type ? EVENT_TO_STATUS[event.type] : undefined;
  const id = event.data?.email_id;
  if (!status || !id) return json({ ok: true, ignored: true });
  const runtime = getRuntime();
  if (!runtime.ok) return json({ ok: false }, 503);
  await runtime.store.updateEmailStatusByProviderId(id, status);
  return json({ ok: true });
}
