alter table public.analyses add column if not exists ai_provider text;
alter table public.analyses drop constraint if exists analyses_ai_provider_check;
alter table public.analyses add constraint analyses_ai_provider_check check (ai_provider is null or ai_provider in ('openai', 'deepseek', 'kimi'));
create index if not exists analyses_user_id_ai_provider_idx on public.analyses (user_id, ai_provider) where ai_provider is not null;
