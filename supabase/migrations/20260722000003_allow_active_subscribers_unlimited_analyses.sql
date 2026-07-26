create or replace function public.enforce_free_analysis_quota()
returns trigger
language plpgsql
as $$
declare
  has_paid_access boolean;
begin
  if new.status = 'completed' then
    perform pg_advisory_xact_lock(hashtext(new.user_id::text));

    select stripe_subscription_status = 'active'
      and stripe_current_period_end > now()
    into has_paid_access
    from public.profiles
    where id = new.user_id;

    if not coalesce(has_paid_access, false) and (
      select count(*)
      from public.analyses
      where user_id = new.user_id
        and status = 'completed'
    ) >= 3 then
      raise exception 'free_analysis_quota_exceeded' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;
