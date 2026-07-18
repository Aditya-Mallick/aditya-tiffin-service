-- ============================================================================
-- Aditya Tiffin Service — walk-in / hotel-bed entries on the daily list.
-- A daily entry can now be either a real customer OR a one-time "guest label"
-- (e.g. "MK 7", "Honey B-10") with no customer record and no bill.
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

-- 1) A daily entry no longer must point to a customer…
alter table public.delivery_entries alter column customer_id drop not null;

-- 2) …instead it can carry a free-text guest label.
alter table public.delivery_entries add column if not exists guest_label text;

-- 3) But every entry must be one or the other (never empty).
alter table public.delivery_entries drop constraint if exists delivery_entries_who_chk;
alter table public.delivery_entries add constraint delivery_entries_who_chk
  check (customer_id is not null or guest_label is not null);

-- 4) "Copy from another day" should bring forward only real customers,
--    never one-off walk-ins (a different person may be on that bed).
create or replace function public.copy_daily_list(
  p_source_date date, p_source_slot slot_type,
  p_target_date date, p_target_slot slot_type
) returns integer language plpgsql as $$
declare inserted_count int;
begin
  insert into public.delivery_entries (entry_date, slot, customer_id, tiffin_type_id, quantity)
  select p_target_date, p_target_slot, s.customer_id, s.tiffin_type_id, s.quantity
  from public.delivery_entries s
  where s.entry_date = p_source_date
    and s.slot = p_source_slot
    and s.deleted_at is null
    and s.customer_id is not null                 -- skip walk-ins
    and not exists (
      select 1 from public.delivery_entries t
      where t.entry_date = p_target_date and t.slot = p_target_slot
        and t.customer_id = s.customer_id and t.deleted_at is null
    );
  get diagnostics inserted_count = row_count;
  return inserted_count;
end; $$;
