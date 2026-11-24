/**
 * Tag text rules (shared by the browser and the server).
 *
 * - One line, 1 to 12 visible characters including spaces (provisional limit).
 * - Arabic and English (Latin) letters, digits, spaces and . - ' &
 * - No invisible direction-control characters, line breaks or emoji, because
 *   these cannot be engraved reliably and can disguise the real text.
 * - The text is stored exactly as reviewed (after Unicode NFC normalisation).
 */

export const TAG_MAX_VISIBLE_CHARS = 12;

// Letters from the Latin or Arabic scripts, combining marks used with them,
// ASCII + Arabic-Indic digits, normal space and a few punctuation marks.
const ALLOWED_CHAR = /^[\p{Script=Latin}\p{Script=Arabic}\p{Mn}0-9 .\-'&]$/u;
const ARABIC_CHAR = /\p{Script=Arabic}/u;
const LATIN_CHAR = /\p{Script=Latin}/u;

export type TagTextError =
  | "required"
  | "too_long"
  | "invalid_characters"
  | "leading_or_trailing_space"
  | "not_a_string";

export interface TagTextResult {
  ok: boolean;
  value: string;
  visibleLength: number;
  error?: TagTextError;
  invalidChars?: string[];
}

function graphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(seg.segment(text), (s) => s.segment);
  }
  // Fallback: attach combining marks to the previous character.
  const out: string[] = [];
  for (const c of text) {
    if (/\p{Mn}/u.test(c) && out.length > 0) out[out.length - 1] += c;
    else out.push(c);
  }
  return out;
}

export function countVisibleCharacters(text: string): number {
  return graphemes(text).length;
}

export function normalizeTagText(raw: string): string {
  return raw.normalize("NFC");
}

export function validateTagText(raw: unknown): TagTextResult {
  if (typeof raw !== "string") {
    return { ok: false, value: "", visibleLength: 0, error: "not_a_string" };
  }
  const value = normalizeTagText(raw);
  const visibleLength = countVisibleCharacters(value);

  if (value.trim().length === 0) {
    return { ok: false, value, visibleLength, error: "required" };
  }
  const invalidChars = Array.from(new Set(Array.from(value).filter((c) => !ALLOWED_CHAR.test(c))));
  if (invalidChars.length > 0) {
    return { ok: false, value, visibleLength, error: "invalid_characters", invalidChars };
  }
  if (graphemes(value).some((g) => Array.from(g).length > 3)) {
    // Stacks of accent marks on one letter cannot be engraved.
    return { ok: false, value, visibleLength, error: "invalid_characters", invalidChars: [] };
  }
  if (value !== value.trim()) {
    return { ok: false, value, visibleLength, error: "leading_or_trailing_space" };
  }
  if (visibleLength > TAG_MAX_VISIBLE_CHARS) {
    return { ok: false, value, visibleLength, error: "too_long" };
  }
  return { ok: true, value, visibleLength };
}

export function tagTextErrorMessage(result: TagTextResult): string | null {
  switch (result.error) {
    case undefined:
      return null;
    case "required":
      return "Please enter the text for your tag.";
    case "too_long":
      return `Tag text can have at most ${TAG_MAX_VISIBLE_CHARS} characters, including spaces (you have ${result.visibleLength}).`;
    case "invalid_characters":
      return "Please use only Arabic or English letters, numbers, spaces and . - ' &";
    case "leading_or_trailing_space":
      return "Please remove spaces at the start or end of the tag text.";
    case "not_a_string":
      return "Tag text is missing.";
  }
}

/** Direction for display: right-to-left when the first letter is Arabic. */
export function textDirection(text: string): "rtl" | "ltr" {
  for (const ch of text) {
    if (ARABIC_CHAR.test(ch)) return "rtl";
    if (LATIN_CHAR.test(ch)) return "ltr";
  }
  return "ltr";
}

export function containsArabic(text: string): boolean {
  return ARABIC_CHAR.test(text);
}
