-- ============================================================================
-- Aditya Tiffin Service — customizations (run AFTER 0001_init.sql)
-- Paste into the Supabase SQL Editor and click "Run". Safe to re-run.
-- ============================================================================

-- 1) Bill lines can carry a custom label (for renamed / one-off items).
alter table public.bill_lines add column if not exists label text;

-- 2) Remove the placeholder ₹0 special thalis from the menu.
--    (We deactivate rather than delete, so any past daily entries stay intact.)
update public.tiffin_types
set active = false
where name_en in ('Special Veg Thali', 'Special Chicken Thali')
  and default_price = 0;

-- From here on you can add your own priced items (e.g. "Mutton Thali (4 pcs)"
-- at ₹280, "Special Veg Thali" at ₹120, "10 Rotis", "30 Rotis") from the
-- in-app Menu screen — no SQL needed.
