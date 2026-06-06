import { Phone, MapPin, Clock, MessageCircle } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { WA_NUMBER, WA_ALT, waLink } from '../data/content'

export default function ContactSection() {
  const { t } = useLang()
  return (
    <section id="contact" className="py-12 px-4 bg-white">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-gray-900 mb-8">
          {t('Contact Us', 'संपर्क करें')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Contact details */}
          <div className="bg-cream rounded-2xl p-6">
            <h3 className="font-bold text-gray-900 text-base mb-5">{t('Get in Touch', 'संपर्क जानकारी')}</h3>
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <Phone size={17} className="text-saffron mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">{t('Primary (WhatsApp)', 'प्राथमिक (WhatsApp)')}</p>
                  <a href={`tel:+${WA_NUMBER}`} className="text-saffron font-bold text-base hover:underline">
                    +91 98184 87872
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone size={17} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">{t('Alternate', 'वैकल्पिक नंबर')}</p>
                  <a href={`tel:+${WA_ALT}`} className="text-gray-800 font-semibold hover:underline">
                    +91 95995 69194
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={17} className="text-tgreen mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">{t('Location', 'स्थान')}</p>
                  <p className="text-gray-800 font-semibold text-sm">Supaul, Bihar, India</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock size={17} className="text-gold mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">{t('Delivery Hours', 'डिलीवरी समय')}</p>
                  <p className="text-gray-800 text-sm space-y-0.5">
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-saffron inline-block flex-shrink-0" />
                      {t('Morning: 8:30 – 10:00 AM', 'सुबह: 8:30 – 10:00 बजे')}
                      <span className="text-xs text-gray-400">{t('(office tiffin)', '(ऑफिस टिफिन)')}</span>
                    </span>
                    <span className="flex items-center gap-2 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-tgreen inline-block flex-shrink-0" />
                      {t('Lunch: 12:00 – 2:00 PM', 'दोपहर: 12:00 – 2:00 बजे')}
                    </span>
                    <span className="flex items-center gap-2 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block flex-shrink-0" />
                      {t('Dinner: 7:00 – 9:00 PM', 'रात: 7:00 – 9:00 बजे')}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Owner card */}
          <div className="bg-tgreen/5 border border-tgreen/20 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium mb-2">{t('Owner', 'मालिक')}</p>
              <p className="text-2xl font-extrabold text-tgreen">Satendra Mallick</p>
              <p className="text-gray-500 text-sm mt-1">
                {t('Aditya Tiffin Service — Est. 2020', 'आदित्य टिफिन सेवा — स्थापित 2020')}
              </p>
              <p className="text-gray-400 text-xs mt-4 leading-relaxed">
                {t(
                  'Have a custom requirement or want to discuss a bulk/office order? Reach out directly.',
                  'कोई खास ज़रूरत है या बल्क/ऑफिस ऑर्डर देना है? सीधे संपर्क करें।'
                )}
              </p>
            </div>
            <a
              href={waLink('Hello Satendra ji, I want to place a tiffin order. Please share details.')}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex items-center justify-center gap-2 bg-tgreen text-white font-semibold py-3 rounded-xl hover:bg-tgreen-dark transition-colors text-sm"
            >
              <MessageCircle size={16} />
              {t('WhatsApp Satendra ji', 'सतेन्द्र जी को WhatsApp करें')}
            </a>
          </div>

        </div>
      </div>
    </section>
  )
}
