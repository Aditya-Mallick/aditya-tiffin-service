import { useEffect, useState, useCallback, useRef } from 'react'
import { useLang } from '../context/LanguageContext'
import { useAuth } from './AuthContext'
import { Modal, ConfirmDialog, Spinner, EmptyState, UndoToast } from './ui'
import {
  getDailyEntries, getTiffinTypes, listCustomers, addEntry, addGuestEntry,
  getRecentGuestLabels, updateEntry, softRemoveEntry, restoreEntry, copyDailyList,
  todayIST, addDays, formatDayLong,
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
  const [confirmCopy, setConfirmCopy] = useState(null)   // { sourceDate, sourceSlot }
  const [undo, setUndo] = useState(null)     // { message, entryId }
  const [note, setNote] = useState('')       // transient status line
  const [entrySearch, setEntrySearch] = useState('')
  const [guestLabels, setGuestLabels] = useState([])
  const [walkinFilter, setWalkinFilter] = useState('all')   // 'all' | 'walkin'
  const [typeFilter, setTypeFilter] = useState(null)        // tiffin_type_id / 'none' / null

  const canEdit = isAdmin || date === today

  const loadRefs = useCallback(async () => {
    const [{ data: cs }, { data: tt }, labels] = await Promise.all([
      listCustomers(), getTiffinTypes(), getRecentGuestLabels(),
    ])
    setCustomers(cs || [])
    setTiffinTypes(tt || [])
    setGuestLabels(labels || [])
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

  // Display name = real customer name, or the walk-in label.
  const nameOf = (e) => e.customers?.name || e.guest_label || ''
  const slotName = (key) => { const s = SLOTS.find(x => x.key === key); return s ? t(s.en, s.hi) : key }
  const ttById = (id) => tiffinTypes.find(x => x.id === id)
  const portionOf = (e) => {
    const tt = ttById(e.tiffin_type_id)
    return tt?.has_portions ? (e.portion === 'full' ? 'full' : 'half') : null
  }
  // Chips (and the tap-to-filter) are keyed by item + portion, so half and
  // full of the same item are counted and filtered separately.
  const entryKey = (e) => (e.tiffin_type_id || 'none') + ':' + (portionOf(e) || '')

  // Kitchen summary for the whole slot (independent of search / filter).
  const totalTiffins = entries.reduce((s, e) => s + (e.quantity || 1), 0)
  const walkinCount = entries.filter(e => !e.customer_id).length
  const typeCountMap = {}
  for (const e of entries) {
    const key = entryKey(e)
    const tt = ttById(e.tiffin_type_id)
    let name = tt ? (lang === 'hi' && tt.name_hi ? tt.name_hi : tt.name_en) : t('Not set', 'नहीं चुना')
    const p = portionOf(e)
    if (p) name += p === 'full' ? ` (${t('Full', 'फुल')})` : ` (${t('Half', 'हाफ')})`
    if (!typeCountMap[key]) typeCountMap[key] = { key, name, qty: 0 }
    typeCountMap[key].qty += (e.quantity || 1)
  }
  const typeCounts = Object.values(typeCountMap).sort((a, b) => b.qty - a.qty)
  const activeType = typeCounts.some(tc => tc.key === typeFilter) ? typeFilter : null

  // Sort A–Z, then apply the type + walk-in filters and the in-list search.
  const sortedEntries = [...entries].sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
  const eq = entrySearch.trim().toLowerCase()
  const shownEntries = sortedEntries.filter(e => {
    if (walkinFilter === 'walkin' && e.customer_id) return false
    if (activeType && entryKey(e) !== activeType) return false
    if (eq && !(nameOf(e).toLowerCase().includes(eq) || (e.customers?.mobile || '').includes(eq))) return false
    return true
  })

  // Build an optimistic row so the entry shows instantly (no wait for the DB).
  function buildTemp({ customerId = null, label = null, tiffinTypeId, portion = null }) {
    const cust = customerId ? customers.find(c => c.id === customerId) : null
    const tt = tiffinTypes.find(x => x.id === tiffinTypeId)
    return {
      id: 'tmp-' + Date.now() + Math.random(),
      customer_id: customerId, guest_label: label,
      tiffin_type_id: tiffinTypeId, portion, quantity: 1,
      customers: cust ? { id: cust.id, name: cust.name, mobile: cust.mobile } : null,
      tiffin_types: tt ? { id: tt.id, name_en: tt.name_en, name_hi: tt.name_hi } : null,
    }
  }

  async function handleAdd(customerId, tiffinTypeId = defaultTiffinId, portion = null) {
    const temp = buildTemp({ customerId, tiffinTypeId, portion })
    setEntries(prev => [...prev, temp])                       // show immediately
    const { data, error } = await addEntry(date, slot, customerId, tiffinTypeId, 1, portion)
    if (error) { setEntries(prev => prev.filter(e => e.id !== temp.id)); return }
    setEntries(prev => prev.map(e => (e.id === temp.id ? { ...e, id: data.id } : e)))
  }
  async function handleAddGuest(label, tiffinTypeId = defaultTiffinId, portion = null) {
    const l = (label || '').trim()
    if (!l) return
    const temp = buildTemp({ label: l, tiffinTypeId, portion })
    setEntries(prev => [...prev, temp])
    const { data, error } = await addGuestEntry(date, slot, l, tiffinTypeId, 1, portion)
    if (error) { setEntries(prev => prev.filter(e => e.id !== temp.id)); return }
    setEntries(prev => prev.map(e => (e.id === temp.id ? { ...e, id: data.id } : e)))
    getRecentGuestLabels().then(setGuestLabels)               // refresh suggestions
  }
  async function handleChangeType(entryId, tiffinTypeId) {
    const tt = tiffinTypes.find(x => x.id === tiffinTypeId)
    const current = entries.find(x => x.id === entryId)
    const portion = tt?.has_portions ? (current?.portion || 'half') : null
    setEntries(es => es.map(e => e.id === entryId
      ? { ...e, tiffin_type_id: tiffinTypeId, portion, tiffin_types: tt }
      : e))
    await updateEntry(entryId, { tiffin_type_id: tiffinTypeId, portion })
  }
  async function handleChangePortion(entryId, portion) {
    setEntries(es => es.map(e => (e.id === entryId ? { ...e, portion } : e)))
    await updateEntry(entryId, { portion })
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
    const { data, error } = await copyDailyList(sourceDate, sourceSlot, date, slot, defaultTiffinId)
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
          <label className="relative inline-block cursor-pointer">
            <span className="font-semibold text-gray-800">{formatDayLong(date, lang)}</span>
            <input type="date" value={date} max={isAdmin ? undefined : today}
                   onClick={(e) => e.currentTarget.showPicker?.()}
                   onChange={(e) => setDate(e.target.value)}
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </label>
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

      {/* Sticky summary + Add — stays visible while scrolling the list */}
      <div className="sticky top-0 z-20 bg-cream -mx-4 px-4 py-2 border-b border-black/5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">
              {entries.length} {t('customers', 'ग्राहक')} · {totalTiffins} {t('tiffins', 'टिफिन')}
            </p>
            {typeCounts.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {typeCounts.map(tc => (
                  <button key={tc.key}
                    onClick={() => setTypeFilter(f => (f === tc.key ? null : tc.key))}
                    className={`text-[11px] rounded-full px-2 py-0.5 shadow-card ${activeType === tc.key ? 'bg-saffron text-white' : 'bg-white text-gray-600'}`}>
                    {tc.name} ×{tc.qty}
                  </button>
                ))}
              </div>
            )}
          </div>
          {canEdit && (
            <button onClick={() => setAdding(true)}
                    className="shrink-0 bg-saffron hover:bg-saffron-dark text-white text-sm font-semibold rounded-full px-4 py-2">
              + {t('Add', 'जोड़ें')}
            </button>
          )}
        </div>
      </div>

      {/* Search + walk-in filter */}
      <div className="flex gap-2">
        <input
          value={entrySearch}
          onChange={(e) => setEntrySearch(e.target.value)}
          placeholder={t('Search this list…', 'इस सूची में खोजें…')}
          className="flex-1 min-w-0 rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-saffron"
        />
        <div className="flex rounded-lg overflow-hidden border border-gray-300 shrink-0">
          <button onClick={() => setWalkinFilter('all')}
                  className={`px-3 text-sm font-medium ${walkinFilter === 'all' ? 'bg-saffron text-white' : 'bg-white text-gray-600'}`}>
            {t('All', 'सभी')}
          </button>
          <button onClick={() => setWalkinFilter('walkin')}
                  className={`px-3 text-sm font-medium ${walkinFilter === 'walkin' ? 'bg-gold text-white' : 'bg-white text-gray-600'}`}>
            {t('Walk-ins', 'वॉक-इन')}{walkinCount > 0 ? ` (${walkinCount})` : ''}
          </button>
        </div>
      </div>

      {/* Copy from another day (own row so it never overflows) */}
      {canEdit && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setConfirmCopy({ sourceDate: addDays(date, -1), sourceSlot: slot })}
                  className="rounded-lg bg-white shadow-card text-sm text-gray-700 py-2">
            {t('Copy yesterday', 'कल की कॉपी')}
          </button>
          <button onClick={() => setCopyOpen(true)}
                  className="rounded-lg bg-white shadow-card text-sm text-gray-700 py-2">
            {t('Copy from…', 'तारीख से…')}
          </button>
        </div>
      )}

      {/* Entries (sorted A–Z, filtered by search) */}
      {loading ? <Spinner /> : entries.length === 0 ? (
        <EmptyState text={t('No customers in this list yet.', 'इस सूची में अभी कोई ग्राहक नहीं।')} />
      ) : shownEntries.length === 0 ? (
        <EmptyState text={t('No match in this list.', 'इस सूची में कोई मेल नहीं।')} />
      ) : (
        <>
          <div className="space-y-2">
            {shownEntries.map((e, i) => (
              <div key={e.id} className="bg-white rounded-xl shadow-card p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base font-semibold text-gray-400 w-7 shrink-0 text-center">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {e.customers?.name || e.guest_label}
                      </p>
                      {e.customers ? (
                        <p className="text-xs text-gray-400">{e.customers.mobile}</p>
                      ) : (
                        <span className="inline-block text-[11px] font-medium text-gold bg-gold/10 rounded px-1.5 py-0.5 mt-0.5">
                          {t('Walk-in', 'वॉक-इन')}
                        </span>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <button onClick={() => handleRemove(e)}
                            className="text-red-500 text-sm font-medium px-2 shrink-0">
                      {t('Remove', 'हटाएं')}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <select
                    value={e.tiffin_type_id || ''}
                    disabled={!canEdit}
                    onChange={(ev) => handleChangeType(e.id, ev.target.value)}
                    className="flex-1 min-w-[130px] rounded-lg border border-gray-200 px-2 py-1.5 text-sm bg-cream disabled:opacity-70"
                  >
                    <option value="">{t('— what was served —', '— क्या दिया —')}</option>
                    {tiffinTypes.map(tt => (
                      <option key={tt.id} value={tt.id}>{ttName(tt, lang)}</option>
                    ))}
                  </select>
                  {canEdit && ttById(e.tiffin_type_id)?.has_portions && (
                    <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs shrink-0">
                      <button onClick={() => handleChangePortion(e.id, 'half')}
                              className={`px-2 py-1.5 ${(e.portion || 'half') === 'half' ? 'bg-saffron text-white' : 'bg-white text-gray-600'}`}>
                        {t('Half', 'हाफ')}
                      </button>
                      <button onClick={() => handleChangePortion(e.id, 'full')}
                              className={`px-2 py-1.5 ${e.portion === 'full' ? 'bg-saffron text-white' : 'bg-white text-gray-600'}`}>
                        {t('Full', 'फुल')}
                      </button>
                    </div>
                  )}
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
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
          guestLabels={guestLabels}
          tiffinTypes={tiffinTypes}
          lang={lang}
          defaultTypeId={defaultTiffinId}
          onAdd={handleAdd}
          onAddGuest={handleAddGuest}
          onClose={() => setAdding(false)}
        />
      )}

      {/* Copy-from modal */}
      {copyOpen && (
        <CopyFromModal defaultDate={addDays(date, -1)} defaultSlot={slot}
                       onCopy={(d, s) => { setCopyOpen(false); setConfirmCopy({ sourceDate: d, sourceSlot: s }) }}
                       onClose={() => setCopyOpen(false)} />
      )}

      <ConfirmDialog
        open={Boolean(confirmCopy)}
        title={t('Copy this list?', 'यह सूची कॉपी करें?')}
        message={confirmCopy ? t(
          `Copy the ${slotName(confirmCopy.sourceSlot)} list from ${formatDayLong(confirmCopy.sourceDate, lang)} into this list? Everyone is added as veg tiffin; people already here are kept.`,
          `${formatDayLong(confirmCopy.sourceDate, lang)} की ${slotName(confirmCopy.sourceSlot)} सूची इसमें कॉपी करें? सभी वेज टिफिन के रूप में जुड़ेंगे; पहले से मौजूद लोग वैसे ही रहेंगे।`) : ''}
        confirmLabel={t('Copy', 'कॉपी करें')}
        onCancel={() => setConfirmCopy(null)}
        onConfirm={() => { const c = confirmCopy; setConfirmCopy(null); doCopy(c.sourceDate, c.sourceSlot) }}
      />

      <UndoToast message={undo?.message} onUndo={doUndo} onDismiss={() => setUndo(null)} />
    </div>
  )
}

function AddCustomerModal({ customers, guestLabels, tiffinTypes, lang, defaultTypeId, onAdd, onAddGuest, onClose }) {
  const { t } = useLang()
  const [search, setSearch] = useState('')
  const [typeId, setTypeId] = useState(defaultTypeId || tiffinTypes[0]?.id)
  const [portion, setPortion] = useState('half')
  const inputRef = useRef(null)
  const selType = tiffinTypes.find(tt => tt.id === typeId)
  const showPortion = !!selType?.has_portions
  const typed = search.trim()
  const q = typed.toLowerCase()
  const list = customers.filter(c => !q || c.name.toLowerCase().includes(q) || (c.mobile || '').includes(q))
  const labelMatches = (guestLabels || []).filter(l => q && l.toLowerCase().includes(q)).slice(0, 6)
  const exactLabel = (guestLabels || []).some(l => l.toLowerCase() === q)

  const afterAdd = () => { setSearch(''); inputRef.current?.focus() }
  const p = showPortion ? portion : null
  const addCustomer = (id) => { onAdd(id, typeId, p); afterAdd() }
  const addGuest = (label) => { onAddGuest(label, typeId, p); afterAdd() }

  return (
    <Modal open onClose={onClose} title={t('Add to list', 'सूची में जोड़ें')}>
      {/* Which item are we adding */}
      <p className="text-xs text-gray-400 mb-1">{t('Item being added', 'कौन सा आइटम')}</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tiffinTypes.map(tt => (
          <button key={tt.id} onClick={() => { setTypeId(tt.id); setPortion('half') }}
            className={`text-xs font-medium rounded-full px-3 py-1.5 ${typeId === tt.id ? 'bg-saffron text-white' : 'bg-cream text-gray-600'}`}>
            {ttName(tt, lang)}
          </button>
        ))}
      </div>
      {showPortion && (
        <div className="flex rounded-lg overflow-hidden border border-gray-300 w-max mb-3">
          <button onClick={() => setPortion('half')}
                  className={`px-4 py-1.5 text-sm font-medium ${portion === 'half' ? 'bg-saffron text-white' : 'bg-white text-gray-600'}`}>
            {t('Half', 'हाफ')}
          </button>
          <button onClick={() => setPortion('full')}
                  className={`px-4 py-1.5 text-sm font-medium ${portion === 'full' ? 'bg-saffron text-white' : 'bg-white text-gray-600'}`}>
            {t('Full', 'फुल')}
          </button>
        </div>
      )}

      <input ref={inputRef} autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
             placeholder={t('Search customer, or type a bed / walk-in…', 'ग्राहक खोजें, या बेड / वॉक-इन लिखें…')}
             className="w-full rounded-lg border border-gray-300 px-4 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-saffron" />

      <div className="h-64 overflow-y-auto space-y-2">
        {/* Existing customers */}
        {list.map(c => (
          <button key={c.id} onClick={() => addCustomer(c.id)}
                  className="w-full text-left bg-cream rounded-lg p-3 flex items-center justify-between">
            <span><span className="font-medium text-gray-800">{c.name}</span>
              <span className="text-gray-400 text-sm"> · {c.mobile}</span></span>
            <span className="text-saffron font-bold">+</span>
          </button>
        ))}

        {/* Walk-in / hotel bed */}
        {(typed || labelMatches.length > 0) && (
          <div className="pt-1">
            <p className="text-xs text-gray-400 px-1 mb-1">{t('Walk-in / hotel bed', 'वॉक-इन / होटल बेड')}</p>
            {typed && !exactLabel && (
              <button onClick={() => addGuest(typed)}
                      className="w-full text-left bg-gold/10 rounded-lg p-3 flex items-center justify-between">
                <span className="text-gray-800">
                  {t('Add', 'जोड़ें')} “<span className="font-semibold">{typed}</span>” {t('as walk-in', 'वॉक-इन')}
                </span>
                <span className="text-gold font-bold">+</span>
              </button>
            )}
            {labelMatches.map(l => (
              <button key={l} onClick={() => addGuest(l)}
                      className="w-full text-left bg-cream rounded-lg p-3 flex items-center justify-between mt-1">
                <span className="text-gray-800">{l}
                  <span className="text-gray-400 text-xs"> · {t('walk-in', 'वॉक-इन')}</span></span>
                <span className="text-saffron font-bold">+</span>
              </button>
            ))}
          </div>
        )}

        {list.length === 0 && !typed && (
          <p className="text-center text-gray-400 py-6 text-sm">
            {t('Type a name to add a customer, or a bed/walk-in label.',
               'ग्राहक जोड़ने के लिए नाम, या बेड/वॉक-इन लेबल लिखें।')}
          </p>
        )}
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
