-- Promt Markt — migration 003: lock down favorites + cascade on soft-delete
-- Idempotent. Run in Supabase SQL Editor.
--
-- Background: migration_002 created the favorites table with a "public read"
-- RLS policy. That meant the anon Supabase key could query the table and see
-- which user favorited which prompt — a privacy leak. We don't need anon read
-- because every server route fetches favorites with the service-role client
-- (which bypasses RLS), so we can drop the policy entirely.
-- ============================================================

-- ============================================================
-- 1. Remove public read policy on favorites
-- ============================================================
drop policy if exists "public read favorites" on public.favorites;

-- (No replacement policy is added — RLS stays enabled, anon gets nothing,
--  service-role bypasses RLS as before.)

-- ============================================================
-- 2. Cascade-delete favorites when a prompt is soft-removed
--    Keeps the favorites table free of orphaned rows for prompts that no
--    longer appear in any view.
-- ============================================================
create or replace function public.favorites_after_prompt_status_change()
returns trigger language plpgsql as $$
begin
  if new.status = 'removed' and old.status <> 'removed' then
    delete from public.favorites where prompt_id = new.id;
  end if;
  return new;
end; $$;

drop trigger if exists prompts_status_cascade_favorites on public.prompts;
create trigger prompts_status_cascade_favorites
  after update of status on public.prompts
  for each row execute function public.favorites_after_prompt_status_change();
