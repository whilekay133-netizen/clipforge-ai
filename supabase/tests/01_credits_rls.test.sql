\set ON_ERROR_STOP 1
insert into auth.users (id, email, raw_user_meta_data) values
 ('aaaaaaaa-0000-0000-0000-000000000001','a@x.com','{"full_name":"Alice"}'),
 ('bbbbbbbb-0000-0000-0000-000000000002','b@x.com','{"full_name":"Bob"}');
do $$ begin
  assert (select available from credit_wallets where user_id='aaaaaaaa-0000-0000-0000-000000000001') = 100, 'signup credits';
  assert (select count(*) from subscriptions where status='active') = 2, 'free subs';
  assert (select count(*) from credit_transactions where type='grant') = 2, 'signup ledger';
end $$;
insert into projects (user_id, title) values ('aaaaaaaa-0000-0000-0000-000000000001','A video'), ('bbbbbbbb-0000-0000-0000-000000000002','B video');

-- ===== RLS as Alice =====
set role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000001', false);
do $$ begin
  assert (select count(*) from projects) = 1, 'alice sees only her project';
  assert (select title from projects) = 'A video', 'own project';
  assert (select count(*) from credit_wallets) = 1, 'own wallet only';
  assert (select count(*) from profiles) = 1, 'own profile only';
  assert (select count(*) from plans) = 5, 'plans public';
end $$;
update profiles set full_name = 'Alice Z' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
update projects set title = 'hacked' where user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
do $$ begin
  begin update profiles set role = 'admin' where id = auth.uid(); raise exception 'role escalation allowed!'; exception when insufficient_privilege then null; end;
  begin insert into projects (user_id) values (auth.uid()); raise exception 'client insert allowed!'; exception when insufficient_privilege then null; end;
  begin perform reserve_credits(auth.uid(), 1, 'x', ''); raise exception 'client rpc allowed!'; exception when insufficient_privilege then null; end;
  begin update credit_wallets set available = 99999; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  assert (select full_name from profiles where id='aaaaaaaa-0000-0000-0000-000000000001') = 'Alice Z', 'name update ok';
  assert (select role from profiles where id='aaaaaaaa-0000-0000-0000-000000000001') = 'user', 'role unchanged';
  assert (select title from projects where user_id='bbbbbbbb-0000-0000-0000-000000000002') = 'B video', 'cannot touch other user';
  assert (select available from credit_wallets where user_id='aaaaaaaa-0000-0000-0000-000000000001') = 100, 'wallet untouched';
end $$;

-- ===== Credit lifecycle (service role) =====
set role service_role;
select reserve_credits('aaaaaaaa-0000-0000-0000-000000000001', 60, 'gen:1', 'r');
select reserve_credits('aaaaaaaa-0000-0000-0000-000000000001', 60, 'gen:1', 'r'); -- duplicate: no-op
do $$ begin
  assert (select available from credit_wallets where user_id='aaaaaaaa-0000-0000-0000-000000000001') = 40, 'reserved once';
  assert (select reserved from credit_wallets where user_id='aaaaaaaa-0000-0000-0000-000000000001') = 60, 'reserved 60';
  begin perform reserve_credits('aaaaaaaa-0000-0000-0000-000000000001', 50, 'gen:2', ''); raise exception 'overdraw allowed'; exception when others then if sqlerrm not like '%INSUFFICIENT%' then raise; end if; end;
end $$;
select settle_credits('aaaaaaaa-0000-0000-0000-000000000001', 60, 55, 'gen:1', 'done');
select settle_credits('aaaaaaaa-0000-0000-0000-000000000001', 60, 55, 'gen:1', 'done'); -- duplicate webhook/step: no-op
do $$ begin
  assert (select available from credit_wallets where user_id='aaaaaaaa-0000-0000-0000-000000000001') = 45, 'charged 55, released 5';
  assert (select reserved from credit_wallets where user_id='aaaaaaaa-0000-0000-0000-000000000001') = 0, 'reservation cleared';
end $$;
select reserve_credits('aaaaaaaa-0000-0000-0000-000000000001', 30, 'gen:3', '');
select settle_credits('aaaaaaaa-0000-0000-0000-000000000001', 30, 0, 'gen:3', 'refund failed');
select grant_credits('aaaaaaaa-0000-0000-0000-000000000001', 500, 'purchase', 'payment:ref1', 'buy');
select grant_credits('aaaaaaaa-0000-0000-0000-000000000001', 500, 'purchase', 'payment:ref1', 'buy'); -- duplicate webhook
do $$ begin
  assert (select available from credit_wallets where user_id='aaaaaaaa-0000-0000-0000-000000000001') = 545, 'refund + single purchase';
  assert (select available from credit_wallets where user_id='bbbbbbbb-0000-0000-0000-000000000002') = 100, 'bob untouched';
  begin perform grant_credits('aaaaaaaa-0000-0000-0000-000000000001', -10000, 'admin_adjustment', 'adm:1', ''); raise exception 'negative allowed'; exception when others then if sqlerrm not like '%INSUFFICIENT%' then raise; end if; end;
  -- ledger consistency: running sum of available deltas equals balance
  assert (select sum(available_after - available_before) from credit_transactions where user_id='aaaaaaaa-0000-0000-0000-000000000001') = 545, 'ledger reconciles';
end $$;
reset role;
do $$ begin
  begin update credit_transactions set amount = 0; raise exception 'ledger mutable'; exception when others then if sqlerrm not like '%append-only%' then raise; end if; end;
end $$;
select 'ALL DB ASSERTIONS PASSED';
