create table if not exists public.subscription_services (
  id text primary key,
  owner_id text not null default 'default',
  name text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'KRW' check (currency in ('KRW', 'JPY', 'USD', 'EUR')),
  actual_krw_amount numeric(12, 0) check (actual_krw_amount is null or actual_krw_amount >= 0),
  cycle text not null default 'monthly' check (cycle in ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_date date not null,
  category text not null default '기타',
  payment_method text not null default '카드결제',
  status text not null default 'active' check (status in ('active', 'paused', 'canceled')),
  scheduler_sync_enabled boolean not null default false,
  scheduler_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscription_services
  add column if not exists actual_krw_amount numeric(12, 0) check (actual_krw_amount is null or actual_krw_amount >= 0);

create table if not exists public.subscription_app_settings (
  owner_id text primary key default 'default',
  service_names jsonb not null default '["ChatGPT", "CapCut", "Vrew"]'::jsonb,
  payment_methods jsonb not null default '["카드결제", "앱스토어", "휴대폰"]'::jsonb,
  categories jsonb not null default '["AI/업무", "영상/편집", "영상/음악", "디자인", "쇼핑", "서버/도메인", "생활", "기타"]'::jsonb,
  notifications_enabled boolean not null default false,
  theme text not null default 'light' check (theme in ('light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscription_app_settings
  add column if not exists service_names jsonb not null default '["ChatGPT", "CapCut", "Vrew"]'::jsonb;

create index if not exists subscription_services_owner_next_date_idx
  on public.subscription_services (owner_id, next_date);

create index if not exists subscription_services_owner_status_idx
  on public.subscription_services (owner_id, status);

create or replace function public.touch_subscription_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscription_services_touch_updated_at on public.subscription_services;

create trigger subscription_services_touch_updated_at
before update on public.subscription_services
for each row
execute function public.touch_subscription_updated_at();

drop trigger if exists subscription_app_settings_touch_updated_at on public.subscription_app_settings;

create trigger subscription_app_settings_touch_updated_at
before update on public.subscription_app_settings
for each row
execute function public.touch_subscription_updated_at();
