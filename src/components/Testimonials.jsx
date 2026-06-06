import { useLang } from '../context/LanguageContext'
import { testimonials } from '../data/content'

export default function Testimonials() {
  const { t } = useLang()
  return (
    <section className="py-12 px-4 bg-cream">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-gray-900 mb-2">
          {t('What Our Customers Say', 'हमारे ग्राहक क्या कहते हैं')}
        </h2>
        <p className="text-center text-gray-500 text-sm mb-8">
          {t('Trusted by families and working professionals in Supaul', 'सुपौल के परिवारों और कामकाजी लोगों का भरोसा')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {testimonials.map((item, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-card">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                >
                  {item.initials}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                  <p className="text-xs text-gray-400">{t(item.role.en, item.role.hi)}</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed italic">
                {t(item.text.en, item.text.hi)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
