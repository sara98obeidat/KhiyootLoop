\set ON_ERROR_STOP 1
-- Fixtures (run as superuser)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000f001', 'founder@example.com'),
  ('00000000-0000-0000-0000-00000000a002', 'stranger@example.com');
insert into public.founders (user_id) values ('00000000-0000-0000-0000-00000000f001');

create function pg_temp.expect_error(sql text, label text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    raise notice 'PASS: % (blocked: %)', label, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % was allowed', label;
end $$;

create function pg_temp.expect(cond boolean, label text) returns void language plpgsql as $$
begin
  if not cond then raise exception 'FAIL: %', label; end if;
  raise notice 'PASS: %', label;
end $$;

-- Service role inserts a test order (this is what the server does).
set role service_role;
insert into public.orders (reference, is_test, mode, customer_name, customer_email, product, size, stitch,
  material, color, tag_material, tag_text, configuration, catalog_version, preview_version, price_jod,
  price_type, pricing_version, idempotency_key, request_hash, access_token_hash)
values ('KL-TEST-AB12-CD34', true, 'test', 'Participant 7', 'p7@example.com', 'bag', 'small', 'single_crochet',
  'cotton_cord_3mm', 'teal', 'leather', 'سارة', '{}', 'c1', 'svg-preview-v1', 63, 'demonstration', 'p1',
  '11111111-1111-1111-1111-111111111111', 'h', 't');
select pg_temp.expect((select check_submission_rate('ip:x', 600, 2)), 'service role can use rate limit (1st)');
select pg_temp.expect((select check_submission_rate('ip:x', 600, 2)), 'rate limit allows 2nd');
select pg_temp.expect(not (select check_submission_rate('ip:x', 600, 2)), 'rate limit blocks 3rd');
select pg_temp.expect((select count(*) from claim_order_email((select id from orders limit 1), 120)) = 1, 'email claim succeeds once');
select pg_temp.expect((select count(*) from claim_order_email((select id from orders limit 1), 120)) = 0, 'second concurrent email claim refused');
reset role;

-- Database constraints
select pg_temp.expect_error($$insert into public.founders (user_id) values ('00000000-0000-0000-0000-00000000a002')$$,
  'second founder account cannot be added');
select pg_temp.expect_error($$insert into public.orders (reference, is_test, mode, customer_name, customer_email, customer_phone, product, size, stitch,
  material, color, tag_material, tag_text, configuration, catalog_version, preview_version, price_jod,
  price_type, pricing_version, idempotency_key, request_hash, access_token_hash)
  values ('KL-TEST-ZZZZ-ZZZZ', true, 'test', 'x', 'x@example.com', '0790000000', 'bag', 'small', 's', 'm', 'c', 'leather', 'a', '{}', 'c', 'p', 63, 'demonstration', 'p',
  '22222222-2222-2222-2222-222222222222', 'h', 't')$$, 'test order cannot store a phone number');
select pg_temp.expect_error($$insert into public.orders (reference, is_test, mode, customer_name, customer_email, product, size, stitch,
  material, color, tag_material, tag_text, configuration, catalog_version, preview_version, price_jod,
  price_type, pricing_version, idempotency_key, request_hash, access_token_hash)
  values ('KL-TEST-YYYY-YYYY', true, 'test', 'x', 'x@example.com', 'bag', 'small', 's', 'm', 'c', 'leather', 'a', '{}', 'c', 'p', 63, 'demonstration', 'p',
  '11111111-1111-1111-1111-111111111111', 'h', 't')$$, 'duplicate idempotency key rejected');

-- Anonymous visitor
set role anon;
select pg_temp.expect_error('select * from public.orders', 'anon cannot read orders');
select pg_temp.expect_error($$insert into public.orders (reference) values ('KL-TEST-AAAA-AAAA')$$, 'anon cannot insert orders');
select pg_temp.expect_error($$update public.orders set status = 'completed'$$, 'anon cannot update orders');
select pg_temp.expect_error('select * from public.founders', 'anon cannot read founders');
select pg_temp.expect_error($$select check_submission_rate('a', 60, 100)$$, 'anon cannot call rate limit function');
select pg_temp.expect_error($$select * from claim_order_email(gen_random_uuid(), 1)$$, 'anon cannot claim email');
reset role;

-- Signed-in user who is NOT the founder
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a002';
select pg_temp.expect((select count(*) from public.orders) = 0, 'non-founder sees zero orders');
select pg_temp.expect(not public.is_founder(), 'non-founder is_founder() is false');
update public.orders set status = 'cancelled';
reset role;
select pg_temp.expect((select status from public.orders limit 1) = 'received', 'non-founder update changed nothing');

-- The founder
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000f001';
select pg_temp.expect(public.is_founder(), 'founder is_founder() is true');
select pg_temp.expect((select count(*) from public.orders) = 1, 'founder can read orders');
update public.orders set status = 'awaiting_confirmation_payment';
select pg_temp.expect((select status from public.orders limit 1) = 'awaiting_confirmation_payment', 'founder can update status');
select pg_temp.expect_error($$update public.orders set price_jod = 1$$, 'founder cannot change saved price');
select pg_temp.expect_error($$update public.orders set tag_text = 'x'$$, 'founder cannot change saved tag text');
select pg_temp.expect_error($$update public.orders set email_status = 'delivered'$$, 'founder cannot fake email status');
select pg_temp.expect_error($$delete from public.orders$$, 'founder cannot delete orders');
select pg_temp.expect_error($$insert into public.founders (user_id) values ('00000000-0000-0000-0000-00000000a002')$$, 'founder cannot add another founder');
reset role;
\echo ALL DATABASE TESTS PASSED
