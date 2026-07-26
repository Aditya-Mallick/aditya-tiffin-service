-- ============================================================================
-- Aditya Tiffin Service — copying a day now keeps that day's arrangement.
-- Copied rows are numbered in exactly the order they appear on screen for the
-- source day, so a list you arranged by hand carries over intact.
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

drop function if exists public.copy_daily_list(date, slot_type, date, slot_type, uuid);

create or replace function public.copy_daily_list(
  p_source_date date, p_source_slot slot_type,
  p_target_date date, p_target_slot slot_type,
  p_tiffin_type_id uuid
) returns integer language plpgsql as $$
declare inserted_count int;
begin
  insert into public.delivery_entries
    (entry_date, slot, customer_id, guest_label, tiffin_type_id, portion, quantity, sort_order)
  select
    p_target_date, p_target_slot, s.customer_id, s.guest_label, p_tiffin_type_id, null, 1,
    row_number() over (
      -- Same order the app displays: not-yet-arranged rows first (newest
      -- first), then rows that were arranged by hand, in their saved order.
      order by
        case when s.sort_order is null then 0 else 1 end,
        case when s.sort_order is null then s.created_at end desc,
        s.sort_order
    )
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
