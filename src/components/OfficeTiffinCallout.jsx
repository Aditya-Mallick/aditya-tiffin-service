import { MessageCircle, Clock } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { waLink } from '../data/content'

export default function OfficeTiffinCallout() {
  const { t } = useLang()
  return (
    <section className="bg-saffron/5 border-t border-b border-saffron/20 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Icon + time badge */}
          <div className="flex-shrink-0 bg-saffron/10 rounded-2xl px-5 py-4 text-center min-w-[120px]">
            <Clock size={22} className="text-saffron mx-auto mb-1" />
            <p className="text-saffron font-extrabold text-sm">8:30 – 10:00</p>
            <p className="text-saffron/70 text-xs">{t('AM', 'सुबह')}</p>
          </div>

          {/* Text */}
          <div className="flex-1">
            <h3 className="font-extrabold text-gray-900 text-base mb-1">
              {t('Morning Office Tiffin', 'सुबह का ऑफिस टिफिन')}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-3">
              {t(
                'Heading to office early? We deliver the same fresh lunch — dal, rice, sabzi, roti — between 8:30 and 10:00 AM so you can eat well before your day starts.',
                'सुबह जल्दी ऑफिस जाते हैं? हम वही ताज़ा खाना — दाल, चावल, सब्ज़ी, रोटी — सुबह 8:30 से 10:00 बजे के बीच पहुंचाते हैं।'
              )}
            </p>
            <a
              href={waLink('Hello, I need morning office tiffin delivery (8:30–10 AM). Please share details.')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-saffron text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-saffron-dark transition-colors"
            >
              <MessageCircle size={15} />
              {t('Order Morning Tiffin', 'सुबह का टिफिन ऑर्डर करें')}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
