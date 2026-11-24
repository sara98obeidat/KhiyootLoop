-- KhiyootLoop initial schema
-- Orders, the single authorised founder, submission rate limits, and
-- row-level security (RLS). Run this once in the Supabase SQL editor
-- (or with `supabase db push`).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.order_status as enum (
  'received',
  'awaiting_confirmation_payment',
  'confirmed',
  'in_production',
  'ready',
  'completed',
  'cancelled'
);

-- 'accepted' = the email API accepted the message. It is NOT proof of delivery.
-- 'delivered' / 'bounced' / 'delayed' / 'complained' only come from Resend webhooks.
create type public.email_status as enum (
  'pending',
  'sending',
  'accepted',
  'delivered',
  'delayed',
  'bounced',
  'complained',
  'failed',
  'not_configured'
);

-- ---------------------------------------------------------------------------
-- Founder: exactly one explicitly authorised account.
-- The `singleton` primary key means a second row can never be inserted.
-- Signing up does NOT make anyone a founder; the founder row is added by hand.
-- ---------------------------------------------------------------------------
create table public.founders (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^KL-(TEST-)?[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  is_test boolean not null,
  mode text not null check (mode in ('test', 'live')),
  constraint orders_mode_matches_test check ((mode = 'test') = is_test),

  customer_name text not null check (char_length(customer_name) between 1 and 80),
  customer_email text not null check (char_length(customer_email) between 3 and 254),
  customer_phone text check (customer_phone is null or char_length(customer_phone) <= 40),
  delivery_address text check (delivery_address is null or char_length(delivery_address) <= 500),
  customer_notes text check (customer_notes is null or char_length(customer_notes) <= 500),
  -- Classroom test orders never store phone numbers or addresses.
  constraint orders_test_minimal_contact check (
    not is_test or (customer_phone is null and delivery_address is null)
  ),

  product text not null check (product in ('bag', 'scarf')),
  size text not null check (char_length(size) <= 40),
  stitch text not null check (char_length(stitch) <= 40),
  material text not null check (char_length(material) <= 40),
  color text not null check (char_length(color) <= 40),
  tag_material text not null check (tag_material in ('leather', 'metal')),
  tag_text text not null check (char_length(tag_text) between 1 and 48),
  configuration jsonb not null,
  catalog_version text not null,
  preview_version text not null,

  price_jod numeric(10, 3) not null check (price_jod > 0),
  currency text not null default 'JOD' check (currency = 'JOD'),
  price_type text not null check (price_type in ('demonstration', 'variant')),
  pricing_version text not null,

  status public.order_status not null default 'received',

  email_status public.email_status not null default 'pending',
  email_attempts integer not null default 0,
  email_last_attempt_at timestamptz,
  email_provider_id text,
  email_error text,

  idempotency_key uuid not null unique,
  request_hash text not null,
  access_token_hash text not null
);

create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_email_provider_id_idx on public.orders (email_provider_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Rate limiting for the public order endpoint (server-only).
-- ---------------------------------------------------------------------------
create table public.submission_rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);

create index submission_rate_limits_window_idx on public.submission_rate_limits (window_start);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
create or replace function public.is_founder()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.founders f where f.user_id = (select auth.uid())
  );
$$;

create or replace function public.check_submission_rate(
  p_bucket text,
  p_window_seconds integer,
  p_max integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_hits integer;
begin
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.submission_rate_limits as r (bucket, window_start, hits)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- Occasional clean-up of old windows.
  if random() < 0.02 then
    delete from public.submission_rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_hits <= p_max;
end;
$$;

-- Atomically "claims" an order's email so two sends cannot run at once.
create or replace function public.claim_order_email(p_order_id uuid, p_stale_seconds integer)
returns setof public.orders
language sql
security definer
set search_path = ''
as $$
  update public.orders
     set email_status = 'sending',
         email_attempts = email_attempts + 1,
         email_last_attempt_at = now()
   where id = p_order_id
     and (
       email_status <> 'sending'
       or email_last_attempt_at is null
       or email_last_attempt_at < now() - make_interval(secs => p_stale_seconds)
     )
  returning *;
$$;

-- ---------------------------------------------------------------------------
-- Privileges and row-level security
-- Public visitors (anon) get NO access. Order creation happens only in the
-- server with the service-role key, after validation and price calculation.
-- ---------------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.orders force row level security;
alter table public.founders enable row level security;
alter table public.founders force row level security;
alter table public.submission_rate_limits enable row level security;
alter table public.submission_rate_limits force row level security;

revoke all on public.orders from public, anon, authenticated;
revoke all on public.founders from public, anon, authenticated;
revoke all on public.submission_rate_limits from public, anon, authenticated;

-- Signed-in users may read orders and change ONLY the status column,
-- and the policies below limit both to the founder.
grant select on public.orders to authenticated;
grant update (status) on public.orders to authenticated;
grant select on public.founders to authenticated;

create policy "Founder can read orders"
  on public.orders for select
  to authenticated
  using ((select public.is_founder()));

create policy "Founder can update order status"
  on public.orders for update
  to authenticated
  using ((select public.is_founder()))
  with check ((select public.is_founder()));

create policy "Founder can see own founder row"
  on public.founders for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on function public.is_founder() from public, anon;
grant execute on function public.is_founder() to authenticated;

revoke all on function public.check_submission_rate(text, integer, integer) from public, anon, authenticated;
revoke all on function public.claim_order_email(uuid, integer) from public, anon, authenticated;
grant execute on function public.check_submission_rate(text, integer, integer) to service_role;
grant execute on function public.claim_order_email(uuid, integer) to service_role;

grant all on public.orders to service_role;
grant all on public.founders to service_role;
grant all on public.submission_rate_limits to service_role;
