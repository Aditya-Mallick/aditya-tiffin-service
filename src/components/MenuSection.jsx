import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { dailyItems, pricingItems, weeklyMenu, waLink } from '../data/content'

const TABS = [
  { en: 'Daily Items',      hi: 'रोज़ का खाना' },
  { en: 'Thalis & Pricing', hi: 'थाली और कीमत' },
  { en: 'Weekly Schedule',  hi: 'साप्ताहिक मेनू' },
]

export default function MenuSection() {
  const { t } = useLang()
  const [tab, setTab] = useState(1)

  return (
    <section id="menu" className="py-12 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-gray-900 mb-2">
          {t('Our Menu', 'हमारा मेनू')}
        </h2>
        <p className="text-center text-gray-500 text-sm mb-7">
          {t('Fresh, home-cooked meals every day', 'रोज़ ताज़ा, घर का पका खाना')}
        </p>

        {/* Tab bar */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-8 pb-1">
          {TABS.map((tab_, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                tab === i
                  ? 'bg-saffron text-white shadow-card'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t(tab_.en, tab_.hi)}
            </button>
          ))}
        </div>

        {/* ── Tab 0: Daily Items ─────────────────────────────── */}
        {tab === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dailyItems.map(item => (
              <div
                key={item.id}
                className="bg-cream rounded-xl p-4 border-l-4"
                style={{ borderLeftColor: item.accent }}
              >
                <p className="font-semibold text-gray-900 text-sm">{t(item.name.en, item.name.hi)}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t(item.desc.en, item.desc.hi)}</p>
                <span
                  className="inline-block mt-2.5 text-xs font-medium px-2.5 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: item.accent }}
                >
                  {t(item.badge.en, item.badge.hi)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab 1: Thalis & Pricing ────────────────────────── */}
        {tab === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pricingItems.map(item => (
              <div
                key={item.id}
                className={`rounded-xl border-2 p-5 ${item.featured ? 'border-saffron bg-saffron/5' : 'border-gray-100 bg-white'}`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-base leading-snug">{t(item.name.en, item.name.hi)}</p>
                    {item.unit && (
                      <p className="text-xs text-gray-400 mt-0.5">{t(item.unit.en, item.unit.hi)}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-extrabold" style={{ color: item.color }}>{item.price}</p>
                    {item.packing && <p className="text-xs text-gray-400">{item.packing}</p>}
                  </div>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed mb-3">{t(item.desc.en, item.desc.hi)}</p>

                {item.half && (
                  <p className="text-xs font-medium text-gray-600 bg-gray-100 rounded-lg px-3 py-1.5 mb-3">
                    {t(item.half.en, item.half.hi)}
                  </p>
                )}

                <a
                  href={waLink(item.waMsg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full bg-tgreen text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-tgreen-dark transition-colors"
                >
                  <MessageCircle size={13} />
                  {t('Order on WhatsApp', 'WhatsApp पर ऑर्डर करें')}
                </a>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab 2: Weekly Schedule ─────────────────────────── */}
        {tab === 2 && (
          <div className="space-y-3">
            {weeklyMenu.map((d, i) => (
              <div key={i} className="bg-cream rounded-xl overflow-hidden">
                <div className="bg-saffron/10 px-4 py-2 border-l-4 border-saffron">
                  <p className="font-bold text-saffron text-sm">{t(d.day.en, d.day.hi)}</p>
                </div>
                <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                  <div>
                    <span className="text-tgreen font-semibold">{t('Lunch: ', 'दोपहर: ')}</span>
                    {d.lunch}
                  </div>
                  <div>
                    <span className="text-saffron font-semibold">{t('Dinner: ', 'रात: ')}</span>
                    {d.dinner}
                  </div>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-400 text-center pt-1">
              {t(
                '* Menu may vary slightly based on seasonal availability.',
                '* मौसम के अनुसार मेनू में थोड़ा बदलाव हो सकता है।'
              )}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
