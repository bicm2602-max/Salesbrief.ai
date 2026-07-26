alter table public.profiles
  alter column plan set default 'free';

create or replace function public.enforce_free_analysis_quota()
returns trigger
language plpgsql
as $$
declare
  v_subscription_status text;
  v_plan text;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_completed_count integer;
begin
  if new.status <> 'completed' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext(new.user_id::text));

  select
    p.stripe_subscription_status,
    p.plan,
    p.stripe_current_period_start,
    p.stripe_current_period_end
  into
    v_subscription_status,
    v_plan,
    v_period_start,
    v_period_end
  from public.profiles as p
  where p.id = new.user_id;

  if v_subscription_status in ('active', 'trialing') and v_period_end > now() then
    if v_plan in ('pro', 'business') then
      return new;
    end if;

    if v_plan = 'starter' then
      select count(*)
      into v_completed_count
      from public.analyses as a
      where a.user_id = new.user_id
        and a.status = 'completed'
        and a.created_at >= coalesce(v_period_start, now())
        and a.created_at <= v_period_end;

      if v_completed_count >= 10 then
        raise exception 'starter_analysis_quota_exceeded' using errcode = 'P0001';
      end if;

      return new;
    end if;
  end if;

  select count(*)
  into v_completed_count
  from public.analyses as a
  where a.user_id = new.user_id
    and a.status = 'completed';

  if v_completed_count >= 3 then
    raise exception 'free_analysis_quota_exceeded' using errcode = 'P0001';
  end if;

  return new;
end;
$$;
