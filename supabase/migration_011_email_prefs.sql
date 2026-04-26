-- Promt Markt — migration 011: email + email preferences
-- Idempotent. Run in Supabase SQL Editor.
--
-- Stores the user's contact email (captured from Privy on auth/sync)
-- plus a per-channel opt-in map. Defaults to all-on so launched
-- creators get the alerts that drive them back to the dashboard.
-- ============================================================

alter table users add column if not exists email text;
alter table users
  add column if not exists email_prefs jsonb not null
  default '{"sales": true, "tips": true, "follows": true}'::jsonb;

-- Looking up by email lets us deduplicate accounts in the future
-- and keeps the column actually queryable.
create index if not exists users_email_idx on users (lower(email));
