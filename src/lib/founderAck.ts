import "server-only";
import { buildAcknowledgmentEmail } from "./email/template";
import { orderLink } from "./orderService";
import type { OrderRecord } from "./orders";
import { getRuntime } from "./runtime";
import type { AckDraft } from "@/components/founder/OrderCard";

/** Prepared acknowledgment text for the founder (used for manual sending). */
export function ackDraftFor(order: OrderRecord): AckDraft {
  const runtime = getRuntime();
  const link = runtime.ok ? orderLink(runtime.siteUrl, order, runtime.secret) : undefined;
  const email = buildAcknowledgmentEmail(order, link);
  return { mode: runtime.ok ? runtime.acknowledgments : "manual", subject: email.subject, text: email.text };
}
