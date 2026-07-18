import { supabase } from '../lib/supabaseClient'

// Central place for all database reads/writes. Every function returns
// { data, error } so screens can handle failures uniformly.

// ---- Users / logins (admin, via the admin-users Edge Function) -------------
export async function listProfiles() {
  return supabase.from('profiles')
    .select('id, full_name, mobile, role, active')
    .order('role', { ascending: true })
    .order('full_name', { ascending: true })
}

// Calls the admin-users Edge Function (create / set_pin / set_active / delete).
// Returns { data } on success or { error: { message } } with a friendly message.
export async function adminUsers(body) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body })
  if (error) {
    let message = error.message
    try { const j = await error.context.json(); if (j?.error) message = j.error } catch { /* ignore */ }
    return { error: { message } }
  }
  return { data }
}

// ---- Reference data --------------------------------------------------------
export async function getTiffinTypes({ includeInactive = false } = {}) {
  let q = supabase
    .from('tiffin_types')
    .select('id, name_en, name_hi, default_price, category, sort_order, active')
    .order('sort_order', { ascending: true })
  if (!includeInactive) q = q.eq('active', true)
  return q
}

export async function saveTiffinType(tt) {
  const row = {
    name_en: (tt.name_en || '').trim(),
    name_hi: tt.name_hi?.trim() || null,
    default_price: Number(tt.default_price || 0),
    category: tt.category || 'tiffin',
    sort_order: tt.sort_order ?? 100,
    active: true,
  }
  if (tt.id) {
    return supabase.from('tiffin_types').update(row).eq('id', tt.id).select('id').single()
  }
  return supabase.from('tiffin_types').insert(row).select('id').single()
}

export async function deactivateTiffinType(id) {
  return supabase.from('tiffin_types').update({ active: false }).eq('id', id)
}

// ---- Customers -------------------------------------------------------------
export async function listCustomers({ includeArchived = false } = {}) {
  let q = supabase
    .from('customers')
    .select('id, name, mobile, address, active, deleted_at, created_at')
    .order('name', { ascending: true })
  if (!includeArchived) q = q.is('deleted_at', null)
  return q
}

// Money info (admin only — RLS blocks staff automatically).
export async function getCustomerBilling(customerId) {
  return supabase
    .from('customer_billing')
    .select('customer_id, plan_name, plan_amount, plan_notes, opening_balance')
    .eq('customer_id', customerId)
    .maybeSingle()
}

export async function getCustomerRates(customerId) {
  return supabase
    .from('customer_rates')
    .select('id, tiffin_type_id, price')
    .eq('customer_id', customerId)
}

// Clean any pasted Indian mobile format down to a bare 10-digit number.
// Handles: "98184 87872", "+91 98184 87872", "+91-98184-87872",
// "0919818487872", "09818487872", "00919818487872", etc.
export function canonicalMobile(mobile) {
  let d = String(mobile || '').replace(/\D/g, '')        // digits only
  if (d.startsWith('00')) d = d.slice(2)                  // 00 intl prefix
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2) // country code
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1)  // domestic 0 prefix
  return d
}

// Create or update a customer's contact row; returns the customer id.
export async function upsertCustomer(customer) {
  const mobile = canonicalMobile(customer.mobile)
  if (customer.id) {
    const { data, error } = await supabase
      .from('customers')
      .update({ name: customer.name, mobile, address: customer.address })
      .eq('id', customer.id)
      .select('id')
      .single()
    return { data, error }
  }
  const { data, error } = await supabase
    .from('customers')
    .insert({ name: customer.name, mobile, address: customer.address })
    .select('id')
    .single()
  return { data, error }
}

export async function upsertCustomerBilling(customerId, billing) {
  return supabase
    .from('customer_billing')
    .upsert({
      customer_id: customerId,
      plan_name: billing.plan_name || null,
      plan_amount: billing.plan_amount === '' ? null : billing.plan_amount,
      plan_notes: billing.plan_notes || null,
      opening_balance: billing.opening_balance === '' ? 0 : billing.opening_balance,
    })
}

// Save per-item rate overrides. `rates` = { [tiffin_type_id]: priceString }.
// Empty string means "use the default", so we delete any existing override.
export async function saveCustomerRates(customerId, rates) {
  const toUpsert = []
  const toDelete = []
  for (const [tiffinTypeId, value] of Object.entries(rates)) {
    if (value === '' || value == null) toDelete.push(tiffinTypeId)
    else toUpsert.push({ customer_id: customerId, tiffin_type_id: tiffinTypeId, price: Number(value) })
  }
  if (toDelete.length) {
    await supabase.from('customer_rates')
      .delete().eq('customer_id', customerId).in('tiffin_type_id', toDelete)
  }
  if (toUpsert.length) {
    return supabase.from('customer_rates')
      .upsert(toUpsert, { onConflict: 'customer_id,tiffin_type_id' })
  }
  return { data: null, error: null }
}

