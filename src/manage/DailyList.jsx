import { useEffect, useState, useCallback } from 'react'
import { useLang } from '../context/LanguageContext'
import { useAuth } from './AuthContext'
import { Modal, Spinner, EmptyState, UndoToast } from './ui'
import {
  getDailyEntries, getTiffinTypes, listCustomers, addEntry, updateEntry,
  softRemoveEntry, restoreEntry, copyDailyList, todayIST, addDays,
} from './api'

const SLOTS = [
  { key: 'morning',   en: 'Morning',   hi: 'सुबह' },
  { key: 'afternoon', en: 'Afternoon', hi: 'दोपहर' },
  { key: 'evening',   en: 'Evening',   hi: 'शाम' },
]

// Pick a sensible default slot from the current India time.
function defaultSlot() {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(new Date()))
  if (h < 11) return 'morning'
  if (h < 16) return 'afternoon'
  return 'evening'
}

function ttName(tt, lang) { return lang === 'hi' && tt?.name_hi ? tt.name_hi : tt?.name_en }

export default function DailyList() {
  const { t, lang } = useLang()
  const { isAdmin } = useAuth()
  const today = todayIST()

  const [date, setDate] = useState(today)
  const [slot, setSlot] = useState(defaultSlot())
  const [entries, setEntries] = useState([])
  const [customers, setCustomers] = useState([])
  const [tiffinTypes, setTiffinTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [undo, setUndo] = useState(null)     // { message, entryId }
  const [note, setNote] = useState('')       // transient status line

  const canEdit = isAdmin || date === today

  const loadRefs = useCallback(async () => {
    const [{ data: cs }, { data: tt }] = await Promise.all([listCustomers(), getTiffinTypes()])
    setCustomers(cs || [])
    setTiffinTypes(tt || [])
  }, [])

  const loadEntries = useCallback(async () => {
    setLoading(true)
    const { data } = await getDailyEntries(date, slot)
    setEntries(data || [])
    setLoading(false)
  }, [date, slot])

  useEffect(() => { loadRefs() }, [loadRefs])
  useEffect(() => { loadEntries() }, [loadEntries])

  const defaultTiffinId = tiffinTypes[0]?.id
  const presentIds = new Set(entries.map(e => e.customer_id))

  async function handleAdd(customerId) {
    await addEntry(date, slot, customerId, defaultTiffinId, 1)
    await loadEntries()
  }
  async function handleChangeType(entryId, tiffinTypeId) {
    setEntries(es => es.map(e => e.id === entryId
      ? { ...e, tiffin_type_id: tiffinTypeId, tiffin_types: tiffinTypes.find(x => x.id === tiffinTypeId) }
      : e))
    await updateEntry(entryId, { tiffin_type_id: tiffinTypeId })
  }
  async function handleQty(entryId, qty) {
    const q = Math.max(1, qty)
    setEntries(es => es.map(e => e.id === entryId ? { ...e, quantity: q } : e))
    await updateEntry(entryId, { quantity: q })
  }
  async function handleRemove(entry) {
    await softRemoveEntry(entry.id)
    setEntries(es => es.filter(e => e.id !== entry.id))
    setUndo({ message: t(`Removed ${entry.customers?.name}`, `${entry.customers?.name} हटाया`), entryId: entry.id })
  }
  async function doUndo() {
    if (!undo) return
    await restoreEntry(undo.entryId)
    setUndo(null)
    loadEntries()
  }
  async function doCopy(sourceDate, sourceSlot) {
    setCopyOpen(false)
    const { data, error } = await copyDailyList(sourceDate, sourceSlot, date, slot)
    if (error) { setNote(t('Copy failed: ', 'कॉपी विफल: ') + error.message); return }
    setNote(t(`Copied ${data} customer(s).`, `${data} ग्राहक कॉपी किए।`))
    loadEntries()
    setTimeout(() => setNote(''), 3000)
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Date navigator */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setDate(d => addDays(d, -1))}
                className="px-3 py-2 rounded-lg bg-white shadow-card text-gray-600">‹</button>
        <div className="flex-1 text-center">
          <input type="date" value={date} max={isAdmin ? undefined : today}
                 onChange={(e) => setDate(e.target.value)}
                 className="text-center font-semibold text-gray-800 bg-transparent" />
          {date === today && <p className="text-xs text-tgreen">{t('Today', 'आज')}</p>}
        </div>
        <button onClick={() => setDate(d => addDays(d, 1))}
                className="px-3 py-2 rounded-lg bg-white shadow-card text-gray-600">›</button>
      </div>

      {/* Slot tabs */}
      <div className="grid grid-cols-3 gap-2">
        {SLOTS.map(s => (
          <button key={s.key} onClick={() => setSlot(s.key)}
            className={`py-2.5 rounded-lg text-sm font-semibold ${slot === s.key
              ? 'bg-saffron text-white' : 'bg-white text-gray-600 shadow-card'}`}>
            {t(s.en, s.hi)}
          </button>
        ))}
      </div>

      {!canEdit && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">
          {t('Past dates are view-only. Ask the owner or admin to make changes.',
             'पुरानी तारीखें सिर्फ देखने के लिए हैं। बदलाव के लिए मालिक/एडमिन से कहें।')}
        </div>
      )}

      {note && <div className="text-sm text-tgreen-dark bg-tgreen/10 rounded-lg p-2 text-center">{note}</div>}

      {/* Actions */}
      {canEdit && (
        <div className="flex gap-2">
          <button onClick={() => setAdding(true)}
                  className="flex-1 bg-saffron hover:bg-saffron-dark text-white font-semibold rounded-lg py-2.5">
            + {t('Add customer', 'ग्राहक जोड़ें')}
          </button>
          <button onClick={() => doCopy(addDays(date, -1), slot)}
                  className="px-3 rounded-lg bg-white shadow-card text-sm text-gray-700">
            {t('Copy yesterday', 'कल की कॉपी')}
          </button>
          <button onClick={() => setCopyOpen(true)}
                  className="px-3 rounded-lg bg-white shadow-card text-sm text-gray-700">
            {t('Copy from…', 'तारीख से…')}
          </button>
        </div>
      )}

      {/* Entries */}
      {loading ? <Spinner /> : entries.length === 0 ? (
        <EmptyState text={t('No customers in this list yet.', 'इस सूची में अभी कोई ग्राहक नहीं।')} />
      ) : (
        <>
          <p className="text-xs text-gray-400">{t(`${entries.length} customer(s)`, `${entries.length} ग्राहक`)}</p>
          <div className="space-y-2">
            {entries.map((e, i) => (
              <div key={e.id} className="bg-white rounded-xl shadow-card p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-gray-400 w-5 shrink-0 text-right">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{e.customers?.name}</p>
                      <p className="text-xs text-gray-400">{e.customers?.mobile}</p>
                    </div>
                  </div>
                  {canEdit && (
                    <button onClick={() => handleRemove(e)}
                            className="text-red-500 text-sm font-medium px-2 shrink-0">
                      {t('Remove', 'हटाएं')}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <select
                    value={e.tiffin_type_id || ''}
                    disabled={!canEdit}
                    onChange={(ev) => handleChangeType(e.id, ev.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm bg-cream disabled:opacity-70"
                  >
                    <option value="">{t('— what was served —', '— क्या दिया —')}</option>
                    {tiffinTypes.map(tt => (
                      <option key={tt.id} value={tt.id}>{ttName(tt, lang)}</option>
                    ))}
                  </select>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleQty(e.id, (e.quantity || 1) - 1)}
                              className="w-8 h-8 rounded-lg bg-cream text-gray-600 text-lg leading-none">−</button>
                      <span className="w-6 text-center text-sm">{e.quantity || 1}</span>
                      <button onClick={() => handleQty(e.id, (e.quantity || 1) + 1)}
                              className="w-8 h-8 rounded-lg bg-cream text-gray-600 text-lg leading-none">+</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add-customer modal */}
      {adding && (
        <AddCustomerModal
          customers={customers.filter(c => !presentIds.has(c.id))}
          lang={lang}
          onAdd={handleAdd}
          onClose={() => setAdding(false)}
        />
      )}

      {/* Copy-from modal */}
      {copyOpen && (
        <CopyFromModal defaultDate={addDays(date, -1)} defaultSlot={slot}
                       onCopy={doCopy} onClose={() => setCopyOpen(false)} />
      )}

      <UndoToast message={undo?.message} onUndo={doUndo} onDismiss={() => setUndo(null)} />
    </div>
  )
}

function AddCustomerModal({ customers, lang, onAdd, onClose }) {
  const { t } = useLang()
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  const list = customers.filter(c => !q || c.name.toLowerCase().includes(q) || (c.mobile || '').includes(q))
  return (
    <Modal open onClose={onClose} title={t('Add customer to list', 'सूची में ग्राहक जोड़ें')}>
      <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
             placeholder={t('Search name or mobile…', 'नाम या मोबाइल खोजें…')}
             className="w-full rounded-lg border border-gray-300 px-4 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-saffron" />
      <div className="max-h-72 overflow-y-auto space-y-2">
        {list.length === 0 ? (
          <p className="text-center text-gray-400 py-6 text-sm">
            {t('No matching customers. Add them in the Customers tab first.',
               'कोई ग्राहक नहीं मिला। पहले ग्राहक टैब में जोड़ें।')}
          </p>
        ) : list.map(c => (
          <button key={c.id} onClick={() => onAdd(c.id)}
                  className="w-full text-left bg-cream rounded-lg p-3 flex items-center justify-between">
            <span><span className="font-medium text-gray-800">{c.name}</span>
              <span className="text-gray-400 text-sm"> · {c.mobile}</span></span>
            <span className="text-saffron font-bold">+</span>
          </button>
        ))}
      </div>
      <button onClick={onClose} className="w-full mt-4 py-3 rounded-lg bg-saffron text-white font-semibold">
        {t('Done', 'हो गया')}
      </button>
    </Modal>
  )
}

function CopyFromModal({ defaultDate, defaultSlot, onCopy, onClose }) {
  const { t } = useLang()
  const [d, setD] = useState(defaultDate)
  const [s, setS] = useState(defaultSlot)
  return (
    <Modal open onClose={onClose} title={t('Copy list from another day', 'दूसरे दिन से सूची कॉपी करें')}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('From date', 'किस तारीख से')}</label>
          <input type="date" value={d} onChange={(e) => setD(e.target.value)}
                 className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('From slot', 'किस समय से')}</label>
          <select value={s} onChange={(e) => setS(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 bg-white">
            {SLOTS.map(x => <option key={x.key} value={x.key}>{t(x.en, x.hi)}</option>)}
          </select>
        </div>
        <button onClick={() => onCopy(d, s)}
                className="w-full py-3 rounded-lg bg-saffron hover:bg-saffron-dark text-white font-semibold">
          {t('Copy these customers', 'ये ग्राहक कॉपी करें')}
        </button>
      </div>
    </Modal>
  )
}
