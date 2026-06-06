import { MessageCircle } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { waLink } from '../data/content'

export default function RotiCallout() {
  const { t } = useLang()
  return (
    <section className="bg-amber-50 border-t border-b border-amber-200 py-8 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h3 className="font-extrabold text-gray-900 text-lg mb-1">
          {t('Order Roti Separately', 'केवल रोटी भी ऑर्डर करें')}
        </h3>
        <p className="text-gray-600 text-sm mb-4 leading-relaxed">
          {t(
            'You can order phulka rotis on their own — great if you cook at home but want fresh rotis delivered.',
            'आप अलग से फुल्का रोटी ऑर्डर कर सकते हैं — घर पर खाना बनाते हैं पर ताज़ी रोटी चाहिए, तो यह बेस्ट है।'
          )}
        </p>
        <div className="flex flex-wrap justify-center gap-3 mb-5 text-sm">
          <span className="bg-white border border-amber-300 rounded-full px-4 py-1.5 font-bold text-gray-800">
            {t('₹6 per roti', '₹6 प्रति रोटी')}
          </span>
          <span className="bg-white border border-gray-200 rounded-full px-4 py-1.5 text-gray-500 text-xs">
            {t('Free delivery on orders ₹100+', '₹100+ पर मुफ्त डिलीवरी')}
          </span>
        </div>
        <a
          href={waLink('Hello, I want to order rotis separately. Please share details.')}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-tgreen text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-tgreen-dark transition-colors"
        >
          <MessageCircle size={15} />
          {t('Order Roti on WhatsApp', 'WhatsApp पर रोटी ऑर्डर करें')}
        </a>
      </div>
    </section>
  )
}
