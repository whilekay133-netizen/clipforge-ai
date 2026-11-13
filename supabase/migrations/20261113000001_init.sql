-- ClipForge AI — initial schema
-- Run with: supabase db push   (or paste into the Supabase SQL editor)

create extension if not exists "pgcrypto";

-- =========================================================
-- Enums
-- =========================================================
create type public.user_role as enum ('user', 'admin');
create type public.account_status as enum ('active', 'suspended');
create type public.project_status as enum (
  'draft', 'queued', 'processing', 'generating_script', 'generating_scenes',
  'generating_voiceover', 'assembling_video', 'rendering', 'completed', 'failed', 'cancelled'
);
create type public.creation_mode as enum ('faceless', 'text_to_video', 'image_to_video', 'social', 'storytelling', 'product_ad');
create type public.billing_interval as enum ('month', 'one_time');
create type public.credit_tx_type as enum ('grant', 'purchase', 'reservation', 'debit', 'release', 'refund', 'admin_adjustment');
create type public.payment_status as enum ('pending', 'success', 'failed', 'abandoned');
create type public.subscription_status as enum ('active', 'past_due', 'cancelled', 'expired');

-- =========================================================
-- Helpers
-- =========================================================
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- =========================================================
-- Plans
-- =========================================================
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  price_minor integer not null default 0 check (price_minor >= 0), -- kobo for NGN
  currency text not null default 'NGN',
  billing_interval public.billing_interval not null default 'month',
  monthly_credits integer not null default 0 check (monthly_credits >= 0),
  limits jsonb not null default '{}'::jsonb, -- e.g. {"max_duration_sec":60,"watermark":true,"storage_mb":500}
  features text[] not null default '{}',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger plans_touch before update on public.plans for each row execute function public.touch_updated_at();

-- PLACEHOLDER prices/allowances (PRD §9.3). Update after measuring real provider costs.
insert into public.plans (slug, name, description, price_minor, billing_interval, monthly_credits, limits, features, sort_order) values
('free', 'Free', 'Try ClipForge and make your first videos.', 0, 'month', 100,
  '{"max_duration_sec":30,"watermark":true,"history_days":30,"storage_mb":250}',
  array['100 credits / month','Up to 30-second videos','Faceless & text-to-video','Watermarked exports'], 1),
('creator', 'Creator', 'For individual creators publishing every week.', 1500000, 'month', 800,
  '{"max_duration_sec":120,"watermark":false,"history_days":365,"storage_mb":5000}',
  array['800 credits / month','Up to 2-minute videos','All visual styles','No watermark'], 2),
('pro', 'Pro', 'For power users and daily publishers.', 3500000, 'month', 2000,
  '{"max_duration_sec":180,"watermark":false,"history_days":null,"storage_mb":20000}',
  array['2,000 credits / month','Up to 3-minute videos','Priority queue where supported','20 GB storage'], 3),
('business', 'Business', 'For brands and agencies producing at scale.', 9000000, 'month', 6000,
  '{"max_duration_sec":180,"watermark":false,"history_days":null,"storage_mb":100000}',
  array['6,000 credits / month','Brand assets','Commercial workflows','Team features (coming)'], 4),
('pack-500', '500 credit top-up', 'One-time credit pack. Credits never expire.', 700000, 'one_time', 500, '{}', array['500 credits, one-time'], 10);

-- =========================================================
-- Profiles, wallets, subscriptions
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  avatar_url text,
  role public.user_role not null default 'user',
  account_status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

create table public.credit_wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  available integer not null default 0 check (available >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  updated_at timestamptz not null default now()
);

create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.credit_tx_type not null,
  amount integer not null,
  available_before integer not null,
  available_after integer not null,
  reserved_before integer not null,
  reserved_after integer not null,
  reference text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  unique (reference, type)
);
create index credit_transactions_user_idx on public.credit_transactions (user_id, created_at desc);

-- The ledger is immutable.
create or replace function public.block_ledger_mutation() returns trigger language plpgsql as $$
begin raise exception 'credit_transactions is append-only'; end $$;
create trigger credit_transactions_immutable before update or delete on public.credit_transactions
  for each row execute function public.block_ledger_mutation();

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status public.subscription_status not null default 'active',
  provider text,
  provider_subscription_id text,
  started_at timestamptz not null default now(),
  renews_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index subscriptions_one_active on public.subscriptions (user_id) where status = 'active';
create trigger subscriptions_touch before update on public.subscriptions for each row execute function public.touch_updated_at();

