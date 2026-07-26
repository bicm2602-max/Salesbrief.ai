alter table public.analyses
  add column if not exists is_favorite boolean not null default false;

create index if not exists analyses_user_id_is_favorite_created_at_idx
  on public.analyses (user_id, is_favorite, created_at desc);

drop policy if exists "Users can update their own analyses" on public.analyses;
create policy "Users can update their own analyses"
  on public.analyses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
