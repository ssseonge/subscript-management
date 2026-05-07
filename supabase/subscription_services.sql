create table if not exists public.subscription_services (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null default 'default',
  name text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'KRW' check (currency in ('KRW', 'JPY', 'USD', 'EUR')),
  cycle text not null default 'monthly' check (cycle in ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_date date not null,
  category text not null default '기타',
  payment_method text not null default '',
  status text not null default 'active' check (status in ('active', 'paused')),
  notes text not null default '',
  scheduler_sync_enabled boolean not null default false,
  scheduler_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscription_services_owner_next_date_idx
  on public.subscription_services (owner_id, next_date);

create index if not exists subscription_services_owner_status_idx
  on public.subscription_services (owner_id, status);

create or replace function public.touch_subscription_services_updated_at()
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
execute function public.touch_subscription_services_updated_at();
