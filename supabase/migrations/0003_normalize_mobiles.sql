-- ============================================================================
-- Aditya Tiffin Service — one-time cleanup of existing customer mobile numbers.
-- Normalizes every stored number to a bare 10-digit form (strips +91, spaces,
-- dashes, leading 0, 00 prefix). Run once in the Supabase SQL Editor.
-- Safe to re-run (already-clean numbers are left unchanged).
-- ============================================================================

with step0 as (   -- keep digits only
  select id, regexp_replace(coalesce(mobile, ''), '\D', '', 'g') as d
  from public.customers
),
step1 as (        -- drop 00 international prefix
  select id, case when left(d, 2) = '00' then substr(d, 3) else d end as d from step0
),
step2 as (        -- drop 91 country code (12-digit numbers)
  select id, case when length(d) = 12 and left(d, 2) = '91' then substr(d, 3) else d end as d from step1
),
step3 as (        -- drop domestic leading 0 (11-digit numbers)
  select id, case when length(d) = 11 and left(d, 1) = '0' then substr(d, 2) else d end as d from step2
)
update public.customers c
set mobile = s.d
from step3 s
where c.id = s.id
  and c.mobile is distinct from s.d;
