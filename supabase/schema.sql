-- Promt Markt — database schema
-- Run this entire file in Supabase: SQL Editor → New query → paste → Run

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- USERS
-- ============================================================
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  privy_id text unique not null,
  wallet_address text unique,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text check (char_length(bio) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_wallet_idx on public.users (wallet_address);
create index if not exists users_username_idx on public.users (lower(username));

-- ============================================================
-- CATEGORIES (lookup)
-- ============================================================
create table if not exists public.categories (
  id serial primary key,
  name text unique not null,
  slug text unique not null
);

insert into public.categories (name, slug) values
  ('Photography', 'photography'),
  ('Digital Art', 'digital-art'),
  ('Anime & Manga', 'anime-manga'),
  ('Logo & Branding', 'logo-branding'),
  ('Character Design', 'character-design'),
  ('Architecture', 'architecture'),
  ('Product & Mockup', 'product-mockup'),
  ('Fashion', 'fashion'),
  ('3D & Render', '3d-render'),
  ('Illustration', 'illustration'),
  ('Concept Art', 'concept-art'),
  ('Interior', 'interior'),
  ('Landscape', 'landscape'),
  ('Abstract', 'abstract'),
  ('Other', 'other')
on conflict (slug) do nothing;

-- ============================================================
-- PLATFORMS (lookup)
-- ============================================================
create table if not exists public.platforms (
  id serial primary key,
  name text unique not null,
  slug text unique not null
);

insert into public.platforms (name, slug) values
  ('Midjourney', 'midjourney'),
  ('DALL-E 3', 'dalle-3'),
  ('Stable Diffusion', 'stable-diffusion'),
  ('Flux', 'flux'),
  ('Leonardo AI', 'leonardo'),
  ('Ideogram', 'ideogram'),
  ('ChatGPT Image', 'chatgpt-image'),
  ('Nano Banana', 'nano-banana'),
  ('Recraft', 'recraft'),
  ('Firefly', 'firefly')
on conflict (slug) do nothing;

-- ============================================================
-- PROMPTS
-- ============================================================
create table if not exists public.prompts (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid not null references public.users(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 100),
  description text not null check (char_length(description) between 10 and 500),
  prompt_text text not null check (char_length(prompt_text) between 10 and 4000),
  price_sol numeric(12, 6) not null default 0 check (price_sol >= 0 and price_sol <= 10),
  category_id integer references public.categories(id),
  status text not null default 'active' check (status in ('active', 'removed')),
  avg_rating numeric(5, 2),
  rating_count integer not null default 0,
  purchase_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prompts_creator_idx on public.prompts (creator_id);
create index if not exists prompts_category_idx on public.prompts (category_id);
create index if not exists prompts_created_idx on public.prompts (created_at desc);
create index if not exists prompts_rating_idx on public.prompts (avg_rating desc nulls last);
create index if not exists prompts_status_idx on public.prompts (status);

-- ============================================================
-- PROMPT IMAGES (1–6 per prompt)
-- ============================================================
create table if not exists public.prompt_images (
  id uuid primary key default uuid_generate_v4(),
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  image_url text not null,
  position integer not null check (position between 1 and 6),
  created_at timestamptz not null default now(),
  unique(prompt_id, position)
);

create index if not exists prompt_images_prompt_idx on public.prompt_images (prompt_id);

-- ============================================================
-- PROMPT PLATFORMS (many-to-many)
-- ============================================================
create table if not exists public.prompt_platforms (
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  platform_id integer not null references public.platforms(id) on delete cascade,
  primary key (prompt_id, platform_id)
);

-- ============================================================
-- PURCHASES
-- ============================================================
create table if not exists public.purchases (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null references public.users(id) on delete cascade,
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  price_paid_sol numeric(12, 6) not null default 0,
  tx_signature text unique,
  created_at timestamptz not null default now(),
  unique(buyer_id, prompt_id)
);

create index if not exists purchases_buyer_idx on public.purchases (buyer_id);
create index if not exists purchases_prompt_idx on public.purchases (prompt_id);
create index if not exists purchases_created_idx on public.purchases (created_at desc);

-- ============================================================
-- RATINGS
-- ============================================================
create table if not exists public.ratings (
  id uuid primary key default uuid_generate_v4(),
  rater_id uuid not null references public.users(id) on delete cascade,
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(rater_id, prompt_id)
);

create index if not exists ratings_prompt_idx on public.ratings (prompt_id);

-- ============================================================
-- TRIGGERS — keep prompts.avg_rating / rating_count / purchase_count in sync
-- ============================================================

create or replace function public.recalc_prompt_rating(p_prompt_id uuid)
returns void language plpgsql as $$
begin
  update public.prompts
  set
    avg_rating = (
      select round(avg(stars) * 20, 2)
      from public.ratings
      where prompt_id = p_prompt_id
    ),
    rating_count = (
      select count(*) from public.ratings where prompt_id = p_prompt_id
    )
  where id = p_prompt_id;
end; $$;

create or replace function public.ratings_after_change()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalc_prompt_rating(old.prompt_id);
    return old;
  else
    perform public.recalc_prompt_rating(new.prompt_id);
    return new;
  end if;
end; $$;

drop trigger if exists ratings_change_trigger on public.ratings;
create trigger ratings_change_trigger
  after insert or update or delete on public.ratings
  for each row execute function public.ratings_after_change();

create or replace function public.purchases_after_insert()
returns trigger language plpgsql as $$
begin
  update public.prompts
  set purchase_count = purchase_count + 1
  where id = new.prompt_id;
  return new;
end; $$;

drop trigger if exists purchases_insert_trigger on public.purchases;
create trigger purchases_insert_trigger
  after insert on public.purchases
  for each row execute function public.purchases_after_insert();

-- updated_at auto-update
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists prompts_updated_at on public.prompts;
create trigger prompts_updated_at before update on public.prompts
  for each row execute function public.set_updated_at();

drop trigger if exists ratings_updated_at on public.ratings;
create trigger ratings_updated_at before update on public.ratings
  for each row execute function public.set_updated_at();

-- ============================================================
-- DAILY LISTING LIMIT — 10 per user per day
-- ============================================================
create or replace function public.check_daily_listing_limit()
returns trigger language plpgsql as $$
declare
  today_count integer;
begin
  select count(*) into today_count
  from public.prompts
  where creator_id = new.creator_id
    and created_at >= current_date;

  if today_count >= 10 then
    raise exception 'Daily listing limit (10) reached. Try again tomorrow.';
  end if;
  return new;
end; $$;

drop trigger if exists prompts_daily_limit on public.prompts;
create trigger prompts_daily_limit before insert on public.prompts
  for each row execute function public.check_daily_listing_limit();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- NOTE: Auth is handled by Privy, not Supabase Auth. We use the service_role
-- key from server-side Next.js routes for all writes and privileged reads
-- (including prompt_text). Public reads go through the anon key but RLS
-- policies below restrict what the anon key can see.

alter table public.users          enable row level security;
alter table public.prompts        enable row level security;
alter table public.prompt_images  enable row level security;
alter table public.prompt_platforms enable row level security;
alter table public.purchases      enable row level security;
alter table public.ratings        enable row level security;
alter table public.categories     enable row level security;
alter table public.platforms      enable row level security;

-- Public read access for non-sensitive tables
drop policy if exists "public read users"           on public.users;
create policy  "public read users"                  on public.users          for select using (true);

drop policy if exists "public read categories"      on public.categories;
create policy  "public read categories"             on public.categories     for select using (true);

drop policy if exists "public read platforms"       on public.platforms;
create policy  "public read platforms"              on public.platforms      for select using (true);

drop policy if exists "public read prompt images"   on public.prompt_images;
create policy  "public read prompt images"          on public.prompt_images  for select using (true);

drop policy if exists "public read prompt platforms" on public.prompt_platforms;
create policy  "public read prompt platforms"       on public.prompt_platforms for select using (true);

drop policy if exists "public read ratings"         on public.ratings;
create policy  "public read ratings"                on public.ratings        for select using (true);

drop policy if exists "public read purchases"       on public.purchases;
create policy  "public read purchases"              on public.purchases      for select using (true);

-- Prompts: anon role can only see NON-sensitive columns via a view (see below).
-- Direct table reads are blocked for anon; server code uses service_role.
drop policy if exists "no anon direct prompt read" on public.prompts;
-- (no policy = no access for anon)

-- ============================================================
-- PUBLIC VIEW — prompts without prompt_text (safe for anon)
-- ============================================================
create or replace view public.prompts_public as
select
  id, creator_id, title, description, price_sol, category_id,
  status, avg_rating, rating_count, purchase_count, created_at, updated_at
from public.prompts
where status = 'active';

grant select on public.prompts_public to anon, authenticated;

-- ============================================================
-- STORAGE BUCKET for prompt images (create via Supabase dashboard or SQL below)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('prompt-images', 'prompt-images', true)
on conflict (id) do nothing;

-- Allow public read on prompt-images bucket
drop policy if exists "public read prompt images" on storage.objects;
create policy "public read prompt images"
  on storage.objects for select
  using (bucket_id = 'prompt-images');

-- Uploads are done server-side with service_role, so no insert policy needed for anon.
