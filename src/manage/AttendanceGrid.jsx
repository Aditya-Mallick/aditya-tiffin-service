import { useLang } from '../context/LanguageContext'
import { monthBounds, currentMonthIST, todayIST } from './api'

const SLOT_ORDER = [
  { key: 'morning', en: 'Morning', hi: 'सुबह' },
  { key: 'afternoon', en: 'Afternoon', hi: 'दोपहर' },
  { key: 'evening', en: 'Evening', hi: 'शाम' },
]

function shortItem(tt, portion, lang) {
  let name = lang === 'hi' && tt.name_hi ? tt.name_hi : tt.name_en
  name = name.replace(/\s*tiffin$/i, '').replace(/\s*टिफिन$/, '')
  if (tt.has_portions) name += portion === 'full' ? ' F' : ' ½'
  return name
}

// Plain-text version of the attendance, for the WhatsApp bill.
// e.g. "16 Wed — M:Veg  E:Chicken½"  (X = absent)
export function attendanceTextLines(entries, types, ym, lang) {
  const typeById = Object.fromEntries((types || []).map(tt => [tt.id, tt]))
  const byDate = {}; const usedSlots = new Set(); let firstDay = 99
  for (const e of entries || []) {
    const day = Number(e.entry_date.slice(8, 10))
    firstDay = Math.min(firstDay, day); usedSlots.add(e.slot)
    ;(byDate[day] = byDate[day] || {})[e.slot] = e
  }
  const order = SLOT_ORDER.filter(s => usedSlots.has(s.key)).map(s => s.key)
  if (!entries || entries.length === 0 || order.length === 0) return []
  const { end } = monthBounds(ym)
  const daysInMonth = Number(end.slice(8, 10))
  const endDay = ym === currentMonthIST() ? Number(todayIST().slice(8, 10)) : daysInMonth
  const [yy, mm] = ym.split('-').map(Number)
  const letter = { morning: 'M', afternoon: 'A', evening: 'E' }
  const codeFor = (e) => {
    if (!e) return 'X'
    const tt = typeById[e.tiffin_type_id]
    if (!tt) return '?'
    return shortItem(tt, e.portion, lang).replace(/\s+/g, '')
  }
  const lines = []
  for (let d = firstDay; d <= Math.min(endDay, daysInMonth); d++) {
    const wd = new Date(Date.UTC(yy, mm - 1, d))
      .toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-GB', { weekday: 'short', timeZone: 'UTC' })
    const parts = order.map(s => `${letter[s]}:${codeFor(byDate[d]?.[s])}`)
    lines.push(`${d} ${wd} — ${parts.join('  ')}`)
  }
  return lines
}

// Day-by-day attendance: which slot, what was taken, or ✕ if absent.
// Matches the manual sheet: ✓ for veg, ✕ for absent, others shown by name.
export function AttendanceGrid({ entries, types, ym, lang }) {
  const { t } = useLang()
  const typeById = Object.fromEntries((types || []).map(tt => [tt.id, tt]))

  const byDate = {}
  const usedSlots = new Set()
  let firstDay = 99
  for (const e of entries || []) {
    const day = Number(e.entry_date.slice(8, 10))
    firstDay = Math.min(firstDay, day)
    usedSlots.add(e.slot)
    ;(byDate[day] = byDate[day] || {})[e.slot] = e
  }
  const slots = SLOT_ORDER.filter(s => usedSlots.has(s.key))

  if (!entries || entries.length === 0 || slots.length === 0) {
    return <p className="text-sm text-gray-400">{t('No meals recorded this month.', 'इस महीने कोई भोजन दर्ज नहीं।')}</p>
  }

  const { end } = monthBounds(ym)
  const daysInMonth = Number(end.slice(8, 10))
  const endDay = ym === currentMonthIST() ? Number(todayIST().slice(8, 10)) : daysInMonth
  const days = []
  for (let d = firstDay; d <= Math.min(endDay, daysInMonth); d++) days.push(d)

  const [yy, mm] = ym.split('-').map(Number)
  const weekday = (d) => new Date(Date.UTC(yy, mm - 1, d))
    .toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-GB', { weekday: 'short', timeZone: 'UTC' })

  const Cell = ({ e }) => {
    if (!e) return <span className="text-red-400">✕</span>
    const tt = typeById[e.tiffin_type_id]
    if (!tt) return <span className="text-gray-300">•</span>
    if (tt.name_en.trim().toLowerCase() === 'veg tiffin') return <span className="text-tgreen font-bold">✓</span>
    return <span className="text-gray-700">{shortItem(tt, e.portion, lang)}</span>
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400">
              <th className="text-left font-medium py-1 pr-2">{t('Date', 'तारीख')}</th>
              {slots.map(s => (
                <th key={s.key} className="text-center font-medium py-1 px-1">{t(s.en, s.hi)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(d => (
              <tr key={d} className="border-t border-gray-100">
                <td className="py-1.5 pr-2 text-gray-600 whitespace-nowrap">{d} {weekday(d)}</td>
                {slots.map(s => (
                  <td key={s.key} className="text-center py-1.5 px-1">
                    <Cell e={byDate[d]?.[s.key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-400 mt-2">
        {t('✓ Veg · ✕ Absent · ½ half plate · F full plate',
           '✓ वेज · ✕ अनुपस्थित · ½ हाफ · F फुल')}
      </p>
    </div>
  )
}
