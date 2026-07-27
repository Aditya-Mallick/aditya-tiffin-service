-- ============================================================================
-- Aditya Tiffin Service — fix duplicated bill lines.
--
-- Cause: saving a bill deletes its old lines and inserts fresh ones, but the
-- DELETE policy on bill_lines was owner-only while INSERT allowed admins.
-- So when an admin saved a bill, the delete quietly removed nothing (RLS
-- filters rows rather than erroring) and the insert added a second copy —
-- every save piled on another set, inflating the bill total.
--
-- Bill lines are regenerated on every save, so admins must be able to replace
-- them. (Permanent erase of customers/payments/bills stays owner-only.)
--
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

-- 1) Let admins replace bill lines.
drop policy if exists bl_delete on public.bill_lines;
create policy bl_delete on public.bill_lines for delete to authenticated
  using (public.is_admin());

-- 2) Remove the duplicate copies already stored (keeps one of each).
delete from public.bill_lines a
using public.bill_lines b
where a.ctid > b.ctid
  and a.bill_id = b.bill_id
  and coalesce(a.label, '') = coalesce(b.label, '')
  and a.tiffin_type_id is not distinct from b.tiffin_type_id
  and a.qty = b.qty
  and a.unit_price = b.unit_price;

-- 3) Any bill saved while duplicated has an inflated total. Recompute each
--    bill's charges from its (now de-duplicated) lines and restate the totals.
with sums as (
  select bill_id, sum(line_total) as total
  from public.bill_lines
  group by bill_id
)
update public.bills b
set computed_total  = s.total,
    total_due       = b.opening_advance + s.total + b.adjustments,
    closing_balance = b.opening_advance + s.total + b.adjustments - b.amount_paid
from sums s
where s.bill_id = b.id
  and b.computed_total is distinct from s.total;
