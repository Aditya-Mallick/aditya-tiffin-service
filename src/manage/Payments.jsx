import { useEffect, useState, useCallback } from 'react'
import { Trash2 } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { useAuth } from './AuthContext'
import { Modal, Spinner, EmptyState, UndoToast } from './ui'
import {
  listPayments, addPayment, softRemovePayment, restorePayment,
  listCustomers, getCustomerBilling, todayIST, formatINR, balanceParts,
} from './api'

const METHODS = [
  { key: 'Cash', en: 'Cash', hi: 'नकद' },
  { key: 'UPI', en: 'UPI', hi: 'UPI' },
  { key: 'Bank', en: 'Bank transfer', hi: 'बैंक' },
  { key: 'Other', en: 'Other', hi: 'अन्य' },
]

export default function Payments() {
  const { t } = useLang()
  const { canSeeMoney } = useAuth()

  const [payments, setPayments] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterCustomer, setFilterCustomer] = useState('')   // customer_id or ''
  const [opening, setOpening] = useState(null)               // opening balance of filtered customer
  const [recording, setRecording] = useState(false)
  const [undo, setUndo] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: ps }, { data: cs }] = await Promise.all([
      listPayments({ customerId: filterCustomer || undefined }),
      listCustomers({ includeArchived: true }),
    ])
    setPayments(ps || [])
    setCustomers(cs || [])
    setLoading(false)
  }, [filterCustomer])

  useEffect(() => { load() }, [load])

  // Opening balance for the filtered customer.
  useEffect(() => {
    let on = true
    async function loadOpening() {
      if (!filterCustomer) { setOpening(null); return }
      const { data } = await getCustomerBilling(filterCustomer)
      if (on) setOpening(data?.opening_balance ?? 0)
    }
    loadOpening()
    return () => { on = false }
  }, [filterCustomer])

  if (!canSeeMoney) {
    return (
      <EmptyState text={t('Payments are only visible to the owner and admin.',
                          'भुगतान केवल मालिक और एडमिन को दिखते हैं।')} />
    )
  }

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0)

  async function handleRemove(p) {
    await softRemovePayment(p.id)
    setPayments(ps => ps.filter(x => x.id !== p.id))
    setUndo({ message: t(`Removed ${formatINR(p.amount)} payment`, `${formatINR(p.amount)} का भुगतान हटाया`), id: p.id })
  }
  async function doUndo() {
    if (!undo) return
    await restorePayment(undo.id)
    setUndo(null); load()
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">{t('Payments', 'भुगतान')}</h2>
        <button onClick={() => setRecording(true)}
                className="bg-saffron hover:bg-saffron-dark text-white text-sm font-semibold rounded-full px-4 py-2">
          + {t('Record', 'दर्ज करें')}
        </button>
      </div>

      <select value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 bg-white text-sm">
        <option value="">{t('All customers', 'सभी ग्राहक')}</option>
        {customers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.mobile}</option>)}
      </select>

      {/* Totals */}
      <div className="bg-white rounded-xl shadow-card p-4 flex items-center justify-around text-center">
        <div>
          <p className="text-xs text-gray-500">{t('Total received', 'कुल प्राप्त')}</p>
          <p className="text-lg font-bold text-tgreen-dark">{formatINR(totalPaid)}</p>
        </div>
        {filterCustomer && opening != null && (() => {
          const bp = balanceParts(opening)
          return (
            <div>
              <p className="text-xs text-gray-500">{t('Opening balance', 'शुरुआती बकाया')}</p>
              <p className={`text-lg font-bold ${bp.kind === 'due' ? 'text-red-600' : 'text-tgreen-dark'}`}>
                {bp.kind === 'settled' ? t('Settled', 'पूरा')
                  : formatINR(bp.amount) + ' ' + (bp.kind === 'advance' ? t('advance', 'अग्रिम') : t('due', 'बकाया'))}
              </p>
            </div>
          )
        })()}
      </div>

      {loading ? <Spinner /> : payments.length === 0 ? (
        <EmptyState text={t('No payments recorded yet.', 'अभी कोई भुगतान दर्ज नहीं।')} />
      ) : (
        <div className="space-y-2">
          {payments.map(p => (
            <div key={p.id} className="bg-white rounded-xl shadow-card p-3 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{p.customers?.name}</p>
                <p className="text-xs text-gray-400">
                  {p.paid_on}{p.method ? ` · ${p.method}` : ''}{p.note ? ` · ${p.note}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-tgreen-dark">{formatINR(p.amount)}</span>
                <button onClick={() => handleRemove(p)} aria-label={t('Remove', 'हटाएं')}
                        className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {recording && (
        <RecordModal customers={customers} onClose={() => setRecording(false)}
                     onSaved={() => { setRecording(false); load() }} />
      )}

      <UndoToast message={undo?.message} onUndo={doUndo} onDismiss={() => setUndo(null)} />
    </div>
  )
}

export function RecordModal({ customers, onClose, onSaved, lockedCustomer }) {
  const { t } = useLang()
  const [customerId, setCustomerId] = useState(lockedCustomer?.id || '')
  const [search, setSearch] = useState('')
  const [amount, setAmount] = useState('')
  const [paidOn, setPaidOn] = useState(todayIST())
  const [method, setMethod] = useState('Cash')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const q = search.trim().toLowerCase()
  const matches = customers.filter(c =>
    !q || c.name.toLowerCase().includes(q) || (c.mobile || '').includes(q))
  const chosen = lockedCustomer || customers.find(c => c.id === customerId)

  async function save() {
    setError('')
    if (!customerId) { setError(t('Pick a customer.', 'ग्राहक चुनें।')); return }
    if (!(Number(amount) > 0)) { setError(t('Enter an amount.', 'राशि डालें।')); return }
    setBusy(true)
    const { error } = await addPayment({ customer_id: customerId, amount, paid_on: paidOn, method, note })
    setBusy(false)
    if (error) { setError(error.message); return }
    onSaved()
  }

  return (
    <Modal open onClose={onClose} title={t('Record payment', 'भुगतान दर्ज करें')}>
      <div className="space-y-4">
        {/* Customer picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('Customer', 'ग्राहक')}</label>
          {chosen ? (
            <div className="flex items-center justify-between bg-cream rounded-lg px-4 py-2.5">
              <span className="text-sm"><span className="font-medium">{chosen.name}</span>
                <span className="text-gray-400"> · {chosen.mobile}</span></span>
              {!lockedCustomer && (
                <button onClick={() => setCustomerId('')} className="text-saffron-dark text-sm font-medium">
                  {t('Change', 'बदलें')}
                </button>
              )}
            </div>
          ) : (
            <>
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                     placeholder={t('Search name or mobile…', 'नाम या मोबाइल खोजें…')}
                     className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm" />
              {q && (
                <div className="max-h-40 overflow-y-auto mt-2 space-y-1">
                  {matches.slice(0, 20).map(c => (
                    <button key={c.id} onClick={() => { setCustomerId(c.id); setSearch('') }}
                            className="w-full text-left bg-cream rounded-lg px-3 py-2 text-sm">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-gray-400"> · {c.mobile}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('Amount (₹)', 'राशि (₹)')}</label>
            <input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)}
                   className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('Date', 'तारीख')}</label>
            <input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)}
                   className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('Method', 'तरीका')}</label>
          <div className="grid grid-cols-4 gap-2">
            {METHODS.map(m => (
              <button key={m.key} onClick={() => setMethod(m.key)}
                className={`py-2 rounded-lg text-sm font-medium ${method === m.key
                  ? 'bg-saffron text-white' : 'bg-cream text-gray-600'}`}>
                {t(m.en, m.hi)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('Note (optional)', 'नोट (वैकल्पिक)')}</label>
          <input value={note} onChange={(e) => setNote(e.target.value)}
                 className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm" />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-lg border border-gray-300 font-medium text-gray-700">
            {t('Cancel', 'रद्द करें')}
          </button>
          <button onClick={save} disabled={busy}
                  className="flex-1 py-3 rounded-lg font-semibold text-white bg-saffron hover:bg-saffron-dark disabled:opacity-60">
            {busy ? t('Saving…', 'सेव हो रहा है…') : t('Save', 'सेव करें')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
