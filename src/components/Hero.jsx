import { MessageCircle, ChevronDown } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { waLink } from '../data/content'

const stats = [
  { n: '5+', en: 'Years serving',    hi: 'वर्षों से सेवा' },
  { n: '2',  en: 'Meals daily',      hi: 'रोज़ दो बार' },
  { n: '₹80',en: 'Starting price',   hi: 'शुरुआती कीमत' },
]

export default function Hero() {
  const { t } = useLang()
  return (
    <section className="bg-cream px-4 pt-10 pb-14 text-center">
      <div className="max-w-2xl mx-auto">
        <span className="inline-block bg-saffron/10 text-saffron text-xs font-semibold px-3 py-1 rounded-full mb-5 tracking-wide uppercase">
          {t('Since 2020 · Supaul, Bihar', 'वर्ष 2020 से · सुपौल, बिहार')}
        </span>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
          {t('Homemade Tiffin,', 'घर जैसा टिफिन,')}
          <br />
          <span className="text-saffron">{t('Delivered Fresh Daily', 'रोज़ ताज़ा डिलीवरी')}</span>
        </h1>

        <p className="text-gray-500 text-base sm:text-lg mb-8 max-w-lg mx-auto leading-relaxed">
          {t(
            'Pure home-cooked meals — veg and non-veg — delivered to your door in Supaul. Fresh ingredients, cooked with care, every single day.',
            'घर पर पका शुद्ध शाकाहारी और मांसाहारी भोजन — सुपौल में सीधे आपके दरवाज़े पर। ताज़ी सामग्री, हर दिन।'
          )}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <a
            href={waLink('Hello, I want to order a tiffin.')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-tgreen text-white font-bold px-7 py-3.5 rounded-full text-base hover:bg-tgreen-dark transition-colors shadow-card w-full sm:w-auto justify-center"
          >
            <MessageCircle size={18} />
            {t('Order on WhatsApp', 'WhatsApp पर ऑर्डर करें')}
          </a>
          <a
            href="#menu"
            className="flex items-center gap-2 border-2 border-saffron text-saffron font-semibold px-7 py-3.5 rounded-full text-base hover:bg-saffron hover:text-white transition-colors w-full sm:w-auto justify-center"
          >
            <ChevronDown size={18} />
            {t('View Menu', 'मेनू देखें')}
          </a>
        </div>

        <div className="flex justify-center gap-10 sm:gap-16 border-t border-gray-100 pt-8">
          {stats.map(s => (
            <div key={s.n} className="text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-saffron">{s.n}</p>
              <p className="text-xs text-gray-400 mt-1">{t(s.en, s.hi)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