export async function archiveCustomer(id) {
  return supabase.from('customers')
    .update({ deleted_at: new Date().toISOString(), active: false }).eq('id', id)
}
export async function restoreCustomer(id) {
  return supabase.from('customers')
    .update({ deleted_at: null, active: true }).eq('id', id)
}

// ---- Daily list ------------------------------------------------------------
export async function getDailyEntries(dateStr, slot) {
  return supabase
    .from('delivery_entries')
    .select('id, quantity, notes, tiffin_type_id, customer_id, guest_label, ' +
            'customers ( id, name, mobile ), tiffin_types ( id, name_en, name_hi )')
    .eq('entry_date', dateStr)
    .eq('slot', slot)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
}

export async function addEntry(dateStr, slot, customerId, tiffinTypeId, quantity = 1) {
  return supabase.from('delivery_entries').insert({
    entry_date: dateStr, slot, customer_id: customerId,
    tiffin_type_id: tiffinTypeId, quantity,
  }).select('id').single()
}

// A one-time walk-in / hotel-bed entry — a label, no customer record.
export async function addGuestEntry(dateStr, slot, label, tiffinTypeId, quantity = 1) {
  return supabase.from('delivery_entries').insert({
    entry_date: dateStr, slot, customer_id: null, guest_label: label,
    tiffin_type_id: tiffinTypeId, quantity,
  }).select('id').single()
}

// Distinct walk-in labels used before (for type-ahead suggestions).
export async function getRecentGuestLabels() {
  const { data } = await supabase
    .from('delivery_entries')
    .select('guest_label')
    .not('guest_label', 'is', null)
    .order('created_at', { ascending: false })
    .limit(300)
  const seen = new Set(); const out = []
  for (const r of data || []) {
    const l = (r.guest_label || '').trim()
    if (l && !seen.has(l.toLowerCase())) { seen.add(l.toLowerCase()); out.push(l) }
  }
  return out
}

export async function updateEntry(id, fields) {
  return supabase.from('delivery_entries').update(fields).eq('id', id)
}

export async function softRemoveEntry(id) {
  return supabase.from('delivery_entries')
    .update({ deleted_at: new Date().toISOString() }).eq('id', id)
}
export async function restoreEntry(id) {
  return supabase.from('delivery_entries').update({ deleted_at: null }).eq('id', id)
}

// Copy a whole list from one date/slot into another (server-side RPC).
export async function copyDailyList(sourceDate, sourceSlot, targetDate, targetSlot) {
  return supabase.rpc('copy_daily_list', {
    p_source_date: sourceDate, p_source_slot: sourceSlot,
    p_target_date: targetDate, p_target_slot: targetSlot,
  })
}

// ---- Statement (charges computed from daily entries × rates) ---------------
export async function getEntriesForCustomerRange(customerId, startStr, endStr) {
  return supabase
    .from('delivery_entries')
    .select('id, entry_date, slot, quantity, tiffin_type_id')
    .eq('customer_id', customerId)
    .gte('entry_date', startStr)
    .lte('entry_date', endStr)
    .is('deleted_at', null)
    .order('entry_date', { ascending: true })
}

// ---- Payments (admin only — RLS blocks staff) ------------------------------
export async function listPayments({ customerId } = {}) {
  let q = supabase
    .from('payments')
    .select('id, amount, paid_on, method, note, customer_id, customers ( name, mobile )')
    .is('deleted_at', null)
    .order('paid_on', { ascending: false })
    .order('created_at', { ascending: false })
  if (customerId) q = q.eq('customer_id', customerId)
  return q
}

export async function addPayment(p) {
  return supabase.from('payments').insert({
    customer_id: p.customer_id,
    amount: Number(p.amount),
    paid_on: p.paid_on,
    method: p.method || null,
    note: p.note || null,
  }).select('id').single()
}

export async function softRemovePayment(id) {
  return supabase.from('payments')
    .update({ deleted_at: new Date().toISOString() }).eq('id', id)
}
export async function restorePayment(id) {
  return supabase.from('payments').update({ deleted_at: null }).eq('id', id)
}

// ---- Helpers ---------------------------------------------------------------
// Money formatting in Indian style, e.g. ₹1,23,456.
export function formatINR(amount) {
  const n = Number(amount || 0)
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

// Turn a signed balance into a clear direction + positive amount (no minus).
// Convention: positive = customer OWES (due), negative = customer has ADVANCE.
export function balanceParts(signed) {
  const n = Number(signed || 0)
  if (Math.abs(n) < 0.005) return { kind: 'settled', amount: 0 }
  return n > 0 ? { kind: 'due', amount: n } : { kind: 'advance', amount: -n }
}

// ---- Month helpers ---------------------------------------------------------
// Current month in India as 'YYYY-MM'.
export function currentMonthIST() {
  return todayIST().slice(0, 7)
}

// First and last calendar day of a 'YYYY-MM' month, as 'YYYY-MM-DD'.
export function monthBounds(ym) {
  const [y, m] = ym.split('-').map(Number)
  const start = `${ym}-01`
  const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) // day 0 of next month
  return { start, end }
}

