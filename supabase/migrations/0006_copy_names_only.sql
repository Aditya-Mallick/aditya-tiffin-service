-- ============================================================================
-- Aditya Tiffin Service — "copy from another day" now copies the PEOPLE only.
-- It brings forward both real customers AND walk-ins, but resets each to a
-- default (veg) tiffin, single portion, qty 1. The kitchen changes the item
-- per day as needed. Skips anyone already in the target list.
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

drop function if exists public.copy_daily_list(date, slot_type, date, slot_type);

create or replace function public.copy_daily_list(
  p_source_date date, p_source_slot slot_type,
  p_target_date date, p_target_slot slot_type,
  p_tiffin_type_id uuid
) returns integer language plpgsql as $$
declare inserted_count int;
begin
  insert into public.delivery_entries
    (entry_date, slot, customer_id, guest_label, tiffin_type_id, portion, quantity)
  select p_target_date, p_target_slot, s.customer_id, s.guest_label, p_tiffin_type_id, null, 1
  from public.delivery_entries s
  where s.entry_date = p_source_date
    and s.slot = p_source_slot
    and s.deleted_at is null
    and not exists (
      select 1 from public.delivery_entries t
      where t.entry_date = p_target_date and t.slot = p_target_slot and t.deleted_at is null
        and (
          (s.customer_id is not null and t.customer_id = s.customer_id)
          or (s.customer_id is null and t.guest_label is not distinct from s.guest_label)
        )
    );
  get diagnostics inserted_count = row_count;
  return inserted_count;
end; $$;

grant execute on function public.copy_daily_list(date, slot_type, date, slot_type, uuid) to authenticated;
