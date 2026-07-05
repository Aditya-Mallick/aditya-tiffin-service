-- ============================================================================
-- Aditya Tiffin Service — database schema + security rules (Phase 0)
-- Paste this whole file into the Supabase SQL Editor and click "Run".
-- Safe to re-run: it uses "if not exists" / "create or replace" where possible.
-- ============================================================================

-- ---- Enums -----------------------------------------------------------------
do $$ begin
  create type user_role       as enum ('owner', 'admin', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type slot_type       as enum ('morning', 'afternoon', 'evening');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tiffin_category as enum ('tiffin', 'special', 'roti', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type bill_status     as enum ('draft', 'finalized', 'sent', 'paid');
exception when duplicate_object then null; end $$;

-- ---- Helper: "today" in India (no table dependency) ------------------------
create or replace function public.today_ist()
returns date language sql stable as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;

-- (Role-check functions are defined further down, AFTER the profiles table
--  exists — otherwise Postgres rejects them: "relation profiles does not exist".)

-- ---- Tables ----------------------------------------------------------------

-- People who can log in. id == the Supabase auth user id.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  mobile     text,
  role       user_role not null default 'staff',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Menu catalog (default prices; per-customer overrides live in customer_rates).
create table if not exists public.tiffin_types (
  id            uuid primary key default gen_random_uuid(),
  name_en       text not null,
  name_hi       text,
  default_price numeric(10,2) not null default 0,
  category      tiffin_category not null default 'tiffin',
  sort_order    int not null default 0,
  active        boolean not null default true,
  deleted_at    timestamptz
);

-- Customer CONTACT info only — no money here, so staff may read/add it.
create table if not exists public.customers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  mobile     text not null,
  address    text,
  active     boolean not null default true,
  deleted_at timestamptz,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists customers_mobile_idx on public.customers (mobile);

-- Customer MONEY info — separate table so staff can be fully blocked from it.
create table if not exists public.customer_billing (
  customer_id     uuid primary key references public.customers(id) on delete cascade,
  plan_name       text,
  plan_amount     numeric(10,2),
  plan_notes      text,
  opening_balance numeric(10,2) not null default 0
);

-- Per-customer price overrides (money) — admin only.
create table if not exists public.customer_rates (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references public.customers(id) on delete cascade,
  tiffin_type_id uuid not null references public.tiffin_types(id) on delete cascade,
  price          numeric(10,2) not null,
  unique (customer_id, tiffin_type_id)
);

-- The daily list: one row = one customer, one slot, one date, what was served.
create table if not exists public.delivery_entries (
  id             uuid primary key default gen_random_uuid(),
  entry_date     date not null,
  slot           slot_type not null,
  customer_id    uuid not null references public.customers(id) on delete cascade,
  tiffin_type_id uuid references public.tiffin_types(id),
  quantity       int not null default 1,
  notes          text,
  deleted_at     timestamptz,
  created_by     uuid references public.profiles(id) default auth.uid(),
  created_at     timestamptz not null default now()
);
create index if not exists delivery_entries_date_slot_idx
  on public.delivery_entries (entry_date, slot);
-- One active entry per customer per slot per day (they can change the tiffin type).
create unique index if not exists delivery_entries_unique_active
  on public.delivery_entries (entry_date, slot, customer_id)
  where deleted_at is null;

-- Money received (any day) — admin only.
create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  amount      numeric(10,2) not null,
  paid_on     date not null default public.today_ist(),
  method      text,
  note        text,
  deleted_at  timestamptz,
  recorded_by uuid references public.profiles(id) default auth.uid(),
  created_at  timestamptz not null default now()
);

-- Monthly bills — admin only.
create table if not exists public.bills (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid not null references public.customers(id) on delete cascade,
  period_month     date not null,               -- first day of the billed month
  computed_total   numeric(10,2) not null default 0,
  adjustments      numeric(10,2) not null default 0,
  opening_advance  numeric(10,2) not null default 0,
  total_due        numeric(10,2) not null default 0,
  amount_paid      numeric(10,2) not null default 0,
  closing_balance  numeric(10,2) not null default 0,
  status           bill_status not null default 'draft',
  notes            text,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  finalized_at     timestamptz,
  unique (customer_id, period_month)
);

create table if not exists public.bill_lines (
  id             uuid primary key default gen_random_uuid(),
  bill_id        uuid not null references public.bills(id) on delete cascade,
  tiffin_type_id uuid references public.tiffin_types(id),
  qty            int not null default 0,
  unit_price     numeric(10,2) not null default 0,
  line_total     numeric(10,2) not null default 0
);

-- ---- Role checks (defined now that the profiles table exists) --------------
-- SECURITY DEFINER so they read profiles without tripping RLS recursion.
create or replace function public.auth_role()
returns text language sql stable security definer set search_path = public as $$
  select role::text from public.profiles where id = auth.uid();
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select public.auth_role() = 'owner';
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.auth_role() in ('owner', 'admin');
$$;

-- ---- Enable Row Level Security on everything -------------------------------
alter table public.profiles         enable row level security;
alter table public.tiffin_types     enable row level security;
alter table public.customers        enable row level security;
alter table public.customer_billing enable row level security;
alter table public.customer_rates   enable row level security;
alter table public.delivery_entries enable row level security;
alter table public.payments         enable row level security;
alter table public.bills            enable row level security;
alter table public.bill_lines       enable row level security;

-- ---- Policies --------------------------------------------------------------
-- Pattern: DELETE (permanent erase) is Owner-only everywhere. Day-to-day
-- "delete" in the app is a soft-delete = UPDATE deleted_at, governed below.

-- profiles: see own row (admins see all); admins manage; owner erases.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (public.is_admin());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles for delete to authenticated
  using (public.is_owner());

-- tiffin_types: everyone signed in can read; admins edit; owner erases.
drop policy if exists tt_select on public.tiffin_types;
create policy tt_select on public.tiffin_types for select to authenticated using (true);
drop policy if exists tt_insert on public.tiffin_types;
create policy tt_insert on public.tiffin_types for insert to authenticated with check (public.is_admin());
drop policy if exists tt_update on public.tiffin_types;
create policy tt_update on public.tiffin_types for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists tt_delete on public.tiffin_types;
create policy tt_delete on public.tiffin_types for delete to authenticated using (public.is_owner());

-- customers (contact only): everyone reads & can add; admins edit; owner erases.
drop policy if exists cust_select on public.customers;
create policy cust_select on public.customers for select to authenticated using (true);
drop policy if exists cust_insert on public.customers;
create policy cust_insert on public.customers for insert to authenticated with check (true);
drop policy if exists cust_update on public.customers;
create policy cust_update on public.customers for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists cust_delete on public.customers;
create policy cust_delete on public.customers for delete to authenticated using (public.is_owner());

-- customer_billing (money): ADMIN ONLY. Staff get nothing.
drop policy if exists cb_select on public.customer_billing;
create policy cb_select on public.customer_billing for select to authenticated using (public.is_admin());
drop policy if exists cb_insert on public.customer_billing;
create policy cb_insert on public.customer_billing for insert to authenticated with check (public.is_admin());
drop policy if exists cb_update on public.customer_billing;
create policy cb_update on public.customer_billing for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists cb_delete on public.customer_billing;
create policy cb_delete on public.customer_billing for delete to authenticated using (public.is_owner());

-- customer_rates (money): ADMIN ONLY.
drop policy if exists cr_select on public.customer_rates;
create policy cr_select on public.customer_rates for select to authenticated using (public.is_admin());
drop policy if exists cr_insert on public.customer_rates;
create policy cr_insert on public.customer_rates for insert to authenticated with check (public.is_admin());
drop policy if exists cr_update on public.customer_rates;
create policy cr_update on public.customer_rates for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists cr_delete on public.customer_rates;
create policy cr_delete on public.customer_rates for delete to authenticated using (public.is_owner());

-- delivery_entries: everyone reads. Staff may write ONLY today; admins any day.
-- (Soft-delete = UPDATE, so "remove from list" is also limited to today for staff.)
drop policy if exists de_select on public.delivery_entries;
create policy de_select on public.delivery_entries for select to authenticated using (true);
drop policy if exists de_insert on public.delivery_entries;
create policy de_insert on public.delivery_entries for insert to authenticated
  with check (public.is_admin() or entry_date = public.today_ist());
drop policy if exists de_update on public.delivery_entries;
create policy de_update on public.delivery_entries for update to authenticated
  using (public.is_admin() or entry_date = public.today_ist())
  with check (public.is_admin() or entry_date = public.today_ist());
drop policy if exists de_delete on public.delivery_entries;
create policy de_delete on public.delivery_entries for delete to authenticated using (public.is_owner());

-- payments: ADMIN ONLY; owner erases.
drop policy if exists pay_select on public.payments;
create policy pay_select on public.payments for select to authenticated using (public.is_admin());
drop policy if exists pay_insert on public.payments;
create policy pay_insert on public.payments for insert to authenticated with check (public.is_admin());
drop policy if exists pay_update on public.payments;
create policy pay_update on public.payments for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists pay_delete on public.payments;
create policy pay_delete on public.payments for delete to authenticated using (public.is_owner());

-- bills + bill_lines: ADMIN ONLY; owner erases.
drop policy if exists bill_select on public.bills;
create policy bill_select on public.bills for select to authenticated using (public.is_admin());
drop policy if exists bill_insert on public.bills;
create policy bill_insert on public.bills for insert to authenticated with check (public.is_admin());
drop policy if exists bill_update on public.bills;
create policy bill_update on public.bills for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists bill_delete on public.bills;
create policy bill_delete on public.bills for delete to authenticated using (public.is_owner());

drop policy if exists bl_select on public.bill_lines;
create policy bl_select on public.bill_lines for select to authenticated using (public.is_admin());
drop policy if exists bl_insert on public.bill_lines;
create policy bl_insert on public.bill_lines for insert to authenticated with check (public.is_admin());
drop policy if exists bl_update on public.bill_lines;
create policy bl_update on public.bill_lines for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists bl_delete on public.bill_lines;
create policy bl_delete on public.bill_lines for delete to authenticated using (public.is_owner());

-- ---- RPC: copy a daily list from one date/slot to another ------------------
-- Runs as the caller, so staff copying into a past date is blocked by RLS.
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
    and not exists (
      select 1 from public.delivery_entries t
      where t.entry_date = p_target_date and t.slot = p_target_slot
        and t.customer_id = s.customer_id and t.deleted_at is null
    );
  get diagnostics inserted_count = row_count;
  return inserted_count;
end; $$;

grant execute on function public.today_ist()      to authenticated;
grant execute on function public.auth_role()       to authenticated;
grant execute on function public.is_owner()        to authenticated;
grant execute on function public.is_admin()        to authenticated;
grant execute on function public.copy_daily_list(date, slot_type, date, slot_type) to authenticated;

-- ---- Seed the menu with your tiffin types & prices -------------------------
insert into public.tiffin_types (name_en, name_hi, default_price, category, sort_order)
select * from (values
  ('Veg tiffin',           'वेज टिफिन',          70.00, 'tiffin'::tiffin_category,  10),
  ('Egg tiffin',           'एग टिफिन',           90.00, 'tiffin'::tiffin_category,  20),
  ('Chicken tiffin',       'चिकन टिफिन',        130.00, 'tiffin'::tiffin_category,  30),
  ('Fish tiffin',          'फिश टिफिन',         130.00, 'tiffin'::tiffin_category,  40),
  ('Mutton tiffin',        'मटन टिफिन',         180.00, 'tiffin'::tiffin_category,  50),
  ('Roti (per piece)',     'रोटी (प्रति नग)',      6.00, 'roti'::tiffin_category,    80)
) as v(name_en, name_hi, default_price, category, sort_order)
where not exists (select 1 from public.tiffin_types t where t.name_en = v.name_en);

-- ============================================================================
-- Next: create your Owner login. See docs/PHASE_0_SETUP.md, step 4.
-- ============================================================================
