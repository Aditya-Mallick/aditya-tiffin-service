import { useEffect, useState, useCallback } from 'react'
import { useLang } from '../context/LanguageContext'
import { useAuth } from './AuthContext'
import { Modal, Spinner, EmptyState } from './ui'
import { AttendanceGrid, attendanceTextLines } from './AttendanceGrid'
import { useCachedLoad } from './useCachedLoad'
import {
  getEntriesForCustomerRange, getCustomerRates, getTiffinTypes, listPayments,
  getBill, getBillLines, getPreviousClosing, saveBill, listBills, listCustomers,
  computeCharges, monthBounds, currentMonthIST, addMonths, monthLabel, formatINR, balanceParts,
} from './api'

const STATUS = {
  saved:     { en: 'Saved', hi: 'सेव', cls: 'bg-gray-100 text-gray-600' },
  sent:      { en: 'Sent', hi: 'भेजा', cls: 'bg-tgreen/15 text-tgreen-dark' },
  // legacy statuses (from before) map to a sensible label
  draft:     { en: 'Saved', hi: 'सेव', cls: 'bg-gray-100 text-gray-600' },
  finalized: { en: 'Saved', hi: 'सेव', cls: 'bg-gray-100 text-gray-600' },
  paid:      { en: 'Sent', hi: 'भेजा', cls: 'bg-tgreen/15 text-tgreen-dark' },
}

function waNumber(mobile) {
  let d = String(mobile || '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)                 // 00 intl prefix
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1) // domestic 0 prefix
  if (d.length === 10) d = '91' + d                      // bare 10-digit → add 91
  return d
}

