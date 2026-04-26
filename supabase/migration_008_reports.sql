-- Promt Markt — migration 008: prompt reports / moderation queue
-- Idempotent. Run in Supabase SQL Editor.
--
-- Lets any signed-in user flag a prompt for review (spam, copyright,
-- NSFW, misleading, other). Reports land in a queue the platform owner
-- works through from /admin/reports — they can either remove the
-- prompt (sets status='removed', soft-delete preserves buyer access)
-- or dismiss the report.
-- ============================================================

create table if not exists reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references users(id) on delete cascade,
  prompt_id uuid not null references prompts(id) on delete cascade,
  reason text not null check (reason in ('spam', 'copyright', 'nsfw', 'misleading', 'other')),
  message text check (char_length(message) <= 500),
  status text not null default 'open' check (status in ('open', 'removed', 'dismissed')),
  reviewed_at timestamptz,
  reviewed_by uuid references users(id) on delete set null,
  reviewer_note text check (char_length(reviewer_note) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists reports_status_created_idx on reports (status, created_at desc);
create index if not exists reports_prompt_idx on reports (prompt_id);

-- One OPEN report per (reporter, prompt) — prevents spam-flagging.
-- Multiple users can still each report the same prompt; the same user
-- can report it again after the first one has been resolved.
create unique index if not exists reports_unique_open
  on reports (reporter_id, prompt_id)
  where status = 'open';

alter table reports enable row level security;
