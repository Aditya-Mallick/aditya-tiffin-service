import { MessageCircle, Phone } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { WA_NUMBER, waLink } from '../data/content'

export default function WhatsAppCTA() {
  const { t } = useLang()
  return (
    <section className="bg-tgreen py-14 px-4 text-center text-white">
      <div className="max-w-xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
          {t('Ready to Order?', 'ऑर्डर करने के लिए तैयार हैं?')}
        </h2>
        <p className="text-green-100 text-sm mb-8 leading-relaxed">
          {t(
            'Send us a WhatsApp message and we will confirm your tiffin. Free delivery on all orders in Supaul.',
            'WhatsApp पर संदेश भेजें और टिफिन कन्फर्म करें। सुपौल में सभी ऑर्डर पर मुफ्त डिलीवरी।'
          )}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={waLink('Hello, I want to order a tiffin. Please share details.')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-white text-tgreen font-bold px-8 py-3.5 rounded-full hover:bg-green-50 transition-colors text-base"
          >
            <MessageCircle size={18} />
            {t('Order on WhatsApp', 'WhatsApp पर ऑर्डर करें')}
          </a>
          <a
            href={`tel:+${WA_NUMBER}`}
            className="flex items-center justify-center gap-2 border-2 border-white/70 text-white font-semibold px-8 py-3.5 rounded-full hover:bg-white/10 transition-colors text-base"
          >
            <Phone size={18} />
            {t('Call Now', 'अभी कॉल करें')}
          </a>
        </div>
      </div>
    </section>
  )
}
