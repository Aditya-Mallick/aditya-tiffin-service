import { useEffect, useState, useCallback } from 'react'
import { Trash2 } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { useAuth } from './AuthContext'
import { Modal, ConfirmDialog, Spinner, EmptyState, UndoToast } from './ui'
import { useCachedLoad } from './useCachedLoad'
import {
  listPayments, addPayment, updatePayment, softRemovePayment, restorePayment,
  listCustomers, todayIST, formatINR, formatDate,
} from './api'

const METHODS = [
  { key: 'Cash', en: 'Cash', hi: 'नकद' },
  { key: 'UPI', en: 'UPI', hi: 'UPI' },
  { key: 'Bank', en: 'Bank transfer', hi: 'बैंक' },
  { key: 'Other', en: 'Other', hi: 'अन्य' },
]

export default function Payments() {
  const { t, lang } = useLang()
  const { canSeeMoney } = useAuth()

  const [search, setSearch] = useState('')
  const [recording, setRecording] = useState(false)
  const [editing, setEditing] = useState(null)
  const [undo, setUndo] = useState(null)

  const payQ = useCachedLoad('payments', async () => {
    const [{ data: ps }, { data: cs }] = await Promise.all([
      listPayments(),
      listCustomers({ includeArchived: true }),
    ])
    return { payments: ps || [], customers: cs || [] }
  })
  const payments = payQ.data?.payments || []
  const customers = payQ.data?.customers || []
  const loading = payQ.loading
  const load = payQ.reload
  const setPayments = (updater) =>
    payQ.setData(d => ({ ...(d || {}), payments: typeof updater === 'function' ? updater(d?.payments || []) : updater }))

  if (!canSeeMoney) {
    return (
      <EmptyState text={t('Payments are only visible to the owner and admin.',
                          'भुगतान केवल मालिक और एडमिन को दिखते हैं।')} />
    )
  }

  // Search by customer name, mobile, amount or note.
  const q = search.trim().toLowerCase()
  const shown = q
    ? payments.filter(p =>
        (p.customers?.name || '').toLowerCase().includes(q) ||
        (p.customers?.mobile || '').includes(q) ||
        String(p.amount || '').includes(q) ||
        (p.note || '').toLowerCase().includes(q))
    : payments
  const totalPaid = shown.reduce((s, p) => s + Number(p.amount || 0), 0)

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
      <div className="sticky top-0 z-20 bg-cream -mx-4 px-4 py-2 border-b border-black/5 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">{t('Payments', 'भुगतान')}</h2>
        <button onClick={() => setRecording(true)}
                className="bg-saffron hover:bg-saffron-dark text-white text-sm font-semibold rounded-full px-4 py-2">
          + {t('Record', 'दर्ज करें')}
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('Search customer, amount or note…', 'ग्राहक, राशि या नोट खोजें…')}
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-saffron"
      />

      {/* Totals */}
      <div className="bg-white rounded-xl shadow-card p-3 text-center">
        <p className="text-xs text-gray-500">
          {q ? t('Total shown', 'दिखाया गया कुल') : t('Total received', 'कुल प्राप्त')}
          <span className="text-gray-400"> · {shown.length}</span>
        </p>
        <p className="text-lg font-bold text-tgreen-dark">{formatINR(totalPaid)}</p>
      </div>
      </div>

      {loading ? <Spinner /> : payments.length === 0 ? (
        <EmptyState text={t('No payments recorded yet.', 'अभी कोई भुगतान दर्ज नहीं।')} />
      ) : shown.length === 0 ? (
        <EmptyState text={t('No matching payments.', 'कोई मेल खाता भुगतान नहीं।')} />
      ) : (
        <div className="space-y-2">
          {shown.map(p => (
            <div key={p.id} className="bg-white rounded-xl shadow-card p-3 flex items-center justify-between">
              <button onClick={() => setEditing(p)} className="min-w-0 flex-1 text-left">
                <p className="text-sm font-semibold text-gray-800 truncate">{p.customers?.name}</p>
                <p className="text-xs text-gray-400">
                  {formatDate(p.paid_on, lang)}{p.method ? ` · ${p.method}` : ''}{p.note ? ` · ${p.note}` : ''}
                </p>
              </button>
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

      {editing && (
        <RecordModal customers={customers} payment={editing}
                     lockedCustomer={editing.customers ? { id: editing.customer_id, ...editing.customers } : null}
                     onClose={() => setEditing(null)}
                     onSaved={() => { setEditing(null); load() }}
                     onDelete={() => { const p = editing; setEditing(null); handleRemove(p) }} />
      )}

      <UndoToast message={undo?.message} onUndo={doUndo} onDismiss={() => setUndo(null)} />
    </div>
  )
}

export function RecordModal({ customers, onClose, onSaved, lockedCustomer, payment, onDelete }) {
  const { t } = useLang()
  const isEdit = Boolean(payment)
  const [customerId, setCustomerId] = useState(payment?.customer_id || lockedCustomer?.id || '')
  const [search, setSearch] = useState('')
  const [amount, setAmount] = useState(payment ? String(payment.amount ?? '') : '')
  const [paidOn, setPaidOn] = useState(payment?.paid_on || todayIST())
  const [method, setMethod] = useState(payment?.method || 'Cash')
  const [note, setNote] = useState(payment?.note || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)

  const q = search.trim().toLowerCase()
  const matches = customers.filter(c =>
    !q || c.name.toLowerCase().includes(q) || (c.mobile || '').includes(q))
  const chosen = lockedCustomer || customers.find(c => c.id === customerId)

  async function save() {
    setError('')
    if (!customerId) { setError(t('Pick a customer.', 'ग्राहक चुनें।')); return }
    if (!(Number(amount) > 0)) { setError(t('Enter an amount.', 'राशि डालें।')); return }
    setBusy(true)
    const { error } = isEdit
      ? await updatePayment(payment.id, { amount, paid_on: paidOn, method, note })
      : await addPayment({ customer_id: customerId, amount, paid_on: paidOn, method, note })
    setBusy(false)
    if (error) { setError(error.message); return }
    onSaved()
  }

  return (
    <Modal open onClose={onClose}
           title={isEdit ? t('Edit payment', 'भुगतान बदलें') : t('Record payment', 'भुगतान दर्ज करें')}>
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

        {isEdit && onDelete && (
          <button onClick={() => setConfirmDel(true)} className="w-full text-red-600 text-sm font-medium">
            {t('Delete this payment', 'यह भुगतान हटाएं')}
          </button>
        )}

        <ConfirmDialog
          open={confirmDel}
          title={t('Delete payment?', 'भुगतान हटाएं?')}
          message={t(`Delete this ${formatINR(payment?.amount)} payment? You can undo right after.`,
                     `यह ${formatINR(payment?.amount)} का भुगतान हटाएं? तुरंत वापस ला सकते हैं।`)}
          confirmLabel={t('Delete', 'हटाएं')} danger
          onCancel={() => setConfirmDel(false)}
          onConfirm={() => { setConfirmDel(false); onDelete() }}
        />
      </div>
    </Modal>
  )
}
