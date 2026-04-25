-- Promt Markt — migration 004: purchase intents (Solana Pay reference pattern)
-- Idempotent. Run in Supabase SQL Editor.
--
-- Background: the previous purchase flow trusted the client to post the
-- tx signature back to the server. If the client crashed or maliciously
-- posted a different signature, the server had no way to find the actual
-- payment. The new flow:
--   1. Server creates a `purchase_intent` with a freshly generated reference
--      pubkey — the canonical, replay-proof pointer to this checkout.
--   2. Client builds the SOL transfers AND attaches the reference pubkey to
--      one of the transfer instructions as a non-signer key (Solana Pay
--      convention). The reference is now recorded on-chain.
--   3. Client signs + sends; server confirms via either the posted signature
--      or `getSignaturesForAddress(reference)` if the client never reports
--      back. Either way the canonical source of truth is the intent row.
-- ============================================================

create table if not exists public.purchase_intents (
  reference text primary key,                    -- base58 pubkey, unique per checkout
  buyer_id uuid not null references public.users(id) on delete cascade,
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  expected_total_lamports bigint not null,
  expected_creator_lamports bigint not null,
  expected_platform_lamports bigint not null,
  expected_buyer_wallet text not null,
  expected_creator_wallet text not null,
  expected_platform_wallet text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '20 minutes'),
  consumed_at timestamptz,
  consumed_signature text                         -- the on-chain sig that consumed this intent
);

create index if not exists purchase_intents_buyer_idx on public.purchase_intents (buyer_id);
create index if not exists purchase_intents_prompt_idx on public.purchase_intents (prompt_id);

-- RLS: anon gets nothing; service-role bypasses as usual.
alter table public.purchase_intents enable row level security;

-- ============================================================
-- Add reference back-pointer to purchases for traceability.
-- Existing purchases (legacy flow) leave this null.
-- ============================================================
alter table public.purchases add column if not exists reference text;

create unique index if not exists purchases_reference_idx
  on public.purchases (reference)
  where reference is not null;
