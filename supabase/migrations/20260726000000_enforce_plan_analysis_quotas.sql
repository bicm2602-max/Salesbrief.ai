create or replace function public.enforce_free_analysis_quota()
returns trigger
language plpgsql
as $$
declare
  subscription_status text;
  subscription_plan text;
  period_start timestamptz;
  period_end timestamptz;
  completed_count integer;
begin
  if new.status <> 'completed' then return new; end if;
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));
  select stripe_subscription_status, subscription_plan, stripe_current_period_start, stripe_current_period_end
    into subscription_status, subscription_plan, period_start, period_end
    from public.profiles where id = new.user_id;
  if subscription_status in ('active', 'trialing') and period_end > now() then
    if subscription_plan in ('pro', 'business') then return new; end if;
    if subscription_plan = 'starter' then
      select count(*) into completed_count from public.analyses
        where user_id = new.user_id and status = 'completed'
          and created_at >= coalesce(period_start, now()) and created_at <= period_end;
      if completed_count >= 10 then raise exception 'starter_analysis_quota_exceeded' using errcode = 'P0001'; end if;
      return new;
    end if;
  end if;
  select count(*) into completed_count from public.analyses where user_id = new.user_id and status = 'completed';
  if completed_count >= 3 then raise exception 'free_analysis_quota_exceeded' using errcode = 'P0001'; end if;
  return new;
end;
$$;
