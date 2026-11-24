import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function hmacHex(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value, "utf8").digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Stable JSON (sorted keys) so the same request always hashes the same. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
    .join(",")}}`;
}

// No 0/O/1/I to avoid misreading references aloud or on paper.
const REF_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** e.g. KL-TEST-7F3K-9QXM (test) or KL-7F3K-9QXM (live). */
export function generateOrderReference(isTest: boolean): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `KL-${isTest ? "TEST-" : ""}${s.slice(0, 4)}-${s.slice(4)}`;
}

export const REFERENCE_PATTERN = /^KL-(TEST-)?[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/** Secret link token for the customer's acknowledgment page. */
export function orderAccessToken(secret: string, idempotencyKey: string): string {
  return hmacHex(secret, `order-access:${idempotencyKey}`).slice(0, 40);
}

export function clientIpFromHeaders(headers: Headers): string {
  // On Vercel, x-forwarded-for is set by the platform; take the first address.
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}
