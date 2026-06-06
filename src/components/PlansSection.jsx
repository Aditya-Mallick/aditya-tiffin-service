import { Check, MessageCircle } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { plans, waLink } from '../data/content'

export default function PlansSection() {
  const { t } = useLang()
  return (
    <section className="py-12 px-4 bg-cream">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-gray-900 mb-2">
          {t('Monthly Subscription Plans', 'मासिक सदस्यता योजनाएं')}
        </h2>
        <p className="text-center text-gray-500 text-sm mb-8 max-w-md mx-auto">
          {t(
            'Contact us on WhatsApp for pricing — we offer flexible plans to suit your budget.',
            'कीमत जानने के लिए WhatsApp करें — हम आपके बजट के अनुसार योजना देते हैं।'
          )}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl p-6 shadow-card flex flex-col ${
                plan.popular ? 'ring-2 ring-saffron' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-saffron text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                  {t('Most Popular', 'सबसे लोकप्रिय')}
                </div>
              )}

              <h3 className="font-extrabold text-gray-900 text-lg">{t(plan.name.en, plan.name.hi)}</h3>
              <p className="text-xs text-gray-400 mb-5 mt-0.5">{t(plan.sub.en, plan.sub.hi)}</p>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check size={14} className="text-tgreen mt-0.5 flex-shrink-0" />
                    {t(f.en, f.hi)}
                  </li>
                ))}
              </ul>

              <a
                href={waLink(plan.waMsg)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-tgreen text-white text-sm font-semibold py-3 rounded-xl hover:bg-tgreen-dark transition-colors"
              >
                <MessageCircle size={15} />
                {t('Get Price on WhatsApp', 'WhatsApp पर कीमत जानें')}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
