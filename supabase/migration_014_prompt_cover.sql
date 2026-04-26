-- Promt Markt — migration 014: dedicated prompt cover image
-- Idempotent. Run in Supabase SQL Editor.
--
-- Until now the card thumbnail was just the first prompt_images row.
-- Creators want a different image on the card vs in the gallery
-- (e.g. a clean "title card" without text overlay), so we add a
-- dedicated cover that overrides the gallery's first image on
-- listing surfaces. Falls back to the first gallery image when null.
-- ============================================================

alter table prompts add column if not exists cover_image_url text;
alter table prompts add column if not exists cover_width integer;
alter table prompts add column if not exists cover_height integer;

-- Backfill existing prompts: use the first gallery image as the cover
-- so the visible cards stay identical right after the migration runs.
with first_image as (
  select distinct on (prompt_id)
    prompt_id, image_url, width, height
  from prompt_images
  order by prompt_id, position asc
)
update prompts p
set
  cover_image_url = fi.image_url,
  cover_width = fi.width,
  cover_height = fi.height
from first_image fi
where p.id = fi.prompt_id
  and p.cover_image_url is null;
