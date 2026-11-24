import { Resend } from "resend";
import type { EmailContent } from "./template";

export type SendResult =
  | { ok: true; providerId: string }
  | { ok: false; error: string; notConfigured?: boolean };

export interface EmailSender {
  configured: boolean;
  send(to: string, content: EmailContent, idempotencyKey: string, tags?: Record<string, string>): Promise<SendResult>;
}

export class ResendEmailSender implements EmailSender {
  configured = true;
  private client: Resend;
  constructor(
    apiKey: string,
    private from: string,
    private replyTo?: string,
  ) {
    this.client = new Resend(apiKey);
  }

  async send(to: string, content: EmailContent, idempotencyKey: string, tags?: Record<string, string>) {
    try {
      const { data, error } = await this.client.emails.send(
        {
          from: this.from,
          to: [to],
          subject: content.subject,
          html: content.html,
          text: content.text,
          ...(this.replyTo ? { replyTo: this.replyTo } : {}),
          ...(tags
            ? { tags: Object.entries(tags).map(([name, value]) => ({ name, value })) }
            : {}),
        },
        { idempotencyKey },
      );
      if (error || !data?.id) {
        return { ok: false as const, error: error?.message ?? "Email service returned no id" };
      }
      return { ok: true as const, providerId: data.id };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Email request failed" };
    }
  }
}

export class NotConfiguredEmailSender implements EmailSender {
  configured = false;
  async send(): Promise<SendResult> {
    return { ok: false, error: "Email service is not configured", notConfigured: true };
  }
}

/** Test double. Records messages; can be told to fail. */
export class FakeEmailSender implements EmailSender {
  configured = true;
  sent: { to: string; content: EmailContent; idempotencyKey: string }[] = [];
  constructor(public mode: "accept" | "fail" = "accept") {}
  async send(to: string, content: EmailContent, idempotencyKey: string): Promise<SendResult> {
    if (this.mode === "fail") return { ok: false, error: "Simulated email failure" };
    this.sent.push({ to, content, idempotencyKey });
    return { ok: true, providerId: `fake_${this.sent.length}_${idempotencyKey.slice(-8)}` };
  }
}
