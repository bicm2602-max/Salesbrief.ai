alter table public.profiles
  add column if not exists stripe_price_id text,
  add column if not exists subscription_plan text not null default 'free',
  add column if not exists stripe_current_period_start timestamptz,
  add column if not exists stripe_cancel_at_period_end boolean not null default false;
