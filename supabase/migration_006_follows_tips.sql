-- Promt Markt — migration 006: follows + tips
-- Idempotent. Run in Supabase SQL Editor.
--
-- Two related social features:
--
--   1. Follows. Symmetric (follower / following) edges between users.
--      Used to power a "Following" feed and to show follower/following
--      counts on profiles.
--
--   2. Tips. Optional standalone SOL transfer from a fan to a creator,
--      verified on-chain like a purchase but without unlocking anything.
--      Recorded so creators can see who tipped them.
--
-- (Note to self: every "public dot tablename" pattern is written
--  unqualified here because some chat clients auto-link bare
--  schema-qualified names and corrupt the SQL when copy-pasted.
--  Supabase's search_path includes public by default.)
-- ============================================================

-- ============================================================
-- FOLLOWS
-- ============================================================
create table if not exists follows (
  follower_id uuid not null references users(id) on delete cascade,
  following_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_follower_idx on follows (follower_id);
create index if not exists follows_following_idx on follows (following_id);

alter table follows enable row level security;

-- Cached follower/following counts on the users table for cheap reads.
alter table users add column if not exists follower_count integer not null default 0;
alter table users add column if not exists following_count integer not null default 0;

create or replace function follows_after_change()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update users set follower_count = follower_count + 1 where users.id = new.following_id;
    update users set following_count = following_count + 1 where users.id = new.follower_id;
    return new;
  elsif tg_op = 'DELETE' then
    update users set follower_count = greatest(follower_count - 1, 0) where users.id = old.following_id;
    update users set following_count = greatest(following_count - 1, 0) where users.id = old.follower_id;
    return old;
  end if;
  return null;
end; $$;

drop trigger if exists follows_change_trigger on follows;
create trigger follows_change_trigger
  after insert or delete on follows
  for each row execute function follows_after_change();

-- Backfill any pre-existing edges (no-op on first run)
update users
set follower_count = coalesce((select count(*) from follows where follows.following_id = users.id), 0),
    following_count = coalesce((select count(*) from follows where follows.follower_id = users.id), 0);

-- ============================================================
-- TIPS — pending intents + finalized records
-- ============================================================
create table if not exists tip_intents (
  reference text primary key,
  tipper_id uuid not null references users(id) on delete cascade,
  creator_id uuid not null references users(id) on delete cascade,
  expected_lamports bigint not null,
  expected_tipper_wallet text not null,
  expected_creator_wallet text not null,
  message text check (char_length(message) <= 280),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '20 minutes'),
  consumed_at timestamptz,
  consumed_signature text
);

create index if not exists tip_intents_tipper_idx on tip_intents (tipper_id);
create index if not exists tip_intents_creator_idx on tip_intents (creator_id);

alter table tip_intents enable row level security;

create table if not exists tips (
  id uuid primary key default uuid_generate_v4(),
  tipper_id uuid not null references users(id) on delete cascade,
  creator_id uuid not null references users(id) on delete cascade,
  amount_sol numeric(12, 6) not null check (amount_sol > 0),
  tx_signature text unique not null,
  reference text unique not null,
  message text check (char_length(message) <= 280),
  created_at timestamptz not null default now()
);

create index if not exists tips_tipper_idx on tips (tipper_id);
create index if not exists tips_creator_idx on tips (creator_id);
create index if not exists tips_created_idx on tips (created_at desc);

alter table tips enable row level security;
