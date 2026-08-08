-- Reserve analysis capacity before an OpenAI request. The advisory lock makes
-- concurrent requests for the same user serializable at the quota boundary.
create or replace function public.enforce_free_analysis_quota()
returns trigger
language plpgsql
as $$
declare
  v_subscription_status text;
  v_plan text;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_analysis_count integer;
begin
  if tg_op = 'UPDATE' or new.status not in ('processing', 'completed') then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext(new.user_id::text));

  select p.stripe_subscription_status, p.plan, p.stripe_current_period_start, p.stripe_current_period_end
    into v_subscription_status, v_plan, v_period_start, v_period_end
  from public.profiles as p
  where p.id = new.user_id;

  if v_subscription_status in ('active', 'trialing') and v_period_end > now() then
    if v_plan in ('pro', 'business') then
      return new;
    end if;

    if v_plan = 'starter' then
      select count(*) into v_analysis_count
      from public.analyses as a
      where a.user_id = new.user_id
        and a.status in ('processing', 'completed')
        and a.created_at >= coalesce(v_period_start, now())
        and a.created_at <= v_period_end;

      if v_analysis_count >= 10 then
        raise exception 'starter_analysis_quota_exceeded' using errcode = 'P0001';
      end if;
      return new;
    end if;
  end if;

  select count(*) into v_analysis_count
  from public.analyses as a
  where a.user_id = new.user_id
    and a.status in ('processing', 'completed');

  if v_analysis_count >= 3 then
    raise exception 'free_analysis_quota_exceeded' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop policy if exists "Users can update their own analyses" on public.analyses;
create policy "Users can update their own analyses"
  on public.analyses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own processing analyses" on public.analyses;
create policy "Users can delete their own processing analyses"
  on public.analyses for delete
  using (auth.uid() = user_id and status = 'processing');

create table if not exists public.analysis_assistant_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  status text not null default 'reserved' check (status in ('reserved', 'completed')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists analysis_assistant_usage_user_analysis_idx
  on public.analysis_assistant_usage (user_id, analysis_id, created_at);

alter table public.analysis_assistant_usage enable row level security;

drop policy if exists "Users can read their own assistant usage" on public.analysis_assistant_usage;
create policy "Users can read their own assistant usage"
  on public.analysis_assistant_usage for select using (auth.uid() = user_id);

drop policy if exists "Users can reserve their own assistant usage" on public.analysis_assistant_usage;
create policy "Users can reserve their own assistant usage"
  on public.analysis_assistant_usage for insert with check (auth.uid() = user_id);

drop policy if exists "Users can complete their own assistant usage" on public.analysis_assistant_usage;
create policy "Users can complete their own assistant usage"
  on public.analysis_assistant_usage for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can release their own assistant usage" on public.analysis_assistant_usage;
create policy "Users can release their own assistant usage"
  on public.analysis_assistant_usage for delete using (auth.uid() = user_id and status = 'reserved');

create or replace function public.enforce_starter_assistant_quota()
returns trigger
language plpgsql
as $$
declare
  v_plan text;
  v_subscription_status text;
  v_period_end timestamptz;
  v_question_count integer;
begin
  perform pg_advisory_xact_lock(hashtext(new.user_id::text || ':' || new.analysis_id::text));

  if not exists (
    select 1 from public.analyses as a
    where a.id = new.analysis_id and a.user_id = new.user_id and a.status = 'completed'
  ) then
    raise exception 'analysis_not_owned' using errcode = 'P0001';
  end if;

  select p.plan, p.stripe_subscription_status, p.stripe_current_period_end
    into v_plan, v_subscription_status, v_period_end
  from public.profiles as p where p.id = new.user_id;

  if v_plan = 'pro' and v_subscription_status in ('active', 'trialing') and v_period_end > now() then
    return new;
  end if;

  if v_plan <> 'starter' or v_subscription_status not in ('active', 'trialing') or v_period_end <= now() then
    raise exception 'ask_salesbrief_not_available' using errcode = 'P0001';
  end if;

  select count(*) into v_question_count
  from public.analysis_assistant_usage as u
  where u.user_id = new.user_id and u.analysis_id = new.analysis_id and u.status in ('reserved', 'completed');

  if v_question_count >= 10 then
    raise exception 'starter_ask_salesbrief_quota_exceeded' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_starter_assistant_quota on public.analysis_assistant_usage;
create trigger enforce_starter_assistant_quota
  before insert on public.analysis_assistant_usage
  for each row execute function public.enforce_starter_assistant_quota();