export function addMonths(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7)
}

// e.g. '2026-07' -> 'July 2026' (or Hindi month name when lang === 'hi').
export function monthLabel(ym, lang = 'en') {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1))
    .toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-US', {
      month: 'long', year: 'numeric', timeZone: 'UTC',
    })
}

// Resolve the price for a tiffin type for a given customer:
// customer override if present, otherwise the default price.
export function rateFor(tiffinType, overridesMap) {
  const o = overridesMap?.[tiffinType.id]
  return o != null ? Number(o) : Number(tiffinType.default_price || 0)
}

// Shared charge computation used by both the statement and billing, so the
// two can never disagree. `overrides` = { tiffin_type_id: price }.
export function computeCharges(entries, overrides, types) {
  const typeById = Object.fromEntries(types.map(tt => [tt.id, tt]))
  const byType = {}
  const bySlot = { morning: 0, afternoon: 0, evening: 0 }
  let unspecified = 0, tiffins = 0
  const days = new Set()
  for (const e of entries) {
    days.add(e.entry_date)
    const q = e.quantity || 1
    tiffins += q
    if (e.slot in bySlot) bySlot[e.slot] += q
    if (!e.tiffin_type_id) { unspecified += q; continue }
    byType[e.tiffin_type_id] = (byType[e.tiffin_type_id] || 0) + q
  }
  const lines = Object.entries(byType).map(([typeId, qty]) => {
    const tt = typeById[typeId]
    const rate = tt ? rateFor(tt, overrides) : 0
    return {
      tiffin_type_id: typeId,
      name_en: tt?.name_en || '?', name_hi: tt?.name_hi || null,
      qty, rate, total: qty * rate,
    }
  }).sort((a, b) => b.total - a.total)
  const charges = lines.reduce((s, l) => s + l.total, 0)
  return { lines, charges, bySlot, days: days.size, tiffins, unspecified }
}

// ---- Bills (admin only) ----------------------------------------------------
const monthKey = (ym) => `${ym}-01`

export async function getBill(customerId, ym) {
  return supabase.from('bills').select('*')
    .eq('customer_id', customerId).eq('period_month', monthKey(ym))
    .is('deleted_at', null).maybeSingle()
}

export async function getBillLines(billId) {
  return supabase.from('bill_lines')
    .select('id, tiffin_type_id, label, qty, unit_price, line_total')
    .eq('bill_id', billId)
}

// The balance carried into this month = previous month's closing bill, else
// the customer's opening_balance. Positive = customer owes, negative = credit.
export async function getPreviousClosing(customerId, ym) {
  const prev = addMonths(ym, -1)
  const { data: prevBill } = await supabase.from('bills')
    .select('closing_balance').eq('customer_id', customerId)
    .eq('period_month', monthKey(prev)).is('deleted_at', null).maybeSingle()
  if (prevBill) return Number(prevBill.closing_balance || 0)
  const { data: b } = await getCustomerBilling(customerId)
  return Number(b?.opening_balance || 0)
}

export async function saveBill(bill, lines) {
  const { data, error } = await supabase.from('bills')
    .upsert(bill, { onConflict: 'customer_id,period_month' })
    .select('id').single()
  if (error) return { error }
  const billId = data.id
  await supabase.from('bill_lines').delete().eq('bill_id', billId)
  if (lines?.length) {
    const { error: lErr } = await supabase.from('bill_lines').insert(
      lines.map(l => ({
        bill_id: billId, tiffin_type_id: l.tiffin_type_id || null,
        label: l.label || null, qty: l.qty, unit_price: l.rate, line_total: l.total,
      })))
    if (lErr) return { error: lErr }
  }
  return { data: { id: billId } }
}

export async function listBills(ym) {
  return supabase.from('bills')
    .select('id, customer_id, computed_total, adjustments, opening_advance, amount_paid, total_due, closing_balance, status, customers ( name, mobile )')
    .eq('period_month', monthKey(ym)).is('deleted_at', null)
}

export async function setBillStatus(id, status) {
  const patch = { status }
  if (status === 'finalized') patch.finalized_at = new Date().toISOString()
  return supabase.from('bills').update(patch).eq('id', id)
}
// "Today" in India, as YYYY-MM-DD, computed locally to match the DB's today_ist.
export function todayIST() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  return parts // en-CA gives YYYY-MM-DD
}

export function addDays(dateStr, days) {
  // Work in UTC so the calendar date never shifts by the browser's timezone.
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
