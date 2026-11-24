"use client";
/**
 * Unfinished design kept in the browser (localStorage) so a refresh does not
 * lose it. This is NOT the order database: orders only exist once the server
 * has saved them in Supabase.
 */
import type { ProductConfiguration } from "./configuration";

const KEY = "kl-draft-v1";
const CONTACT_KEY = "kl-contact-v1";

export interface Draft {
  config: ProductConfiguration;
  savedAt: string;
}

export function loadDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    return d && typeof d === "object" && d.config ? d : null;
  } catch {
    return null;
  }
}

export function saveDraft(config: ProductConfiguration) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ config, savedAt: new Date().toISOString() }));
  } catch {
    /* storage unavailable: the design simply is not remembered */
  }
}

export function clearDraft() {
  try {
    window.localStorage.removeItem(KEY);
    window.sessionStorage.removeItem(CONTACT_KEY);
  } catch {
    /* ignore */
  }
}

/** Contact details are kept only for this browser tab (sessionStorage). */
export function loadContact(): Record<string, string> {
  try {
    return JSON.parse(window.sessionStorage.getItem(CONTACT_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveContact(c: Record<string, string>) {
  try {
    window.sessionStorage.setItem(CONTACT_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}
