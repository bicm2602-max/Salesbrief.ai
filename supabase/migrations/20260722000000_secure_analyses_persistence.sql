alter table public.analyses
  add column if not exists status text not null default 'completed';

alter table public.analyses
  alter column created_at set default timezone('utc', now());

create unique index if not exists analyses_user_id_website_key
  on public.analyses (user_id, website);

alter table public.analyses enable row level security;

drop policy if exists "Users can read their own analyses" on public.analyses;
create policy "Users can read their own analyses"
  on public.analyses
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own analyses" on public.analyses;
create policy "Users can insert their own analyses"
  on public.analyses
  for insert
  with check (auth.uid() = user_id);
