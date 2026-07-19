import { useEffect, useState } from 'react'
import { useLang } from '../context/LanguageContext'
import { Spinner } from './ui'
import { RecordModal } from './Payments'
import { BillEditor } from './Billing'
import {
  getEntriesForCustomerRange, getCustomerRates, getTiffinTypes, getCustomerBilling,
  listPayments, monthBounds, currentMonthIST, addMonths, monthLabel, computeCharges, formatINR, balanceParts,
} from './api'

// A signed balance as clear words (no minus): "₹120 due" / "₹80 advance" / "Settled".
function balWords(signed, t) {
  const bp = balanceParts(signed)
  if (bp.kind === 'settled') return t('Settled', 'पूरा')
  return formatINR(bp.amount) + ' ' + (bp.kind === 'advance' ? t('advance', 'अग्रिम') : t('due', 'बकाया'))
}

const SLOT_LABEL = {
  morning: { en: 'Morning', hi: 'सुबह' },
  afternoon: { en: 'Afternoon', hi: 'दोपहर' },
  evening: { en: 'Evening', hi: 'शाम' },
}

// Full-page statement for one customer. This is the default view when a
// customer is tapped; "Edit details" opens the editable form.
export function CustomerStatement({ customer, onBack, onEdit, isAdmin }) {
  const { t, lang } = useLang()
  const [ym, setYm] = useState(currentMonthIST())
  const [loading, setLoading] = useState(true)
  const [calc, setCalc] = useState(null)
  const [plan, setPlan] = useState(null)
  const [monthPayments, setMonthPayments] = useState([])
  const [showRecord, setShowRecord] = useState(false)
  const [showBill, setShowBill] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let on = true
    async function load() {
      setLoading(true)
      const { start, end } = monthBounds(ym)
      const [entriesRes, ratesRes, typesRes, billingRes, paymentsRes] = await Promise.all([
        getEntriesForCustomerRange(customer.id, start, end),
        getCustomerRates(customer.id),
        getTiffinTypes(),
        getCustomerBilling(customer.id),
        listPayments({ customerId: customer.id }),
      ])
      if (!on) return

      const overrides = {}
      ;(ratesRes.data || []).forEach(r => { overrides[r.tiffin_type_id] = { half: r.price, full: r.full_price } })
      const c = computeCharges(entriesRes.data || [], overrides, typesRes.data || [])
      const lines = c.lines.map(l => ({
        name: lang === 'hi' && l.name_hi ? l.name_hi : l.name_en,
        qty: l.qty, rate: l.rate, total: l.total,
      }))
      const monthPays = (paymentsRes.data || []).filter(p => p.paid_on >= start && p.paid_on <= end)
      const paymentsMonth = monthPays.reduce((s, p) => s + Number(p.amount || 0), 0)
      const opening = billingRes.data?.opening_balance ?? 0

      setPlan(billingRes.data || null)
      setMonthPayments(monthPays)
      setCalc({
        lines, unspecified: c.unspecified, bySlot: c.bySlot, days: c.days, tiffins: c.tiffins,
        charges: c.charges, paymentsMonth, opening,
        balance: Number(opening) + c.charges - paymentsMonth,
      })
      setLoading(false)
    }
    load()
    return () => { on = false }
  }, [customer.id, ym, lang, tick])

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={onBack} className="text-saffron-dark font-medium text-sm">
          ‹ {t('Back', 'वापस')}
        </button>
        {isAdmin && (
          <button onClick={() => onEdit(customer)}
                  className="text-sm font-medium text-gray-600 border border-gray-300 rounded-full px-3 py-1.5">
            {t('Edit details', 'विवरण बदलें')}
          </button>
        )}
      </div>

      {/* Contact + plan */}
      <div className="bg-white rounded-xl shadow-card p-4">
        <h2 className="text-lg font-bold text-gray-800">{customer.name}</h2>
        <p className="text-sm text-gray-500">{customer.mobile}{customer.address ? ` · ${customer.address}` : ''}</p>
        {plan && (plan.plan_name || plan.plan_amount != null || plan.plan_notes) && (
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm space-y-0.5">
            {plan.plan_name && (
              <p className="text-gray-700">
                <span className="text-gray-400">{t('Plan', 'प्लान')}: </span>{plan.plan_name}
                {plan.plan_amount != null && <span> · {formatINR(plan.plan_amount)}/{t('mo', 'माह')}</span>}
              </p>
            )}
            {plan.plan_notes && <p className="text-gray-500 text-xs">{plan.plan_notes}</p>}
          </div>
        )}
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <button onClick={() => setYm(m => addMonths(m, -1))}
                className="px-3 py-1.5 rounded-lg bg-white shadow-card text-gray-600">‹</button>
        <span className="font-semibold text-gray-800">{monthLabel(ym, lang)}</span>
        <button onClick={() => setYm(m => addMonths(m, 1))}
                className="px-3 py-1.5 rounded-lg bg-white shadow-card text-gray-600">›</button>
      </div>

      {loading || !calc ? <Spinner /> : (
        <>
          {/* Balance summary */}
          <div className="bg-white rounded-xl shadow-card p-4 space-y-2 text-sm">
            <Row label={t('Opening balance', 'शुरुआती बकाया')} value={balWords(calc.opening, t)} />
            <Row label={t('Charges this month', 'इस महीने का शुल्क')} value={formatINR(calc.charges)} />
            <Row label={t('Payments this month', 'इस महीने भुगतान')} value={'− ' + formatINR(calc.paymentsMonth)} />
            <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
              <span className="font-semibold text-gray-800">{t('Current balance', 'मौजूदा बकाया')}</span>
              <span className={`text-xl font-bold ${balanceParts(calc.balance).kind === 'due' ? 'text-red-600' : 'text-tgreen-dark'}`}>
                {balWords(calc.balance, t)}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {balanceParts(calc.balance).kind === 'due'
                ? t('Amount the customer still owes.', 'ग्राहक पर बकाया राशि।')
                : balanceParts(calc.balance).kind === 'advance'
                  ? t('Customer has advance / credit.', 'ग्राहक का अग्रिम / जमा है।')
                  : t('Fully settled.', 'पूरा भुगतान।')}
            </p>
          </div>

          {isAdmin && (
            <button onClick={() => setShowBill(true)}
                    className="w-full py-2.5 rounded-lg bg-tgreen hover:bg-tgreen-dark text-white font-semibold text-sm">
              {t('Create / view bill for this month', 'इस महीने का बिल बनाएं / देखें')}
            </button>
          )}

          {/* Served breakdown */}
          <div className="bg-white rounded-xl shadow-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">{t('Served this month', 'इस महीने दिया गया')}</p>
              <p className="text-xs text-gray-400">
                {t(`${calc.days} day(s) · ${calc.tiffins} tiffin(s)`, `${calc.days} दिन · ${calc.tiffins} टिफिन`)}
              </p>
            </div>

            {/* Per-slot counts */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {Object.entries(calc.bySlot).map(([slot, n]) => (
                <div key={slot} className="bg-cream rounded-lg py-2 text-center">
                  <p className="text-[11px] text-gray-500">{t(SLOT_LABEL[slot].en, SLOT_LABEL[slot].hi)}</p>
                  <p className="font-bold text-gray-800">{n}</p>
                </div>
              ))}
            </div>

            {calc.lines.length === 0 ? (
              <p className="text-sm text-gray-400">{t('Nothing served this month.', 'इस महीने कुछ नहीं दिया।')}</p>
            ) : (
              <div className="space-y-1">
                {calc.lines.map((l, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{l.name}
                      <span className="text-gray-400"> · {l.qty} × {formatINR(l.rate)}</span></span>
                    <span className="font-medium text-gray-800">{formatINR(l.total)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm border-t border-gray-100 pt-1 mt-1">
                  <span className="font-semibold text-gray-700">{t('Total charges', 'कुल शुल्क')}</span>
                  <span className="font-bold text-gray-800">{formatINR(calc.charges)}</span>
                </div>
                {calc.unspecified > 0 && (
                  <p className="text-xs text-amber-600 pt-1">
                    {t(`${calc.unspecified} entr(ies) have no item set — not charged.`,
                       `${calc.unspecified} एंट्री में आइटम नहीं चुना — शुल्क नहीं जोड़ा।`)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Payments this month */}
          <div className="bg-white rounded-xl shadow-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">{t('Payments this month', 'इस महीने भुगतान')}</p>
              <button onClick={() => setShowRecord(true)}
                      className="text-sm font-semibold text-saffron-dark">
                + {t('Record', 'दर्ज करें')}
              </button>
            </div>
            {monthPayments.length === 0 ? (
              <p className="text-sm text-gray-400">{t('No payments this month.', 'इस महीने कोई भुगतान नहीं।')}</p>
            ) : (
              <div className="space-y-1">
                {monthPayments.map(p => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span className="text-gray-500">{p.paid_on}{p.method ? ` · ${p.method}` : ''}</span>
                    <span className="font-medium text-tgreen-dark">{formatINR(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400">
            {t('Plan freebies (e.g. weekly chicken) are not auto-deducted — adjust manually. Formal monthly bills with automatic carry-over are coming next.',
               'प्लान में शामिल चीज़ें (जैसे साप्ताहिक चिकन) अपने-आप नहीं घटतीं — हाथ से समायोजित करें। कैरी-ओवर के साथ औपचारिक मासिक बिल जल्द आ रहे हैं।')}
          </p>
        </>
      )}

      {showRecord && (
        <RecordModal lockedCustomer={customer} customers={[customer]}
                     onClose={() => setShowRecord(false)}
                     onSaved={() => { setShowRecord(false); setTick(x => x + 1) }} />
      )}

      {showBill && (
        <BillEditor customer={customer} ym={ym}
                    onClose={() => setShowBill(false)}
                    onSaved={() => { setShowBill(false); setTick(x => x + 1) }} />
      )}
    </div>
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
