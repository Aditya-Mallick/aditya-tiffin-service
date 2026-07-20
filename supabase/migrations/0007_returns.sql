-- ============================================================================
-- Aditya Tiffin Service — tiffin box return tracking.
-- Each daily entry now records how many of its boxes have come back.
-- Returns are changed via mark_return(), which lets staff edit only today &
-- yesterday, while owner/admin can edit any date (the daily LIST stays
-- today-only for staff, unchanged).
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.delivery_entries add column if not exists returned_qty int not null default 0;

create or replace function public.mark_return(p_entry_id uuid, p_returned int)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_entry_date date;
  v_qty int;
  v_role text;
  v_new int;
begin
  select entry_date, quantity into v_entry_date, v_qty
  from public.delivery_entries where id = p_entry_id;
  if not found then raise exception 'Entry not found'; end if;

  v_role := public.auth_role();
  if v_role not in ('owner', 'admin') then
    if v_entry_date <> public.today_ist() and v_entry_date <> (public.today_ist() - 1) then
      raise exception 'Staff can only change today or yesterday';
    end if;
  end if;

  v_new := greatest(0, least(coalesce(p_returned, 0), coalesce(v_qty, 0)));
  update public.delivery_entries set returned_qty = v_new where id = p_entry_id;
  return v_new;
end; $$;

grant execute on function public.mark_return(uuid, int) to authenticated;
