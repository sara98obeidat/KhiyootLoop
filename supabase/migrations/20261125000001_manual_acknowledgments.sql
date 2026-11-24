-- Manual acknowledgments (automatic email switched off).
-- 'manual_pending' = no automatic email; the founder still has to acknowledge.
-- 'manual_sent'    = the founder marked the acknowledgment as sent by hand.
-- Run this in the Supabase SQL editor AFTER the initial schema.
alter type public.email_status add value if not exists 'manual_pending';
alter type public.email_status add value if not exists 'manual_sent';
