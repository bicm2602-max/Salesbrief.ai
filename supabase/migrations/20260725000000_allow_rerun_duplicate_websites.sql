drop index if exists public.analyses_user_id_website_key;

create index if not exists analyses_user_id_website_idx
  on public.analyses (user_id, website);
