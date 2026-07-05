import { useEffect, useState, useCallback } from 'react'
import { useLang } from '../context/LanguageContext'
import { useAuth } from './AuthContext'
import { Modal, Spinner, EmptyState } from './ui'
import {
  getEntriesForCustomerRange, getCustomerRates, getTiffinTypes, listPayments,
  getBill, getBillLines, getPreviousClosing, saveBill, listBills, listCustomers,
  computeCharges, monthBounds, currentMonthIST, addMonths, monthLabel, formatINR, balanceParts,
} from './api'

const STATUS = {
  draft:     { en: 'Draft', hi: 'ड्राफ्ट', cls: 'bg-gray-100 text-gray-600' },
  finalized: { en: 'Finalized', hi: 'फाइनल', cls: 'bg-blue-100 text-blue-700' },
  sent:      { en: 'Sent', hi: 'भेजा', cls: 'bg-amber-100 text-amber-700' },
  paid:      { en: 'Paid', hi: 'भुगतान', cls: 'bg-tgreen/15 text-tgreen-dark' },
}

function waNumber(mobile) {
  const d = String(mobile || '').replace(/\D/g, '')
  return d.length === 10 ? '91' + d : d
}

// ---- The bill editor (create / edit / finalize / send) ---------------------
export function BillEditor({ customer, ym, onClose, onSaved }) {
  const { t, lang } = useLang()
  const [loading, setLoading] = useState(true)
  const [lines, setLines] = useState([])       // {key, tiffin_type_id, label, qty, rate}
  const [dir, setDir] = useState('due')         // previous balance: 'due' | 'advance'
  const [openingAmt, setOpeningAmt] = useState('0')
  const [paymentsMonth, setPaymentsMonth] = useState(0)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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
      ;(ratesRes.data || []).forEach(r => { overrides[r.tiffin_type_id] = r.price })
      const types = typesRes.data || []
      const typeName = (id) => {
        const tt = types.find(x => x.id === id)
        return tt ? (lang === 'hi' && tt.name_hi ? tt.name_hi : tt.name_en) : ''
      }
      const payMonth = (paymentsRes.data || [])
        .filter(p => p.paid_on >= start && p.paid_on <= end)
        .reduce((s, p) => s + Number(p.amount || 0), 0)
      setPaymentsMonth(payMonth)

      const bill = billRes.data
      let initLines, openingSigned
      if (bill) {
        const { data: bl } = await getBillLines(bill.id)
        if (!on) return
        initLines = (bl || []).map((l, i) => ({
          key: l.id || 'l' + i,
          tiffin_type_id: l.tiffin_type_id,
          label: l.label || typeName(l.tiffin_type_id) || '',
          qty: String(l.qty ?? 1),
          rate: String(l.unit_price ?? 0),
        }))
        openingSigned = Number(bill.opening_advance || 0)
        setNotes(bill.notes || '')
      } else {
        const c = computeCharges(entriesRes.data || [], overrides, types)
        initLines = c.lines.map((l, i) => ({
          key: 'l' + i,
          tiffin_type_id: l.tiffin_type_id,
          label: lang === 'hi' && l.name_hi ? l.name_hi : l.name_en,
          qty: String(l.qty),
          rate: String(l.rate),
        }))
        openingSigned = Number(prevClosing || 0)
      }
      const bp = balanceParts(openingSigned)
      setDir(bp.kind === 'advance' ? 'advance' : 'due')
      setOpeningAmt(String(bp.amount))
      setLines(initLines)
      setLoading(false)
    }
    load()
    return () => { on = false }
  }, [customer.id, ym, lang])

  const charges = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0)
  const openingSigned = dir === 'advance' ? -Number(openingAmt || 0) : Number(openingAmt || 0)
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
  async function handleWhatsApp() {
    if (!(await persist('sent'))) return
    const L = [t('Aditya Tiffin Service', 'आदित्य टिफिन सेवा'),
               t('Bill', 'बिल') + ' — ' + monthLabel(ym, lang), customer.name, '']
    const op = balanceParts(openingSigned)
    if (op.kind === 'due') L.push(t('Previous balance', 'पिछला बकाया') + ': ' + formatINR(op.amount) + ' ' + t('due', 'बकाया'))
    else if (op.kind === 'advance') L.push(t('Previous advance', 'पिछला अग्रिम') + ': ' + formatINR(op.amount))
    L.push(t('This month:', 'इस महीने:'))
    linesPayload().forEach(l => L.push(`  ${l.label || ''}: ${l.qty} × ${formatINR(l.rate)} = ${formatINR(l.total)}`))
    L.push(t('Charges', 'शुल्क') + ': ' + formatINR(charges))
    if (paymentsMonth) L.push(t('Paid', 'भुगतान') + ': − ' + formatINR(paymentsMonth))
    L.push('————————')
    if (closingParts.kind === 'due') L.push(t('Balance due', 'कुल बकाया') + ': ' + formatINR(closingParts.amount))
    else if (closingParts.kind === 'advance') L.push(t('Advance balance', 'अग्रिम शेष') + ': ' + formatINR(closingParts.amount))
    else L.push(t('Fully settled', 'पूरा भुगतान'))
    L.push('', t('Thank you!', 'धन्यवाद!'))
    window.open(`https://wa.me/${waNumber(customer.mobile)}?text=${encodeURIComponent(L.join('\n'))}`, '_blank')
    onSaved()
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
        </div>

        {/* Previous balance: Owes / Advance + amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('Previous balance', 'पिछला बकाया')}</label>
          <div className="flex gap-2">
            <div className="flex rounded-lg overflow-hidden border border-gray-300 shrink-0">
              <button onClick={() => setDir('due')}
                      className={`px-3 py-2 text-sm ${dir === 'due' ? 'bg-red-600 text-white' : 'bg-white text-gray-600'}`}>
                {t('Owes', 'बकाया')}
              </button>
              <button onClick={() => setDir('advance')}
                      className={`px-3 py-2 text-sm ${dir === 'advance' ? 'bg-tgreen text-white' : 'bg-white text-gray-600'}`}>
                {t('Advance', 'अग्रिम')}
              </button>
            </div>
            <input type="number" inputMode="numeric" value={openingAmt} onChange={e => setOpeningAmt(e.target.value)}
                   className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-right" />
          </div>
          <p className="text-xs text-gray-400 mt-1">{t('Carried from last month.', 'पिछले महीने से।')}</p>
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
               value={formatINR(Number(openingAmt || 0)) + ' ' + (dir === 'advance' ? t('advance', 'अग्रिम') : t('due', 'बकाया'))} />
          <Row label={t('Charges this month', 'इस महीने शुल्क')} value={formatINR(charges)} />
          <Row label={t('Payments this month', 'इस महीने भुगतान')} value={'− ' + formatINR(paymentsMonth)} />
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

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => handleSave('draft')} disabled={busy}
                  className="py-2.5 rounded-lg border border-gray-300 font-medium text-gray-700">{t('Save draft', 'ड्राफ्ट सेव')}</button>
          <button onClick={() => handleSave('finalized')} disabled={busy}
                  className="py-2.5 rounded-lg font-semibold text-white bg-saffron hover:bg-saffron-dark">{t('Finalize', 'फाइनल करें')}</button>
          <button onClick={handleWhatsApp} disabled={busy}
                  className="py-2.5 rounded-lg font-semibold text-white bg-tgreen hover:bg-tgreen-dark">{t('Send on WhatsApp', 'WhatsApp भेजें')}</button>
          <button onClick={() => handleSave('paid')} disabled={busy}
                  className="py-2.5 rounded-lg border border-tgreen text-tgreen-dark font-medium">{t('Mark paid', 'भुगतान हुआ')}</button>
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
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [editorFor, setEditorFor] = useState(null)
  const [picking, setPicking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await listBills(ym)
    setBills(data || [])
    setLoading(false)
  }, [ym])
  useEffect(() => { load() }, [load])

  if (!canSeeMoney) {
    return <EmptyState text={t('Bills are only visible to the owner and admin.',
                              'बिल केवल मालिक और एडमिन को दिखते हैं।')} />
  }

  const outstanding = bills.reduce((s, b) => s + Math.max(0, Number(b.closing_balance || 0)), 0)

  return (
    <div className="space-y-4 pb-4">
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
