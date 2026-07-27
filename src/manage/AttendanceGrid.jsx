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

// The same day-by-day grid as the app, as an aligned monospace table for the
// WhatsApp bill. Wrap the result in ``` fences and WhatsApp keeps the columns
// lined up, so it reads like a compact table instead of long sentences:
//
//   Date     Morning  Evening
//   1 Wed    ✓        Chicken ½
//   6 Mon    ✓        -
export function attendanceTextLines(entries, types, ym, lang) {
  const hi = lang === 'hi'
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
  if (!entries || entries.length === 0 || slots.length === 0) return []

  const { end } = monthBounds(ym)
  const daysInMonth = Number(end.slice(8, 10))
  const endDay = ym === currentMonthIST() ? Number(todayIST().slice(8, 10)) : daysInMonth
  const [yy, mm] = ym.split('-').map(Number)
  const locale = 'en-GB'   // ASCII weekday names, so the columns stay aligned

  // The table is deliberately ASCII/English, in both languages: characters like
  // ✓, ½ and Devanagari are not single-width in WhatsApp's monospace font, so
  // mixing them in knocks the columns out of line. The rest of the bill still
  // follows the chosen language.
  const cellFor = (e) => {
    if (!e) return 'X'                                   // not taken
    const tt = typeById[e.tiffin_type_id]
    if (!tt) return '?'
    let name = String(tt.name_en || '').replace(/\s*tiffin$/i, '')
    if (tt.has_portions) name += e.portion === 'full' ? ' Full' : ' Half'
    if ((e.quantity || 1) > 1) name += ` x${e.quantity}`
    return name
  }

  // Build the rows first so the columns can be padded to a common width.
  const rows = []
  for (let d = firstDay; d <= Math.min(endDay, daysInMonth); d++) {
    const weekday = new Date(Date.UTC(yy, mm - 1, d))
      .toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' })
    rows.push([`${d} ${weekday}`, ...slots.map(s => cellFor(byDate[d]?.[s.key]))])
  }
  const header = ['Date', ...slots.map(s => s.en)]   // ASCII, to keep columns aligned
  const widths = header.map((h, i) =>
    Math.max(h.length, ...rows.map(r => String(r[i]).length)))
  const fmt = (cells) => cells
    .map((c, i) => (i === cells.length - 1 ? String(c) : String(c).padEnd(widths[i] + 1)))
    .join(' ')
    .trimEnd()

  return [fmt(header), ...rows.map(fmt)]
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