-- =========================================================
-- Projects, generations, scenes, assets
-- =========================================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Untitled video',
  description text not null default '',
  mode public.creation_mode not null default 'faceless',
  category text,
  prompt text not null default '',
  enhanced_prompt text,
  settings jsonb not null default '{}'::jsonb,
  status public.project_status not null default 'draft',
  status_message text,
  script jsonb,                     -- validated Claude output
  subtitles jsonb,                  -- [{start,end,text}]
  thumbnail_path text,
  final_video_path text,
  voiceover_path text,
  duration_sec numeric,
  aspect_ratio text,
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_user_idx on public.projects (user_id, created_at desc);
create index projects_user_status_idx on public.projects (user_id, status);
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  idempotency_key text not null unique,
  status public.project_status not null default 'queued',
  stage text,
  text_provider text, text_model text,
  video_provider text, video_model text,
  voice_provider text, voice_model text,
  render_provider text, render_model text,
  render_request_id text,
  estimated_credits integer not null default 0,
  actual_credits integer,
  estimated_cost_usd numeric(10,4) not null default 0,
  error text,
  attempt integer not null default 1,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index generations_project_idx on public.generations (project_id, created_at desc);
create index generations_status_idx on public.generations (status, created_at desc);
create trigger generations_touch before update on public.generations for each row execute function public.touch_updated_at();

create table public.scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scene_number integer not null,
  script text not null default '',
  visual_prompt text not null default '',
  duration_sec numeric not null default 5,
  status text not null default 'pending', -- pending | submitted | completed | failed
  provider_request_id text,
  asset_path text,
  error text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, scene_number)
);
create trigger scenes_touch before update on public.scenes for each row execute function public.touch_updated_at();

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  asset_type text not null, -- scene_video | voiceover | render | thumbnail | upload | brand_logo
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);
create index assets_user_idx on public.assets (user_id, asset_type);

-- =========================================================
-- Payments, notifications, audit, settings, contact
-- =========================================================
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid references public.plans(id),
  provider text not null default 'paystack',
  reference text not null unique,
  amount_minor integer not null,
  currency text not null,
  status public.payment_status not null default 'pending',
  credits integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index payments_user_idx on public.payments (user_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  action text not null,
  affected_user_id uuid references public.profiles(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (key, value) values
('credit_rates', '{"script":2,"video_clip_5s":10,"voiceover_per_15s":1,"render":3,"hd_multiplier":1}');

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200),
  subject text not null default '' check (char_length(subject) <= 200),
  message text not null check (char_length(message) between 1 and 5000),
  created_at timestamptz not null default now()
);

-- =========================================================
-- New user bootstrap: profile + wallet + free plan credits
-- =========================================================
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_plan public.plans;
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), new.raw_user_meta_data->>'avatar_url');

  select * into v_plan from public.plans where slug = 'free';
  insert into public.credit_wallets (user_id, available) values (new.id, coalesce(v_plan.monthly_credits, 0));
  insert into public.credit_transactions (user_id, type, amount, available_before, available_after, reserved_before, reserved_after, reference, description)
  values (new.id, 'grant', coalesce(v_plan.monthly_credits, 0), 0, coalesce(v_plan.monthly_credits, 0), 0, 0, 'signup:' || new.id, 'Welcome credits (Free plan)');
  if v_plan.id is not null then
    insert into public.subscriptions (user_id, plan_id, status, renews_at) values (new.id, v_plan.id, 'active', now() + interval '30 days');
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- =========================================================
-- Credit operations (atomic, idempotent; callable by service role only)
-- =========================================================

-- Reserve credits for a job. Idempotent per reference.
create or replace function public.reserve_credits(p_user uuid, p_amount integer, p_reference text, p_description text default '')
returns public.credit_wallets language plpgsql security definer set search_path = public as $$
declare w public.credit_wallets;
begin
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;
  select * into w from public.credit_wallets where user_id = p_user for update;
  if not found then raise exception 'wallet not found'; end if;
  if exists (select 1 from public.credit_transactions where reference = p_reference and type = 'reservation') then
    return w; -- already reserved
  end if;
  if w.available < p_amount then raise exception 'INSUFFICIENT_CREDITS'; end if;
  update public.credit_wallets set available = available - p_amount, reserved = reserved + p_amount, updated_at = now()
    where user_id = p_user returning * into w;
  insert into public.credit_transactions (user_id, type, amount, available_before, available_after, reserved_before, reserved_after, reference, description)
  values (p_user, 'reservation', -p_amount, w.available + p_amount, w.available, w.reserved - p_amount, w.reserved, p_reference, p_description);
  return w;
end $$;

