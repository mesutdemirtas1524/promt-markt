-- Promt Markt — migration 015: multi-category prompts
-- Idempotent. Run in Supabase SQL Editor.
--
-- Until now each prompt could only belong to ONE category. Creators
-- want to tag a single prompt with several (e.g. "Photography" +
-- "Cinematic") so it surfaces in more discover queries. This adds a
-- proper join table and backfills it from the existing single
-- category_id. We leave the prompts.category_id column in place for
-- now (read-only) so any consumer that hasn't migrated yet keeps
-- seeing the primary category.
-- ============================================================

create table if not exists prompt_categories (
  prompt_id uuid not null references prompts(id) on delete cascade,
  category_id integer not null references categories(id) on delete cascade,
  primary key (prompt_id, category_id)
);

create index if not exists prompt_categories_category_idx
  on prompt_categories (category_id);

-- Backfill from the existing single-category column.
insert into prompt_categories (prompt_id, category_id)
select id, category_id
from prompts
where category_id is not null
on conflict do nothing;
