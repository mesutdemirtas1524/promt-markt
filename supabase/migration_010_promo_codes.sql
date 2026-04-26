-- Promt Markt — migration 010: promo codes
-- Idempotent. Run in Supabase SQL Editor.
--
-- Creators issue promo codes that knock a percent off their own
-- prompts. The redemption table is the audit trail and the source
-- of truth for "have I used this already" + "is the code burned out".
-- ============================================================

create table if not exists promo_codes (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references users(id) on delete cascade,
  code text not null,
  discount_percent smallint not null check (discount_percent between 1 and 50),
  max_uses integer,
  uses integer not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Codes are case-insensitive globally unique.
create unique index if not exists promo_codes_code_uniq on promo_codes (lower(code));
create index if not exists promo_codes_creator_idx on promo_codes (creator_id, created_at desc);

create table if not exists promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references promo_codes(id) on delete cascade,
  buyer_id uuid not null references users(id) on delete cascade,
  prompt_id uuid not null references prompts(id) on delete cascade,
  purchase_id uuid references purchases(id) on delete set null,
  discount_percent smallint not null,
  created_at timestamptz not null default now()
);

create index if not exists promo_redemptions_code_idx on promo_redemptions (code_id, created_at desc);
-- One buyer can use the same code on a given prompt at most once.
create unique index if not exists promo_redemptions_uniq on promo_redemptions (code_id, buyer_id, prompt_id);

-- Bump uses counter when a redemption is recorded.
create or replace function bump_promo_uses() returns trigger
language plpgsql as $$
begin
  update promo_codes set uses = uses + 1 where id = new.code_id;
  return new;
end;
$$;

drop trigger if exists trg_bump_promo_uses on promo_redemptions;
create trigger trg_bump_promo_uses
  after insert on promo_redemptions
  for each row execute function bump_promo_uses();

-- Carry the promo through checkout so /purchase can record the
-- redemption against the resulting purchase row.
alter table purchase_intents
  add column if not exists promo_code_id uuid references promo_codes(id) on delete set null;
alter table purchase_intents
  add column if not exists promo_discount_percent smallint;
