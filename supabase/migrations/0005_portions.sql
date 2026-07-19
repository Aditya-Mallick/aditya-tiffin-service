-- ============================================================================
-- Aditya Tiffin Service — half-plate / full-plate portions.
-- Egg, Chicken, Fish, Mutton get a half price (existing price) and a full price.
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

-- Menu: mark which items have portions, and their full-plate default price.
alter table public.tiffin_types add column if not exists has_portions boolean not null default false;
alter table public.tiffin_types add column if not exists full_price numeric(10,2);

-- Per-customer full-plate price override (existing `price` = half / single).
alter table public.customer_rates add column if not exists full_price numeric(10,2);
-- Allow a customer to override only half OR only full (the other stays default).
alter table public.customer_rates alter column price drop not null;

-- Each daily entry can note the portion: 'half' (default), 'full', or null.
alter table public.delivery_entries add column if not exists portion text;

-- Turn on half/full for the four non-veg tiffins.
-- Half plate = the current default_price; full plate = the new price below.
update public.tiffin_types set has_portions = true, full_price = 150 where name_en = 'Egg tiffin';
update public.tiffin_types set has_portions = true, full_price = 180 where name_en = 'Chicken tiffin';
update public.tiffin_types set has_portions = true, full_price = 180 where name_en = 'Fish tiffin';
update public.tiffin_types set has_portions = true, full_price = 280 where name_en = 'Mutton tiffin';
