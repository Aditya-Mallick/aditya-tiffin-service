-- ============================================================================
-- One-off cleanup: remove showcase daily-list entries.
-- Keeps only 18 July 2026 (yesterday) and 19 July 2026 (today); deletes the
-- rest (1 July, 2 July, … that were added for demo).
-- Run in the Supabase SQL Editor.  NOTE: this permanently deletes those rows.
-- It only touches the daily lists (delivery_entries) — customers, payments
-- and bills are untouched.
-- ============================================================================

-- STEP 1 — Preview what will be removed. Run this first and check the numbers.
select entry_date, slot, count(*) as entries
from public.delivery_entries
where entry_date not in (date '2026-07-18', date '2026-07-19')
group by entry_date, slot
order by entry_date, slot;

-- STEP 2 — When the preview looks right, run this to delete them.
delete from public.delivery_entries
where entry_date not in (date '2026-07-18', date '2026-07-19');
