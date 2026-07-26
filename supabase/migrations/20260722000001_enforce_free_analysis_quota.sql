create or replace function public.enforce_free_analysis_quota()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'completed' then
    perform pg_advisory_xact_lock(hashtext(new.user_id::text));

    if (
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

drop trigger if exists enforce_free_analysis_quota on public.analyses;
create trigger enforce_free_analysis_quota
  before insert on public.analyses
  for each row
  execute function public.enforce_free_analysis_quota();
