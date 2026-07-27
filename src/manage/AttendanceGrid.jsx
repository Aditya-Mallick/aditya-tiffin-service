import { useLang } from '../context/LanguageContext'
import { monthBounds, currentMonthIST, todayIST } from './api'

const SLOT_ORDER = [
  { key: 'morning', en: 'Morning', hi: 'सुबह' },
  { key: 'afternoon', en: 'Afternoon', hi: 'दोपहर' },
  { key: 'evening', en: 'Evening', hi: 'शाम' },
]

// Emoji and other "East Asian Wide" characters occupy two cells in a
// monospace font, so padding must count them as two — otherwise the columns
// drift, which is what plain .length did.
function charWidth(cp) {
  if (cp === 0xFE0F || cp === 0x200D) return 0            // variation selector / ZWJ
  if (cp === 0x2713 || cp === 0x2715) return 1            // ✓ ✕ render as narrow text
  if (cp >= 0x1F300 && cp <= 0x1FAFF) return 2            // pictographs
  if (cp >= 0x2600 && cp <= 0x27BF) return 2              // emoji-presentation dingbats
  if (cp >= 0x2B00 && cp <= 0x2BFF) return 2
  if (cp >= 0x1100 && cp <= 0x115F) return 2              // CJK ranges
  if (cp >= 0x2E80 && cp <= 0xA4CF) return 2
  if (cp >= 0xAC00 && cp <= 0xD7A3) return 2
  if (cp >= 0xF900 && cp <= 0xFAFF) return 2
  if (cp >= 0xFF00 && cp <= 0xFF60) return 2
  return 1
}
export function dispWidth(s) {
  let n = 0
  for (const ch of String(s)) n += charWidth(ch.codePointAt(0))
  return n
}
function padDisp(s, target) {
  const pad = Math.max(0, target - dispWidth(s))
  return String(s) + ' '.repeat(pad)
}

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
  let lastDay = 0
  for (const e of entries || []) {
    const day = Number(e.entry_date.slice(8, 10))
    firstDay = Math.min(firstDay, day)
    lastDay = Math.max(lastDay, day)
    usedSlots.add(e.slot)
    ;(byDate[day] = byDate[day] || {})[e.slot] = e
  }
  const slots = SLOT_ORDER.filter(s => usedSlots.has(s.key))
  if (!entries || entries.length === 0 || slots.length === 0) return []

  const { end } = monthBounds(ym)
  const daysInMonth = Number(end.slice(8, 10))
  // Stop at the last day they actually took something — no point padding the
  // message with rows of ❌ after service ended for the month.
  const endDay = Math.min(
    ym === currentMonthIST() ? Number(todayIST().slice(8, 10)) : daysInMonth,
    lastDay,
  )
  const [yy, mm] = ym.split('-').map(Number)
  const locale = 'en-GB'   // ASCII weekday names, so the columns stay aligned

  // Item names stay English/ASCII in both languages — Devanagari is not
  // single-width in WhatsApp's monospace font and would skew the columns.
  // ✅ / ❌ are safe because they are defined as double-width and padded as
  // two cells (see dispWidth).
  const cellFor = (e, o = {}) => {
    if (!e) return '✕'                                   // not taken
    const tt = typeById[e.tiffin_type_id]
    if (!tt) return '?'
    // Veg is the everyday case — a tick reads faster than the word.
    if (!tt.has_portions && /^veg\b/i.test(String(tt.name_en || '')) && (e.quantity || 1) === 1) {
      return '✓'
    }
    let name = String(tt.name_en || '').replace(/\s*tiffin$/i, '')
    if (o.shortName) {
      name = name.replace(/^Chicken/, 'Chkn').replace(/^Mutton/, 'Mutn')
                 .replace(/^Special/, 'Spcl').replace(/^Paneer/, 'Pnr')
    }
    // Trim the NAME if space is very tight — never the portion or quantity,
    // which carry the money-relevant information.
    if (o.nameMax) name = name.slice(0, o.nameMax).trim()
    // Half is the default serving, so it needs no suffix — "Chicken" means a
    // half plate; only a full plate is called out.
    if (tt.has_portions && e.portion === 'full') {
      name += o.shortPortion ? ' F' : ' Full'
    }
    if ((e.quantity || 1) > 1) name += ` x${e.quantity}`
    return name
  }

  const dayList = []
  for (let d = firstDay; d <= Math.min(endDay, daysInMonth); d++) dayList.push(d)
  const monthShort = new Date(Date.UTC(yy, mm - 1, 1))
    .toLocaleDateString(locale, { month: 'short', timeZone: 'UTC' })
  const weekdayShort = (d) => new Date(Date.UTC(yy, mm - 1, d))
    .toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' })
  // e.g. "11 Jul (Mon)" → "11 Jul" → "11" as space gets tighter.
  const dateLabel = (d, o = {}) => {
    let s = String(d)
    if (!o.noMonth) s += ' ' + monthShort
    if (!o.noWeekday) s += ` (${weekdayShort(d)})`
    return s
  }

  // A slot used only once or twice doesn't deserve a whole column — it would
  // just be a column of X's. Those days are listed underneath instead.
  const useCount = (s) => dayList.filter(d => byDate[d]?.[s.key]).length
  let columns = slots.filter(s => useCount(s) >= 3)
  if (columns.length === 0) columns = slots
  const asideSlots = slots.filter(s => !columns.includes(s))

  const SHORT_HEAD = { morning: 'Morn', afternoon: 'Noon', evening: 'Eve' }

  const build = (o) => {
    const rows = dayList.map(d => [
      dateLabel(d, o),
      ...columns.map(s => cellFor(byDate[d]?.[s.key], o)),
    ])
    const header = ['Date', ...columns.map(s => o.shortHead ? SHORT_HEAD[s.key] : s.en)]
    const widths = header.map((h, i) =>
      Math.max(dispWidth(h), ...rows.map(r => dispWidth(String(r[i])))))
    // Pad by display width (emoji count as two cells), and join with '' — the
    // padding already supplies the gutter.
    const fmt = (cells) => cells
      .map((c, i) => (i === cells.length - 1 ? String(c) : padDisp(String(c), widths[i] + 2)))
      .join('')
      .trimEnd()
    const lines = [fmt(header), ...rows.map(fmt)]
    return { lines, width: Math.max(...lines.map(dispWidth)), opts: o }
  }

  // A day must never wrap onto a second line. A phone shows roughly this many
  // monospace characters, so try progressively more compact forms and use the
  // first that fits — full words whenever they do.
  // Ordered least-harmful first: shorten headings, then drop the weekday
  // (the date keeps its month), then abbreviate items, then the portion.
  const MAX_WIDTH = 34
  const levels = [
    {},
    { shortHead: true },
    { shortHead: true, noWeekday: true },
    { shortHead: true, noWeekday: true, shortName: true },
    { shortHead: true, noWeekday: true, shortName: true, shortPortion: true },
    { shortHead: true, noWeekday: true, shortName: true, shortPortion: true, noMonth: true },
  ]
  let out = build(levels[0])
  for (const lvl of levels) {
    const attempt = build(lvl)
    out = attempt
    if (attempt.width <= MAX_WIDTH) break
  }
  // Last resort (e.g. a big quantity in all three slots): shorten the item
  // names further, keeping portion and quantity intact, so a row can't wrap.
  if (out.width > MAX_WIDTH) {
    const last = levels[levels.length - 1]
    for (let nameMax = 6; nameMax >= 2; nameMax--) {
      out = build({ ...last, nameMax })
      if (out.width <= MAX_WIDTH) break
    }
  }

  // Days whose only meal was in a rarely-used slot.
  const notes = []
  for (const s of asideSlots) {
    for (const d of dayList) {
      const e = byDate[d]?.[s.key]
      if (e) notes.push(`${dateLabel(d)} — ${s.en}: ${cellFor(e)}`)
    }
  }

  return {
    lines: out.lines,
    notes,
    // Legend hints for whatever shortening was needed (usually none).
    abbreviated: Boolean(out.opts.shortName),
    portionShort: Boolean(out.opts.shortPortion),
  }
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
