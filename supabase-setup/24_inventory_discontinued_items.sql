-- Run once in the SolarFlow demo project's Supabase SQL Editor (after 23).
-- Lets a discontinued (archived) material record what replaced it and why.
begin;

alter table public.inventory_items
  add column if not exists replaced_by_id uuid references public.inventory_items(id) on delete set null,
  add column if not exists discontinued_reason text check (discontinued_reason is null or char_length(discontinued_reason) <= 160);

-- Existing row-level policies already cover these columns (same table).
commit;
