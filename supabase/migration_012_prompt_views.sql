-- Promt Markt — migration 012: prompt views
-- Idempotent. Run in Supabase SQL Editor.
--
-- Tracks prompt detail page views for creator analytics. We dedup
-- by (prompt, viewer_or_ip, day) so a refresh-spamming visitor
-- doesn't inflate a creator's conversion rate.
--
-- view_count on prompts is the cached running total used by feeds
-- and dashboards. Trigger keeps it in sync.
-- ============================================================

create table if not exists prompt_views (
  id uuid primary key default uuid_generate_v4(),
  prompt_id uuid not null references prompts(id) on delete cascade,
  viewer_id uuid references users(id) on delete set null,
  ip_hash text,
  day date not null default current_date,
  created_at timestamptz not null default now()
);

-- Logged-in viewer: dedup by (prompt, viewer, day)
create unique index if not exists prompt_views_user_uniq
  on prompt_views (prompt_id, viewer_id, day)
  where viewer_id is not null;
-- Anonymous viewer: dedup by (prompt, ip_hash, day)
create unique index if not exists prompt_views_anon_uniq
  on prompt_views (prompt_id, ip_hash, day)
  where viewer_id is null and ip_hash is not null;

create index if not exists prompt_views_prompt_idx on prompt_views (prompt_id, created_at desc);

alter table prompts add column if not exists view_count integer not null default 0;

create or replace function bump_prompt_view_count()
returns trigger language plpgsql as $$
begin
  update prompts set view_count = view_count + 1 where id = new.prompt_id;
  return new;
end; $$;

drop trigger if exists trg_bump_prompt_view_count on prompt_views;
create trigger trg_bump_prompt_view_count
  after insert on prompt_views
  for each row execute function bump_prompt_view_count();
