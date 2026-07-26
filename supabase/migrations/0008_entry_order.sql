-- ============================================================================
-- Aditya Tiffin Service — manual ordering of the daily list (drag to reorder).
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.delivery_entries add column if not exists sort_order int;

-- Save a new order: positions follow the order of the ids passed in.
-- SECURITY INVOKER (default) so RLS still applies — staff can only reorder
-- today's list, admins/owner any date.
create or replace function public.set_entry_order(p_ids uuid[])
returns void language sql as $$
  update public.delivery_entries e
  set sort_order = a.ord
  from unnest(p_ids) with ordinality as a(id, ord)
  where e.id = a.id;
$$;

grant execute on function public.set_entry_order(uuid[]) to authenticated;