// ---- The bill editor (create / edit / finalize / send) ---------------------
export function BillEditor({ customer, ym, onClose, onSaved }) {
  const { t, lang } = useLang()
  const [loading, setLoading] = useState(true)
  const [lines, setLines] = useState([])       // {key, tiffin_type_id, label, qty, rate}
  // Previous balance is derived (last month's bill, else everything still
  // owed before this month) — never typed in, so it can't drift.
  const [opening, setOpening] = useState(0)
  const [computedLines, setComputedLines] = useState([])   // straight from the daily lists
  const [paymentsMonth, setPaymentsMonth] = useState(0)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [rawEntries, setRawEntries] = useState([])
  const [allTypes, setAllTypes] = useState([])
  const [showAttendance, setShowAttendance] = useState(false)

  useEffect(() => {
    let on = true
    async function load() {
      setLoading(true)
      const { start, end } = monthBounds(ym)
      const [entriesRes, ratesRes, typesRes, paymentsRes, billRes, prevClosing] = await Promise.all([
        getEntriesForCustomerRange(customer.id, start, end),
        getCustomerRates(customer.id),
        getTiffinTypes(),
        listPayments({ customerId: customer.id }),
        getBill(customer.id, ym),
        getPreviousClosing(customer.id, ym),
      ])
      if (!on) return
      const overrides = {}
      ;(ratesRes.data || []).forEach(r => { overrides[r.tiffin_type_id] = { half: r.price, full: r.full_price } })
      const types = typesRes.data || []
      setRawEntries(entriesRes.data || [])
      setAllTypes(types)
      const typeName = (id) => {
        const tt = types.find(x => x.id === id)
        return tt ? (lang === 'hi' && tt.name_hi ? tt.name_hi : tt.name_en) : ''
      }
      const payMonth = (paymentsRes.data || [])
        .filter(p => p.paid_on >= start && p.paid_on <= end)
        .reduce((s, p) => s + Number(p.amount || 0), 0)
      setPaymentsMonth(payMonth)

      // What the daily lists say right now — used for a fresh bill, and to
      // offer a refresh if a saved bill has since gone out of date.
      const c = computeCharges(entriesRes.data || [], overrides, types)
      const fresh = c.lines.map((l, i) => ({
        key: 'c' + i,
        tiffin_type_id: l.tiffin_type_id,
        label: lang === 'hi' && l.name_hi ? l.name_hi : l.name_en,
        qty: String(l.qty),
        rate: String(l.rate),
      }))
      setComputedLines(fresh)

      const bill = billRes.data
      let initLines = fresh
      if (bill) {
        const { data: bl } = await getBillLines(bill.id)
        if (!on) return
        if (bl?.length) {
          initLines = bl.map((l, i) => ({
            key: l.id || 'l' + i,
            tiffin_type_id: l.tiffin_type_id,
            label: l.label || typeName(l.tiffin_type_id) || '',
            qty: String(l.qty ?? 1),
            rate: String(l.unit_price ?? 0),
          }))
        }
        setNotes(bill.notes || '')
      }
      // Always the live figure, even for a saved bill.
      setOpening(Number(prevClosing || 0))
      setLines(initLines)
      setLoading(false)
    }
    load()
    return () => { on = false }
  }, [customer.id, ym, lang])

  const sumOf = (ls) => ls.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0)
  const charges = sumOf(lines)
  const computedCharges = sumOf(computedLines)
  const outOfDate = Math.abs(computedCharges - charges) > 0.005
  const openingSigned = opening
  const totalDue = openingSigned + charges
  const closing = totalDue - paymentsMonth
  const closingParts = balanceParts(closing)

  const updateLine = (key, field, value) =>
    setLines(ls => ls.map(l => l.key === key ? { ...l, [field]: value } : l))
  const removeLine = (key) => setLines(ls => ls.filter(l => l.key !== key))
  const addLine = () =>
    setLines(ls => [...ls, { key: 'new-' + Date.now(), tiffin_type_id: null, label: '', qty: '1', rate: '' }])

  const linesPayload = () => lines
    .filter(l => (l.label || '').trim() || Number(l.qty) > 0)
    .map(l => {
      const qty = Number(l.qty) || 0, rate = Number(l.rate) || 0
      return { tiffin_type_id: l.tiffin_type_id || null, label: (l.label || '').trim() || null, qty, rate, total: qty * rate }
    })

  const billRow = (status) => ({
    customer_id: customer.id, period_month: `${ym}-01`,
    computed_total: charges, adjustments: 0, opening_advance: openingSigned,
    amount_paid: paymentsMonth, total_due: totalDue, closing_balance: closing,
    status, notes: notes || null,
  })

  async function persist(status) {
    setBusy(true); setError('')
    const { error } = await saveBill(billRow(status), linesPayload())
    setBusy(false)
    if (error) { setError(error.message); return false }
    return true
  }
  async function handleSave(status) {
    const ok = await persist(status)
    if (ok && status !== 'sent') onSaved()
  }
  function buildBillMessage() {
    const L = [t('Aditya Tiffin Service', 'आदित्य टिफिन सेवा'),
               t('Bill', 'बिल') + ' — ' + monthLabel(ym, lang), customer.name, '']
    const op = balanceParts(openingSigned)
    if (op.kind === 'due') L.push(t('Previous balance due', 'पिछला बकाया') + ': ' + formatINR(op.amount))
    else if (op.kind === 'advance') L.push(t('Advance with us', 'हमारे पास अग्रिम') + ': ' + formatINR(op.amount))
    L.push('', t('This month:', 'इस महीने:'))
    linesPayload().forEach(l => L.push(`  ${l.label || ''}: ${l.qty} × ${formatINR(l.rate)} = ${formatINR(l.total)}`))
    L.push(t('Total charges', 'कुल शुल्क') + ': ' + formatINR(charges))
    if (paymentsMonth) L.push(t('Payment received', 'प्राप्त भुगतान') + ': ' + formatINR(paymentsMonth))
    L.push('————————')
    if (closingParts.kind === 'due') L.push(t('Balance due', 'कुल बकाया') + ': ' + formatINR(closingParts.amount))
    else if (closingParts.kind === 'advance') L.push(t('Advance balance', 'अग्रिम शेष') + ': ' + formatINR(closingParts.amount))
    else L.push(t('Fully settled', 'पूरा भुगतान'))
    const att = attendanceTextLines(rawEntries, allTypes, ym, lang)
    if (att.length) {
      L.push('', t('Day-wise details:', 'दिन-वार विवरण:'))
      // ``` keeps WhatsApp's monospace font so the columns stay aligned.
      L.push('```')
      att.forEach(l => L.push(l))
      L.push('```')
      L.push(t('✓ = Veg · - = not taken · ½ = half · F = full',
               '✓ = वेज · - = नहीं लिया · ½ = हाफ · F = फुल'))
    }
    L.push('', t('Thank you!', 'धन्यवाद!'))
    return L.join('\n')
  }

  function handleWhatsApp() {
    // Open the customer's WhatsApp chat immediately on tap (a pop-up opened
    // after an await gets blocked by the browser), then save in the background.
    const url = `https://wa.me/${waNumber(customer.mobile)}?text=${encodeURIComponent(buildBillMessage())}`
    window.open(url, '_blank')
    persist('sent').then((ok) => { if (ok) onSaved() })
  }

  if (loading) return <Modal open onClose={onClose} title={customer.name}><Spinner /></Modal>

  return (
    <Modal open onClose={onClose} title={`${customer.name} · ${monthLabel(ym, lang)}`}>
      <div className="space-y-4">
        {/* Editable line items */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1">{t('Items & rates', 'आइटम और दरें')}</p>
          <p className="text-xs text-gray-400 mb-2">
            {t('Prefilled from what was served. Change qty or rate, rename, or add lines.',
               'जो दिया गया उससे भरा है। मात्रा/दर बदलें, नाम बदलें, या लाइन जोड़ें।')}
          </p>
          <div className="space-y-2">
            {lines.map(l => (
              <div key={l.key} className="flex items-center gap-1.5">
                <input value={l.label} onChange={e => updateLine(l.key, 'label', e.target.value)}
                       placeholder={t('Item', 'आइटम')}
                       className="flex-1 min-w-0 rounded-lg border border-gray-300 px-2 py-2 text-sm" />
                <input type="number" inputMode="numeric" value={l.qty} onChange={e => updateLine(l.key, 'qty', e.target.value)}
                       className="w-11 rounded-lg border border-gray-300 px-1 py-2 text-sm text-center" />
                <span className="text-gray-400 text-sm">×</span>
                <input type="number" inputMode="numeric" value={l.rate} onChange={e => updateLine(l.key, 'rate', e.target.value)}
                       placeholder="₹" className="w-16 rounded-lg border border-gray-300 px-1 py-2 text-sm text-right" />
                <button onClick={() => removeLine(l.key)} className="text-red-400 px-1 text-xl leading-none">×</button>
              </div>
            ))}
          </div>
          <button onClick={addLine} className="mt-2 text-saffron-dark text-sm font-medium">
            + {t('Add item', 'आइटम जोड़ें')}
          </button>
          <div className="flex justify-between text-sm font-semibold border-t border-gray-100 mt-2 pt-2">
            <span>{t('Charges this month', 'इस महीने शुल्क')}</span><span>{formatINR(charges)}</span>
          </div>

          {outOfDate && (
            <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2">
              <p className="text-xs text-amber-800">
                {t(`The daily lists now add up to ${formatINR(computedCharges)}. This saved bill still shows ${formatINR(charges)}.`,
                   `रोज़ की सूची अब ${formatINR(computedCharges)} बनती है। इस सेव बिल में ${formatINR(charges)} है।`)}
              </p>
              <button onClick={() => setLines(computedLines.map(l => ({ ...l, key: l.key + '-r' })))}
                      className="mt-1 text-xs font-semibold text-saffron-dark">
                {t('Update items from daily lists', 'रोज़ की सूची से अपडेट करें')}
              </button>
            </div>
          )}
        </div>

        {/* Previous balance — worked out automatically, not typed in */}
        <div className="bg-cream rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{t('Previous balance', 'पिछला बकाया')}</span>
            <span className={`text-sm font-bold ${
              balanceParts(opening).kind === 'due' ? 'text-red-600' : 'text-tgreen-dark'}`}>
              {balanceParts(opening).kind === 'settled'
                ? t('Settled', 'पूरा')
                : formatINR(balanceParts(opening).amount) + ' ' +
                  (balanceParts(opening).kind === 'advance' ? t('advance', 'अग्रिम') : t('due', 'बकाया'))}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {t('Carried forward automatically. To correct it, edit the customer’s opening balance or their payments.',
               'अपने-आप आगे लाया गया। बदलने के लिए ग्राहक का शुरुआती बकाया या भुगतान सुधारें।')}
          </p>
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('Note on bill (optional)', 'बिल पर नोट (वैकल्पिक)')}</label>
          <input value={notes} onChange={e => setNotes(e.target.value)}
                 className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm" />
        </div>

        {/* Totals */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm space-y-1">
          <Row label={t('Previous balance', 'पिछला बकाया')}
               value={balanceParts(opening).kind === 'settled'
                 ? t('Settled', 'पूरा')
                 : formatINR(balanceParts(opening).amount) + ' ' +
                   (balanceParts(opening).kind === 'advance' ? t('advance', 'अग्रिम') : t('due', 'बकाया'))} />
          <Row label={t('Charges this month', 'इस महीने शुल्क')} value={formatINR(charges)} />
          <Row label={t('Payment received', 'प्राप्त भुगतान')} value={formatINR(paymentsMonth)} />
          <div className="flex justify-between border-t border-gray-200 pt-1 items-center">
            <span className="font-semibold text-gray-800">
              {closingParts.kind === 'advance' ? t('Advance balance', 'अग्रिम शेष') : t('Balance due', 'कुल बकाया')}
            </span>
            <span className={`text-lg font-bold ${closingParts.kind === 'due' ? 'text-red-600' : 'text-tgreen-dark'}`}>
              {closingParts.kind === 'settled'
                ? t('Settled', 'पूरा')
                : formatINR(closingParts.amount) + (closingParts.kind === 'advance' ? ' ' + t('advance', 'अग्रिम') : '')}
            </span>
          </div>
        </div>

        {/* Day-by-day attendance (collapsible) */}
        <div>
          <button onClick={() => setShowAttendance(v => !v)} className="text-saffron-dark text-sm font-medium">
            {showAttendance ? t('Hide day-by-day', 'दिन-प्रतिदिन छिपाएं') : t('View day-by-day', 'दिन-प्रतिदिन देखें')}
          </button>
          {showAttendance && (
            <div className="mt-2">
              <AttendanceGrid entries={rawEntries} types={allTypes} ym={ym} lang={lang} />
            </div>
          )}
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => handleSave('saved')} disabled={busy}
                  className="py-2.5 rounded-lg border border-gray-300 font-medium text-gray-700">{t('Save', 'सेव करें')}</button>
          <button onClick={handleWhatsApp} disabled={busy}
                  className="py-2.5 rounded-lg font-semibold text-white bg-tgreen hover:bg-tgreen-dark">{t('Send on WhatsApp', 'WhatsApp भेजें')}</button>
        </div>
        <button onClick={onClose} className="w-full text-gray-500 text-sm">{t('Close', 'बंद करें')}</button>
      </div>
    </Modal>
  )
}

