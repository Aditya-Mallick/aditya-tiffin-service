-- ============================================================================
-- Aditya Tiffin Service — balances always computed live, never from snapshots.
--
-- Before: the balance carried into a month preferred last month's SAVED bill.
-- If the daily lists changed after that bill was saved, the snapshot went
-- stale — e.g. July showing ₹260 due while August's opening said ₹50.
--
-- Now: the carry-over is always calculated from the actual records —
--     opening balance + all earlier charges − all earlier payments
-- so every screen (statement, bill, dues list) agrees, automatically.
-- Saved bills remain as a record of what was sent, but they no longer drive
-- the arithmetic.
--
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

create or replace function public.customer_opening(p_customer uuid, p_month date)
returns numeric language sql stable as $$
  select
    coalesce((select cb.opening_balance from public.customer_billing cb
               where cb.customer_id = p_customer), 0)
    + public.customer_charges(
        p_customer, null, (date_trunc('month', p_month)::date - 1))
    - coalesce((select sum(p.amount) from public.payments p
                 where p.customer_id = p_customer
                   and p.deleted_at is null
                   and p.paid_on < date_trunc('month', p_month)::date), 0);
$$;
