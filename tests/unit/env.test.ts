import { describe, expect, it } from "vitest";
import { normalizeSupabaseUrl } from "@/lib/env";

describe("Supabase URL normalisation", () => {
  it.each([
    ["https://abcd.supabase.co", "https://abcd.supabase.co"],
    ["https://abcd.supabase.co/", "https://abcd.supabase.co"],
    ["https://abcd.supabase.co/rest/v1/", "https://abcd.supabase.co"],
    ["  https://abcd.supabase.co/rest/v1  ", "https://abcd.supabase.co"],
    ['"https://abcd.supabase.co"', "https://abcd.supabase.co"],
    ["", ""],
  ])("%j → %j", (input, expected) => {
    expect(normalizeSupabaseUrl(input)).toBe(expected);
  });
});
