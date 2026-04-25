-- Promt Markt — migration 002: favorites
-- Run this once in Supabase: SQL Editor → New query → paste → Run.
-- Idempotent: safe to re-run.

-- ============================================================
-- FAVORITES table
-- ============================================================
create table if not exists public.favorites (
  user_id uuid not null references public.users(id) on delete cascade,
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, prompt_id)
);

create index if not exists favorites_prompt_idx on public.favorites (prompt_id);
create index if not exists favorites_user_idx on public.favorites (user_id);

-- ============================================================
-- favorite_count column on prompts
-- ============================================================
alter table public.prompts
  add column if not exists favorite_count integer not null default 0;

-- Backfill existing counts so the column matches reality on first run.
update public.prompts p
set favorite_count = coalesce(sub.c, 0)
from (
  select prompt_id, count(*)::int as c
  from public.favorites
  group by prompt_id
) sub
where sub.prompt_id = p.id;

-- ============================================================
-- TRIGGER — keep prompts.favorite_count in sync
-- ============================================================
create or replace function public.favorites_after_change()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.prompts set favorite_count = favorite_count + 1 where id = new.prompt_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.prompts set favorite_count = greatest(favorite_count - 1, 0) where id = old.prompt_id;
    return old;
  end if;
  return null;
end; $$;

drop trigger if exists favorites_change_trigger on public.favorites;
create trigger favorites_change_trigger
  after insert or delete on public.favorites
  for each row execute function public.favorites_after_change();

-- ============================================================
-- RLS — service role bypasses; expose public read so cards can show counts
-- ============================================================
alter table public.favorites enable row level security;

drop policy if exists "public read favorites" on public.favorites;
create policy "public read favorites" on public.favorites for select using (true);

-- ============================================================
-- prompts_public view — include favorite_count
-- ============================================================
create or replace view public.prompts_public as
select
  id, creator_id, title, description, price_sol, category_id,
  status, avg_rating, rating_count, purchase_count, favorite_count,
  created_at, updated_at
from public.prompts
where status = 'active';

grant select on public.prompts_public to anon, authenticated;
