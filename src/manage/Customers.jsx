import { useEffect, useState, useCallback } from 'react'
import { useLang } from '../context/LanguageContext'
import { useAuth } from './AuthContext'
import { Modal, ConfirmDialog, Spinner, EmptyState } from './ui'
import { CustomerStatement } from './Statement'
import {
  listCustomers, getTiffinTypes, getCustomerBilling, getCustomerRates,
  upsertCustomer, upsertCustomerBilling, saveCustomerRates,
  archiveCustomer, restoreCustomer, canonicalMobile,
} from './api'

export default function Customers() {
  const { t } = useLang()
  const { isAdmin, canSeeMoney } = useAuth()

  const [customers, setCustomers] = useState([])
  const [tiffinTypes, setTiffinTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('latest')      // 'latest' | 'az'
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState(null)     // customer obj, {} for new, or null
  const [confirmArchive, setConfirmArchive] = useState(null)
  const [viewing, setViewing] = useState(null)     // customer whose statement is open
  const [stmtKey, setStmtKey] = useState(0)         // bump to refresh statement after edits

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: cs }, { data: tt }] = await Promise.all([
      listCustomers({ includeArchived: showArchived }),
      getTiffinTypes(),
    ])
    setCustomers(cs || [])
    setTiffinTypes(tt || [])
    setLoading(false)
  }, [showArchived])

  useEffect(() => { load() }, [load])

  const q = search.trim().toLowerCase()
  const filtered = customers.filter(c =>
    !q || c.name.toLowerCase().includes(q) || (c.mobile || '').includes(q))
  const sorted = [...filtered].sort((a, b) =>
    sort === 'latest'
      ? (b.created_at || '').localeCompare(a.created_at || '')   // newest first
      : a.name.localeCompare(b.name))                            // A–Z

  return (
    <div className="space-y-4">
      {viewing ? (
        <CustomerStatement
          key={stmtKey}
          customer={viewing}
          isAdmin={isAdmin}
          onBack={() => { setViewing(null); load() }}
          onEdit={(c) => setEditing(c)}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">
              {t('Customers', 'ग्राहक')}
              <span className="ml-2 text-sm font-normal text-gray-400">({customers.length})</span>
            </h2>
            <button
              onClick={() => setEditing({})}
              className="bg-saffron hover:bg-saffron-dark text-white text-sm font-semibold rounded-full px-4 py-2"
            >
              + {t('Add', 'जोड़ें')}
            </button>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('Search name or mobile…', 'नाम या मोबाइल खोजें…')}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-saffron"
          />

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{t('Sort', 'क्रम')}:</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              <button onClick={() => setSort('az')}
                      className={`px-3 py-1.5 text-xs font-medium ${sort === 'az' ? 'bg-saffron text-white' : 'bg-white text-gray-600'}`}>
                {t('A–Z', 'नाम')}
              </button>
              <button onClick={() => setSort('latest')}
                      className={`px-3 py-1.5 text-xs font-medium ${sort === 'latest' ? 'bg-saffron text-white' : 'bg-white text-gray-600'}`}>
                {t('Latest', 'नए')}
              </button>
            </div>
          </div>

          {isAdmin && (
            <label className="flex items-center gap-2 text-sm text-gray-500">
              <input type="checkbox" checked={showArchived}
                     onChange={(e) => setShowArchived(e.target.checked)} />
              {t('Show archived', 'आर्काइव दिखाएं')}
            </label>
          )}

          {loading ? <Spinner /> : filtered.length === 0 ? (
            <EmptyState text={t('No customers yet.', 'अभी कोई ग्राहक नहीं।')} />
          ) : (
            <div className="space-y-2">
              {sorted.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => (canSeeMoney ? setViewing(c) : setEditing(c))}
                  className="w-full text-left bg-white rounded-xl shadow-card p-4 flex items-center gap-3"
                >
                  <span className="text-base font-semibold text-gray-400 w-7 shrink-0 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      {c.name}
                      {c.deleted_at && (
                        <span className="ml-2 text-[11px] text-gray-400">
                          ({t('archived', 'आर्काइव्ड')})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{c.mobile}{c.address ? ` · ${c.address}` : ''}</p>
                  </div>
                  <span className="text-gray-300 shrink-0">›</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {editing !== null && (
        <CustomerForm
          customer={editing.id ? editing : null}
          tiffinTypes={tiffinTypes}
          canSeeMoney={canSeeMoney}
          isAdmin={isAdmin}
          onArchive={(c) => { setEditing(null); setConfirmArchive(c) }}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null)
            load()
            // If we're viewing this customer's statement, update its header
            // and reload its figures immediately (no manual refresh needed).
            if (saved && viewing && viewing.id === saved.id) setViewing(v => ({ ...v, ...saved }))
            setStmtKey(k => k + 1)
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmArchive)}
        title={t('Archive customer?', 'ग्राहक आर्काइव करें?')}
        message={t(
          `Archive "${confirmArchive?.name}"? They will be hidden but can be restored anytime.`,
          `"${confirmArchive?.name}" को आर्काइव करें? यह छिप जाएगा लेकिन कभी भी वापस लाया जा सकता है।`)}
        confirmLabel={t('Archive', 'आर्काइव')}
        danger
        onCancel={() => setConfirmArchive(null)}
        onConfirm={async () => {
          await archiveCustomer(confirmArchive.id)
          setConfirmArchive(null)
          load()
        }}
      />
    </div>
  )
}

function CustomerForm({ customer, tiffinTypes, canSeeMoney, isAdmin, onSaved, onClose, onArchive }) {
  const { t, lang } = useLang()
  const isNew = !customer
  const readOnly = !isNew && !isAdmin   // staff may add new, but not edit existing
  const [name, setName] = useState(customer?.name || '')
  const [mobile, setMobile] = useState(customer?.mobile || '')
  const [address, setAddress] = useState(customer?.address || '')
  const [billing, setBilling] = useState({ plan_name: '', plan_amount: '', plan_notes: '', opening_balance: '' })
  const [rates, setRates] = useState({})            // { tiffinTypeId: priceString }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Load money info for existing customers (admins only).
  useEffect(() => {
    let on = true
    async function loadMoney() {
      if (!canSeeMoney || isNew) return
      const [{ data: b }, { data: rs }] = await Promise.all([
        getCustomerBilling(customer.id), getCustomerRates(customer.id),
      ])
      if (!on) return
      if (b) setBilling({
        plan_name: b.plan_name || '', plan_amount: b.plan_amount ?? '',
        plan_notes: b.plan_notes || '', opening_balance: b.opening_balance ?? '',
      })
      const map = {}
      ;(rs || []).forEach(r => { map[r.tiffin_type_id] = String(r.price) })
      setRates(map)
    }
    loadMoney()
    return () => { on = false }
  }, [canSeeMoney, isNew, customer])

  async function save() {
    setError('')
    if (!name.trim() || mobile.replace(/\D/g, '').length < 10) {
      setError(t('Name and a valid 10-digit mobile are required.',
                 'नाम और सही 10 अंकों का मोबाइल ज़रूरी है।'))
      return
    }
    setBusy(true)
    const { data, error: cErr } = await upsertCustomer({
      id: customer?.id, name: name.trim(), mobile: mobile.trim(), address: address.trim(),
    })
    if (cErr) { setBusy(false); setError(cErr.message); return }
    const customerId = data.id
    if (canSeeMoney) {
      await upsertCustomerBilling(customerId, billing)
      await saveCustomerRates(customerId, rates)
    }
    setBusy(false)
    onSaved({ id: customerId, name: name.trim(), mobile: canonicalMobile(mobile), address: address.trim() })
  }

  return (
    <Modal open onClose={onClose}
           title={isNew ? t('Add customer', 'ग्राहक जोड़ें') : t('Edit customer', 'ग्राहक बदलें')}>
      <div className="space-y-4">
        <Field label={t('Name', 'नाम')} value={name} onChange={setName} disabled={readOnly} />
        <Field label={t('Mobile number', 'मोबाइल नंबर')} value={mobile} onChange={setMobile}
               type="tel" placeholder="9876543210" disabled={readOnly} />
        <Field label={t('Address', 'पता')} value={address} onChange={setAddress} textarea disabled={readOnly} />

        {readOnly && (
          <p className="text-xs text-gray-400 -mt-1">
            {t('Only an admin can edit an existing customer.',
               'मौजूदा ग्राहक को केवल एडमिन बदल सकते हैं।')}
          </p>
        )}

        {canSeeMoney && (
          <>
            <hr className="border-gray-100" />
            <p className="text-sm font-semibold text-gray-700">{t('Plan & balance', 'प्लान और बकाया')}</p>
            <Field label={t('Plan name', 'प्लान का नाम')} value={billing.plan_name}
                   onChange={(v) => setBilling(b => ({ ...b, plan_name: v }))}
                   placeholder={t('e.g. ₹3300 plan', 'जैसे ₹3300 प्लान')} />
            <Field label={t('Plan amount (₹/mo)', 'प्लान राशि (₹/माह)')} value={billing.plan_amount}
                   onChange={(v) => setBilling(b => ({ ...b, plan_amount: v }))} type="number" />
            <OpeningBalanceField value={billing.opening_balance}
                   onChange={(v) => setBilling(b => ({ ...b, opening_balance: v }))} />
            <Field label={t('Plan notes', 'प्लान नोट्स')} value={billing.plan_notes}
                   onChange={(v) => setBilling(b => ({ ...b, plan_notes: v }))} textarea
                   placeholder={t('e.g. 1 chicken + 1 egg weekly included; mutton extra',
                                  'जैसे हफ्ते में 1 चिकन + 1 अंडा शामिल; मटन अलग')} />

            <hr className="border-gray-100" />
            <p className="text-sm font-semibold text-gray-700">{t('Rates for this customer', 'इस ग्राहक की दरें')}</p>
            <p className="text-xs text-gray-400 -mt-2">
              {t('Leave blank to use the default price.', 'डिफ़ॉल्ट दर के लिए खाली छोड़ें।')}
            </p>
            <div className="space-y-2">
              {tiffinTypes.map(tt => (
                <div key={tt.id} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-gray-700">
                    {lang === 'hi' && tt.name_hi ? tt.name_hi : tt.name_en}
                    <span className="text-gray-400"> · ₹{tt.default_price}</span>
                  </span>
                  <input
                    type="number"
                    value={rates[tt.id] ?? ''}
                    onChange={(e) => setRates(r => ({ ...r, [tt.id]: e.target.value }))}
                    placeholder={String(tt.default_price)}
                    className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-right"
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-lg border border-gray-300 font-medium text-gray-700">
            {readOnly ? t('Close', 'बंद करें') : t('Cancel', 'रद्द करें')}
          </button>
          {!readOnly && (
            <button onClick={save} disabled={busy}
                    className="flex-1 py-3 rounded-lg font-semibold text-white bg-saffron hover:bg-saffron-dark disabled:opacity-60">
              {busy ? t('Saving…', 'सेव हो रहा है…') : t('Save', 'सेव करें')}
            </button>
          )}
        </div>

        {!isNew && isAdmin && (
          <button onClick={() => onArchive(customer)}
                  className="w-full text-red-600 text-sm font-medium pt-1">
            {t('Archive this customer', 'इस ग्राहक को आर्काइव करें')}
          </button>
        )}
      </div>
    </Modal>
  )
}

// Balance without negatives: an Owes/Advance toggle + a positive amount.
// Stores a signed number (+ owes, − advance) via onChange.
function OpeningBalanceField({ value, onChange }) {
  const { t } = useLang()
  const num = Number(value || 0)
  const amt = Math.abs(num)
  // Direction is its own state so the toggle works even when the amount is 0.
  const [dir, setDir] = useState(num < 0 ? 'advance' : 'due')
  // Keep the toggle in sync when an existing customer's value loads in.
  useEffect(() => {
    if (num < 0) setDir('advance')
    else if (num > 0) setDir('due')
  }, [num])
  const setDirection = (d) => { setDir(d); onChange(d === 'advance' ? -amt : amt) }
  const setAmount = (v) => { const a = Math.abs(Number(v || 0)); onChange(dir === 'advance' ? -a : a) }
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{t('Opening balance', 'शुरुआती बकाया')}</label>
      <div className="flex gap-2">
        <div className="flex rounded-lg overflow-hidden border border-gray-300 shrink-0">
          <button type="button" onClick={() => setDirection('due')}
                  className={`px-3 py-2.5 text-sm ${dir === 'due' ? 'bg-red-600 text-white' : 'bg-white text-gray-600'}`}>
            {t('Owes', 'बकाया')}
          </button>
          <button type="button" onClick={() => setDirection('advance')}
                  className={`px-3 py-2.5 text-sm ${dir === 'advance' ? 'bg-tgreen text-white' : 'bg-white text-gray-600'}`}>
            {t('Advance', 'अग्रिम')}
          </button>
        </div>
        <input type="number" inputMode="numeric" value={amt === 0 ? '' : amt} placeholder="0"
               onChange={(e) => setAmount(e.target.value)}
               className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2.5 text-right" />
      </div>
      <p className="text-xs text-gray-400 mt-1">
        {t('How much they owe or have in advance right now.', 'अभी कितना बकाया या अग्रिम है।')}
      </p>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, textarea, hint, disabled }) {
  const cls = `w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-saffron ${disabled ? 'bg-gray-50 text-gray-500' : ''}`
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2}
                  disabled={disabled} className={cls} />
      ) : (
        <input type={type} inputMode={type === 'number' || type === 'tel' ? 'numeric' : undefined}
               value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
               disabled={disabled} className={cls} />
      )}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}
