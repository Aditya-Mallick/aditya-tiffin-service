import { useEffect, useState, useCallback } from 'react'
import { PackageCheck } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { useAuth } from './AuthContext'
import { Spinner, EmptyState, ViewToggle, GlanceList } from './ui'
import { getDailyEntries, setReturn, todayIST, addDays, formatDayLong } from './api'

const SLOTS = [
  { key: 'morning', en: 'Morning', hi: 'सुबह' },
  { key: 'afternoon', en: 'Afternoon', hi: 'दोपहर' },
  { key: 'evening', en: 'Evening', hi: 'शाम' },
]
function defaultSlot() {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(new Date()))
  if (h < 11) return 'morning'
  if (h < 16) return 'afternoon'
  return 'evening'
}
const nameOf = (e) => e.customers?.name || e.guest_label || ''

export default function Returns() {
  const { t, lang } = useLang()
  const { isAdmin } = useAuth()
  const today = todayIST()

  const [date, setDate] = useState(today)
  const [slot, setSlot] = useState(defaultSlot())
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState('details')

  // Staff may change returns for today + yesterday only; admin/owner any date.
  const canEdit = isAdmin || date === today || date === addDays(today, -1)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await getDailyEntries(date, slot)
    setEntries(data || [])
    setLoading(false)
  }, [date, slot])
  useEffect(() => { load() }, [load])

  const given = entries.reduce((s, e) => s + (e.quantity || 1), 0)
  const returned = entries.reduce((s, e) => s + (e.returned_qty || 0), 0)
  const remaining = given - returned

  // Not-fully-returned first, then returned; each group A–Z.
  const sorted = [...entries].sort((a, b) => {
    const aDone = (a.returned_qty || 0) >= (a.quantity || 1)
    const bDone = (b.returned_qty || 0) >= (b.quantity || 1)
    if (aDone !== bDone) return aDone ? 1 : -1
    return nameOf(a).localeCompare(nameOf(b))
  })
  const q = search.trim().toLowerCase()
  const shown = q
    ? sorted.filter(e => nameOf(e).toLowerCase().includes(q) || (e.customers?.mobile || '').includes(q))
    : sorted

  async function handleReturn(entry, newReturned) {
    const q = entry.quantity || 1
    const val = Math.max(0, Math.min(newReturned, q))
    setEntries(es => es.map(e => (e.id === entry.id ? { ...e, returned_qty: val } : e)))
    await setReturn(entry.id, val)
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Distinct blue banner so this page can't be confused with Today */}
      <div className="bg-blue-600 text-white rounded-xl p-3 flex items-center gap-2">
        <PackageCheck size={20} />
        <span className="font-bold">{t('Tiffin Returns', 'टिफिन वापसी')}</span>
      </div>

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
          {date === today && <p className="text-xs text-blue-600">{t('Today', 'आज')}</p>}
        </div>
        <button onClick={() => setDate(d => addDays(d, 1))}
                className="px-3 py-2 rounded-lg bg-white shadow-card text-gray-600">›</button>
      </div>

      {/* Slot tabs (blue accent) */}
      <div className="grid grid-cols-3 gap-2">
        {SLOTS.map(s => (
          <button key={s.key} onClick={() => setSlot(s.key)}
            className={`py-2.5 rounded-lg text-sm font-semibold ${slot === s.key
              ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 shadow-card'}`}>
            {t(s.en, s.hi)}
          </button>
        ))}
      </div>

      {!canEdit && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">
          {t('View only. Staff can change returns for today and yesterday.',
             'केवल देखने के लिए। स्टाफ आज और कल की वापसी बदल सकते हैं।')}
        </div>
      )}

      {/* Sticky totals */}
      <div className="sticky top-0 z-20 bg-cream -mx-4 px-4 py-2 border-b border-black/5">
        <div className="flex items-center justify-around text-center bg-white rounded-xl shadow-card py-2">
          <div>
            <p className="text-xs text-gray-500">{t('Given', 'दिए')}</p>
            <p className="text-lg font-bold text-gray-800">{given}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('Returned', 'वापस')}</p>
            <p className="text-lg font-bold text-tgreen-dark">{returned}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('Remaining', 'बाकी')}</p>
            <p className={`text-lg font-bold ${remaining > 0 ? 'text-red-600' : 'text-tgreen-dark'}`}>{remaining}</p>
          </div>
        </div>
      </div>

      {/* Search this list */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('Search this list…', 'इस सूची में खोजें…')}
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
      />

      <div className="flex justify-end">
        <ViewToggle view={view} setView={setView} />
      </div>

      {loading ? <Spinner /> : entries.length === 0 ? (
        <EmptyState text={t('No tiffins given in this slot.', 'इस समय कोई टिफिन नहीं दिया।')} />
      ) : shown.length === 0 ? (
        <EmptyState text={t('No match in this list.', 'इस सूची में कोई मेल नहीं।')} />
      ) : view === 'glance' ? (
        <GlanceList items={shown.map(e => ({ name: nameOf(e), qty: e.quantity || 1 }))} />
      ) : (
        <div className="space-y-2">
          {shown.map((e, i) => {
            const q = e.quantity || 1
            const back = e.returned_qty || 0
            const done = back >= q
            return (
              <div key={e.id}
                   className={`rounded-xl shadow-card p-3 flex items-center justify-between gap-2 ${done ? 'bg-tgreen/10' : 'bg-white'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base font-semibold text-gray-400 w-6 shrink-0 text-center">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{nameOf(e)}</p>
                    <p className="text-xs text-gray-400">
                      {t('Given', 'दिए')}: {q}{q > 1 ? ` · ${back}/${q} ${t('back', 'वापस')}` : ''}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {q === 1 ? (
                    <button disabled={!canEdit} onClick={() => handleReturn(e, done ? 0 : 1)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 ${done
                              ? 'bg-tgreen text-white' : 'bg-white border border-blue-600 text-blue-700'}`}>
                      {done ? t('Returned ✓', 'वापस ✓') : t('Return', 'वापस')}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button disabled={!canEdit || back <= 0} onClick={() => handleReturn(e, back - 1)}
                              className="w-9 h-9 rounded-lg bg-cream text-gray-600 text-lg leading-none disabled:opacity-40">−</button>
                      <span className={`w-8 text-center text-sm font-semibold ${done ? 'text-tgreen-dark' : 'text-gray-700'}`}>{back}</span>
                      <button disabled={!canEdit || back >= q} onClick={() => handleReturn(e, back + 1)}
                              className="w-9 h-9 rounded-lg bg-blue-600 text-white text-lg leading-none disabled:opacity-40">+</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
