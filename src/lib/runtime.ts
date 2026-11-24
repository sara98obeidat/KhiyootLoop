import "server-only";
import { currentOrderMode, type OrderMode } from "@/config/site";
import {
  acknowledgmentMode,
  devFakeEmailMode,
  devMemoryBackendEnabled,
  emailConfigured,
  env,
  supabaseConfigured,
} from "./env";
import {
  FakeEmailSender,
  NotConfiguredEmailSender,
  ResendEmailSender,
  type EmailSender,
} from "./email/sender";
import { MemoryOrderStore } from "./store/memoryStore";
import { SupabaseOrderStore } from "./store/supabaseStore";
import type { OrderStore } from "./store/types";
import { supabaseAdmin } from "./supabase/admin";

export type Runtime =
  | {
      ok: true;
      backend: "supabase" | "memory";
      store: OrderStore;
      email: EmailSender;
      mode: OrderMode;
      acknowledgments: "automatic" | "manual";
      secret: string;
      siteUrl?: string;
    }
  | { ok: false; reason: string };

const g = globalThis as unknown as { __klMemoryStore?: MemoryOrderStore; __klFakeEmail?: FakeEmailSender };

export function devMemoryStore(): MemoryOrderStore {
  g.__klMemoryStore ??= new MemoryOrderStore();
  return g.__klMemoryStore;
}

function emailSender(): EmailSender {
  const fake = devFakeEmailMode();
  if (fake) {
    g.__klFakeEmail ??= new FakeEmailSender(fake);
    return g.__klFakeEmail;
  }
  if (emailConfigured()) {
    return new ResendEmailSender(env.resendApiKey, env.emailFrom, env.emailReplyTo || undefined);
  }
  return new NotConfiguredEmailSender();
}

/**
 * Picks the real Supabase backend when it is configured. Otherwise returns a
 * "not configured" result so the site can say so honestly. The in-memory
 * backend is only possible in development with KL_DEV_MEMORY_BACKEND=1.
 */
export function getRuntime(): Runtime {
  const mode = currentOrderMode();
  const siteUrl = env.siteUrl || undefined;
  if (supabaseConfigured()) {
    return {
      ok: true,
      backend: "supabase",
      store: new SupabaseOrderStore(supabaseAdmin()),
      email: emailSender(),
      mode,
      acknowledgments: acknowledgmentMode(),
      secret: env.appSecret,
      siteUrl,
    };
  }
  if (devMemoryBackendEnabled()) {
    return {
      ok: true,
      backend: "memory",
      store: devMemoryStore(),
      email: emailSender(),
      mode,
      acknowledgments: acknowledgmentMode(),
      secret: "development-only-secret-not-for-production-use",
      siteUrl: siteUrl ?? "http://localhost:3000",
    };
  }
  return {
    ok: false,
    reason:
      "Order storage is not configured. Set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY and APP_SECRET (at least 32 characters).",
  };
}
