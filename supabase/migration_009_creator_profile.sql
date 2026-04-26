-- Promt Markt — migration 009: creator profile (banner + social links)
-- Idempotent. Run in Supabase SQL Editor.
--
-- Adds banner_url for the cover image at the top of /u/<username> and
-- social_links as a flexible jsonb blob (twitter, instagram, website,
-- discord, youtube, etc) so we can add new platforms without further
-- migrations.
-- ============================================================

alter table users add column if not exists banner_url text;
alter table users add column if not exists social_links jsonb not null default '{}'::jsonb;
