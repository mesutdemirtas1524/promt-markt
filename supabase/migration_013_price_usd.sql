-- Promt Markt — migration 013: USD-first pricing
-- Idempotent. Run in Supabase SQL Editor.
--
-- Up to now prompts were priced in SOL. Going forward USD is the
-- creator's source of truth and SOL is computed at checkout time
-- using the live SOL/USD price. price_sol stays on the row as a
-- cached fallback so display surfaces don't break if the live
-- price service is unavailable.
--
-- Backfill: existing rows get a USD value computed from their
-- current SOL price using a fixed conversion (assumed 200 USD/SOL).
-- This is approximate by design — creators can edit afterwards.
-- ============================================================

alter table prompts add column if not exists price_usd numeric(10, 2);

-- Backfill any rows that don't have a USD price yet.
update prompts
set price_usd = round((price_sol * 200)::numeric, 2)
where price_usd is null;

-- New rows should always have a USD value.
alter table prompts alter column price_usd set not null;
alter table prompts alter column price_usd set default 0;
