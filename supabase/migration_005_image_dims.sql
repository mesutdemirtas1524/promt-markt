-- Promt Markt — migration 005: store image width/height
-- Idempotent. Run in Supabase SQL Editor.
--
-- Background: without intrinsic dimensions on the row we can't ask
-- next/image to reserve the right aspect ratio (so the page jumps as
-- images load — bad CLS / Core Web Vitals) and we can't ask the
-- Supabase image render endpoint for a sized variant. The upload
-- form now extracts dims client-side and posts them with each image.
-- ============================================================

alter table public.prompt_images add column if not exists width integer;
alter table public.prompt_images add column if not exists height integer;
