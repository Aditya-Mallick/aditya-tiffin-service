-- ============================================================================
-- Aditya Tiffin Service — outstanding amount per customer, in one query.
-- Mirrors the "Current balance" shown on a customer's statement:
--     previous balance + this month's charges − this month's payments
-- Positive = customer owes, negative = they have an advance.
-- SECURITY INVOKER (default) so RLS still applies — only owner/admin can read
-- the money tables this depends on.
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

create or replace function public.customer_dues(p_month date)
returns table (customer_id uuid, due numeric)
language sql stable as $$
  with bounds as (
    select
      date_trunc('month', p_month)::date as m_start,
      (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::date as m_end,
      (date_trunc('month', p_month) - interval '1 month')::date as prev_month
  ),
  opening as (
    select
      c.id as cid,
      coalesce(
        -- last month's closing balance, if that bill exists…
        (select b.closing_balance from public.bills b
          where b.customer_id = c.id
            and b.period_month = (select prev_month from bounds)
            and b.deleted_at is null
          limit 1),
        -- …otherwise the figure saved on the customer
        (select cb.opening_balance from public.customer_billing cb where cb.customer_id = c.id),
        0
      ) as amt
    from public.customers c
    where c.deleted_at is null
  ),
  charges as (
    select e.customer_id as cid, sum(
      coalesce(e.quantity, 1) *
      case
        when tt.has_portions and e.portion = 'full'
          then coalesce(cr.full_price, tt.full_price, tt.default_price, 0)
        else coalesce(cr.price, tt.default_price, 0)
      end
    ) as amt
    from public.delivery_entries e
    join public.tiffin_types tt on tt.id = e.tiffin_type_id
    left join public.customer_rates cr
      on cr.customer_id = e.customer_id and cr.tiffin_type_id = e.tiffin_type_id
    where e.deleted_at is null
      and e.customer_id is not null
      and e.entry_date between (select m_start from bounds) and (select m_end from bounds)
    group by e.customer_id
  ),
  paid as (
    select p.customer_id as cid, sum(p.amount) as amt
    from public.payments p
    where p.deleted_at is null
      and p.paid_on between (select m_start from bounds) and (select m_end from bounds)
    group by p.customer_id
  )
  select
    o.cid,
    (o.amt + coalesce(ch.amt, 0) - coalesce(pd.amt, 0))::numeric
  from opening o
  left join charges ch on ch.cid = o.cid
  left join paid pd on pd.cid = o.cid;
$$;

grant execute on function public.customer_dues(date) to authenticated;
