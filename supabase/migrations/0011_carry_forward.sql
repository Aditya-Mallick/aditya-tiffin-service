-- ============================================================================
-- Aditya Tiffin Service — carry forward unbilled months automatically.
--
-- Before: a month's "previous balance" came only from last month's SAVED bill.
-- If that bill was never created it silently showed ₹0, so earlier charges
-- (e.g. 25–30 June) looked like they had vanished.
--
-- Now: a saved bill still wins (it may contain manual adjustments), but when
-- there isn't one we fall back to everything owed before this month:
--     opening balance + all earlier charges − all earlier payments
--
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ============================================================================

-- Charges for one customer over a date range (portion- and override-aware).
-- p_from NULL means "from the very beginning".
create or replace function public.customer_charges(p_customer uuid, p_from date, p_to date)
returns numeric language sql stable as $$
  select coalesce(sum(
    coalesce(e.quantity, 1) *
    case
      when tt.has_portions and e.portion = 'full'
        then coalesce(cr.full_price, tt.full_price, tt.default_price, 0)
      else coalesce(cr.price, tt.default_price, 0)
    end
  ), 0)
  from public.delivery_entries e
  join public.tiffin_types tt on tt.id = e.tiffin_type_id
  left join public.customer_rates cr
    on cr.customer_id = e.customer_id and cr.tiffin_type_id = e.tiffin_type_id
  where e.deleted_at is null
    and e.customer_id = p_customer
    and (p_from is null or e.entry_date >= p_from)
    and e.entry_date <= p_to;
$$;

-- The balance carried INTO the given month.
create or replace function public.customer_opening(p_customer uuid, p_month date)
returns numeric language sql stable as $$
  select coalesce(
    -- 1) last month's saved bill, if it exists
    (select b.closing_balance
       from public.bills b
      where b.customer_id = p_customer
        and b.period_month = (date_trunc('month', p_month) - interval '1 month')::date
        and b.deleted_at is null
      limit 1),
    -- 2) otherwise everything still owed from before this month
    coalesce((select cb.opening_balance from public.customer_billing cb
               where cb.customer_id = p_customer), 0)
      + public.customer_charges(
          p_customer, null, (date_trunc('month', p_month)::date - 1))
      - coalesce((select sum(p.amount) from public.payments p
                   where p.customer_id = p_customer
                     and p.deleted_at is null
                     and p.paid_on < date_trunc('month', p_month)::date), 0)
  );
$$;

-- Dues for every customer, now using the same carry-forward rule.
create or replace function public.customer_dues(p_month date)
returns table (customer_id uuid, due numeric)
language sql stable as $$
  with bounds as (
    select
      date_trunc('month', p_month)::date as m_start,
      (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::date as m_end
  ),
  paid as (
    select p.customer_id as cid, sum(p.amount) as amt
    from public.payments p, bounds
    where p.deleted_at is null
      and p.paid_on between bounds.m_start and bounds.m_end
    group by p.customer_id
  )
  select
    c.id,
    (
      public.customer_opening(c.id, p_month)
      + public.customer_charges(c.id, (select m_start from bounds), (select m_end from bounds))
      - coalesce(pd.amt, 0)
    )::numeric
  from public.customers c
  left join paid pd on pd.cid = c.id
  where c.deleted_at is null;
$$;

grant execute on function public.customer_charges(uuid, date, date) to authenticated;
grant execute on function public.customer_opening(uuid, date) to authenticated;
grant execute on function public.customer_dues(date) to authenticated;
