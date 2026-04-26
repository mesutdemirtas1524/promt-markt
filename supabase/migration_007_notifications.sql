-- Promt Markt — migration 007: in-app notifications
-- Idempotent. Run in Supabase SQL Editor.
--
-- One row per "thing happened to you" event. Triggers on the four
-- existing event tables (favorites, follows, purchases, tips) fan
-- out a notification row to the affected user. Self-actions are
-- skipped (you don't get a notification for liking your own prompt).
--
-- (Bare table names — no schema prefix — to dodge the chat-tool
--  auto-link hazard documented on migration 006.)
-- ============================================================

create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('favorite', 'follow', 'purchase', 'tip')),
  actor_id uuid references users(id) on delete set null,
  prompt_id uuid references prompts(id) on delete set null,
  amount_sol numeric(12, 6),       -- purchase: price paid; tip: amount
  message text,                    -- tip: optional buyer message
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_recipient_idx
  on notifications (recipient_id, created_at desc);
create index if not exists notifications_unread_idx
  on notifications (recipient_id) where read_at is null;

alter table notifications enable row level security;

-- ============================================================
-- Trigger functions — one per source event
-- ============================================================

-- favorite: notify the prompt's creator that someone hearted it
create or replace function notify_on_favorite()
returns trigger language plpgsql as $$
declare
  creator uuid;
begin
  select creator_id into creator from prompts where prompts.id = new.prompt_id;
  if creator is not null and creator <> new.user_id then
    insert into notifications (recipient_id, kind, actor_id, prompt_id)
    values (creator, 'favorite', new.user_id, new.prompt_id);
  end if;
  return new;
end; $$;

drop trigger if exists favorites_notify on favorites;
create trigger favorites_notify
  after insert on favorites
  for each row execute function notify_on_favorite();

-- follow: notify the followed user
create or replace function notify_on_follow()
returns trigger language plpgsql as $$
begin
  insert into notifications (recipient_id, kind, actor_id)
  values (new.following_id, 'follow', new.follower_id);
  return new;
end; $$;

drop trigger if exists follows_notify on follows;
create trigger follows_notify
  after insert on follows
  for each row execute function notify_on_follow();

-- purchase: notify the prompt's creator that someone bought it
create or replace function notify_on_purchase()
returns trigger language plpgsql as $$
declare
  creator uuid;
begin
  select creator_id into creator from prompts where prompts.id = new.prompt_id;
  if creator is not null and creator <> new.buyer_id then
    insert into notifications (recipient_id, kind, actor_id, prompt_id, amount_sol)
    values (creator, 'purchase', new.buyer_id, new.prompt_id, new.price_paid_sol);
  end if;
  return new;
end; $$;

drop trigger if exists purchases_notify on purchases;
create trigger purchases_notify
  after insert on purchases
  for each row execute function notify_on_purchase();

-- tip: notify the creator who received the tip
create or replace function notify_on_tip()
returns trigger language plpgsql as $$
begin
  if new.creator_id <> new.tipper_id then
    insert into notifications (recipient_id, kind, actor_id, amount_sol, message)
    values (new.creator_id, 'tip', new.tipper_id, new.amount_sol, new.message);
  end if;
  return new;
end; $$;

drop trigger if exists tips_notify on tips;
create trigger tips_notify
  after insert on tips
  for each row execute function notify_on_tip();