// ---- Bills tab (month overview + create) -----------------------------------
export default function Bills() {
  const { t, lang } = useLang()
  const { canSeeMoney } = useAuth()
  const [ym, setYm] = useState(currentMonthIST())
  const [editorFor, setEditorFor] = useState(null)
  const [picking, setPicking] = useState(false)

  const q = useCachedLoad(`bills:${ym}`, async () => {
    const { data } = await listBills(ym)
    return data || []
  })
  const bills = q.data || []
  const loading = q.loading
  const load = q.reload

  if (!canSeeMoney) {
    return <EmptyState text={t('Bills are only visible to the owner and admin.',
                              'बिल केवल मालिक और एडमिन को दिखते हैं।')} />
  }

  const outstanding = bills.reduce((s, b) => s + Math.max(0, Number(b.closing_balance || 0)), 0)

  return (
    <div className="space-y-4 pb-4">
      <div className="sticky top-0 z-20 bg-cream -mx-4 px-4 py-2 border-b border-black/5 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">{t('Bills', 'बिल')}</h2>
        <button onClick={() => setPicking(true)}
                className="bg-saffron hover:bg-saffron-dark text-white text-sm font-semibold rounded-full px-4 py-2">
          + {t('Create bill', 'बिल बनाएं')}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => setYm(m => addMonths(m, -1))}
                className="px-3 py-1.5 rounded-lg bg-white shadow-card text-gray-600">‹</button>
        <span className="font-semibold text-gray-800">{monthLabel(ym, lang)}</span>
        <button onClick={() => setYm(m => addMonths(m, 1))}
                className="px-3 py-1.5 rounded-lg bg-white shadow-card text-gray-600">›</button>
      </div>

      <div className="bg-white rounded-xl shadow-card p-3 text-center">
        <p className="text-xs text-gray-500">{t('Total outstanding this month', 'इस महीने कुल बकाया')}</p>
        <p className="text-lg font-bold text-red-600">{formatINR(outstanding)}</p>
      </div>
      </div>

      {loading ? <Spinner /> : bills.length === 0 ? (
        <EmptyState text={t('No bills for this month yet. Tap “Create bill”.',
                            'इस महीने कोई बिल नहीं। “बिल बनाएं” दबाएं।')} />
      ) : (
        <div className="space-y-2">
          {bills.map(b => {
            const bp = balanceParts(b.closing_balance)
            return (
              <button key={b.id}
                onClick={() => setEditorFor({ id: b.customer_id, name: b.customers?.name, mobile: b.customers?.mobile })}
                className="w-full text-left bg-white rounded-xl shadow-card p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{b.customers?.name}</p>
                  <span className={`inline-block text-[11px] rounded-full px-2 py-0.5 mt-1 ${STATUS[b.status]?.cls}`}>
                    {t(STATUS[b.status]?.en, STATUS[b.status]?.hi)}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold ${bp.kind === 'due' ? 'text-red-600' : 'text-tgreen-dark'}`}>
                    {bp.kind === 'settled' ? t('Settled', 'पूरा') : formatINR(bp.amount)}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {bp.kind === 'advance' ? t('advance', 'अग्रिम') : bp.kind === 'due' ? t('balance due', 'बकाया') : ''}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {picking && (
        <CustomerPicker onClose={() => setPicking(false)}
                        onPick={(c) => { setPicking(false); setEditorFor(c) }} />
      )}
      {editorFor && (
        <BillEditor customer={editorFor} ym={ym}
                    onClose={() => setEditorFor(null)}
                    onSaved={() => { setEditorFor(null); load() }} />
      )}
    </div>
  )
}

function CustomerPicker({ onClose, onPick }) {
  const { t } = useLang()
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  useEffect(() => { listCustomers().then(({ data }) => setCustomers(data || [])) }, [])
  const q = search.trim().toLowerCase()
  const list = customers.filter(c => !q || c.name.toLowerCase().includes(q) || (c.mobile || '').includes(q))
  return (
    <Modal open onClose={onClose} title={t('Pick a customer', 'ग्राहक चुनें')}>
      <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
             placeholder={t('Search name or mobile…', 'नाम या मोबाइल खोजें…')}
             className="w-full rounded-lg border border-gray-300 px-4 py-2.5 mb-3 text-sm" />
      <div className="max-h-72 overflow-y-auto space-y-1">
        {list.map(c => (
          <button key={c.id} onClick={() => onPick(c)}
                  className="w-full text-left bg-cream rounded-lg px-3 py-2 text-sm">
            <span className="font-medium text-gray-800">{c.name}</span>
            <span className="text-gray-400"> · {c.mobile}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  )
}