-- Settle a reservation: charge p_actual, return the rest. Idempotent per reference.
create or replace function public.settle_credits(p_user uuid, p_reserved integer, p_actual integer, p_reference text, p_description text default '')
returns public.credit_wallets language plpgsql security definer set search_path = public as $$
declare w public.credit_wallets; v_release integer;
begin
  if p_actual < 0 or p_actual > p_reserved then raise exception 'invalid actual amount'; end if;
  select * into w from public.credit_wallets where user_id = p_user for update;
  if exists (select 1 from public.credit_transactions where reference = p_reference and type in ('debit','release')) then
    return w; -- already settled
  end if;
  if w.reserved < p_reserved then raise exception 'reservation mismatch'; end if;
  v_release := p_reserved - p_actual;
  update public.credit_wallets set reserved = reserved - p_reserved, available = available + v_release, updated_at = now()
    where user_id = p_user returning * into w;
  if p_actual > 0 then
    insert into public.credit_transactions (user_id, type, amount, available_before, available_after, reserved_before, reserved_after, reference, description)
    values (p_user, 'debit', -p_actual, w.available - v_release, w.available - v_release, w.reserved + p_reserved, w.reserved + v_release, p_reference, p_description);
  end if;
  insert into public.credit_transactions (user_id, type, amount, available_before, available_after, reserved_before, reserved_after, reference, description)
  values (p_user, 'release', v_release, w.available - v_release, w.available, w.reserved + v_release, w.reserved, p_reference, coalesce(nullif(p_description,''), 'Reservation settled'));
  return w;
end $$;

-- Grant or adjust credits. Idempotent per (reference, type).
create or replace function public.grant_credits(p_user uuid, p_amount integer, p_type public.credit_tx_type, p_reference text, p_description text default '')
returns public.credit_wallets language plpgsql security definer set search_path = public as $$
declare w public.credit_wallets;
begin
  if p_type not in ('grant','purchase','refund','admin_adjustment') then raise exception 'invalid type'; end if;
  select * into w from public.credit_wallets where user_id = p_user for update;
  if not found then raise exception 'wallet not found'; end if;
  if exists (select 1 from public.credit_transactions where reference = p_reference and type = p_type) then return w; end if;
  if w.available + p_amount < 0 then raise exception 'INSUFFICIENT_CREDITS'; end if;
  update public.credit_wallets set available = available + p_amount, updated_at = now() where user_id = p_user returning * into w;
  insert into public.credit_transactions (user_id, type, amount, available_before, available_after, reserved_before, reserved_after, reference, description)
  values (p_user, p_type, p_amount, w.available - p_amount, w.available, w.reserved, w.reserved, p_reference, p_description);
  return w;
end $$;

revoke all on function public.reserve_credits(uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.settle_credits(uuid, integer, integer, text, text) from public, anon, authenticated;
revoke all on function public.grant_credits(uuid, integer, public.credit_tx_type, text, text) from public, anon, authenticated;
grant execute on function public.reserve_credits(uuid, integer, text, text) to service_role;
grant execute on function public.settle_credits(uuid, integer, integer, text, text) to service_role;
grant execute on function public.grant_credits(uuid, integer, public.credit_tx_type, text, text) to service_role;

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.plans enable row level security;
alter table public.profiles enable row level security;
alter table public.credit_wallets enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.projects enable row level security;
alter table public.generations enable row level security;
alter table public.scenes enable row level security;
alter table public.assets enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.app_settings enable row level security;
alter table public.contact_messages enable row level security;

create policy "plans readable" on public.plans for select using (is_active);

create policy "own profile read" on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
-- users may only change these columns directly
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

create policy "own wallet" on public.credit_wallets for select using (auth.uid() = user_id);
create policy "own ledger" on public.credit_transactions for select using (auth.uid() = user_id);
create policy "own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);
create policy "own projects" on public.projects for select using (auth.uid() = user_id);
create policy "own generations" on public.generations for select using (auth.uid() = user_id);
create policy "own scenes" on public.scenes for select using (auth.uid() = user_id);
create policy "own assets" on public.assets for select using (auth.uid() = user_id);
create policy "own payments" on public.payments for select using (auth.uid() = user_id);
create policy "own notifications read" on public.notifications for select using (auth.uid() = user_id);
create policy "own notifications update" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke update on public.notifications from authenticated;
grant update (is_read) on public.notifications to authenticated;
create policy "anyone can send contact" on public.contact_messages for insert to anon, authenticated with check (true);
-- admin_audit_logs, app_settings: no client policies (service role only)

-- =========================================================
-- Storage: private bucket, users read their own folder
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 524288000)
on conflict (id) do nothing;

create policy "users read own media" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = 'users' and (storage.foldername(name))[2] = auth.uid()::text);
