import { Phone, MessageCircle } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { WA_NUMBER, waLink } from '../data/content'

export default function StickyOrderBar() {
  const { t } = useLang()
  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.12)]">
      <a
        href={`tel:+${WA_NUMBER}`}
        className="flex-1 flex items-center justify-center gap-2 py-4 text-gray-700 font-semibold text-sm border-r border-gray-200 active:bg-gray-50"
      >
        <Phone size={16} />
        {t('Call', 'कॉल करें')}
      </a>
      <a
        href={waLink('Hello, I want to order a tiffin. Please share details.')}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center gap-2 py-4 bg-tgreen text-white font-bold text-sm active:bg-tgreen-dark"
      >
        <MessageCircle size={16} />
        {t('Order on WhatsApp', 'WhatsApp ऑर्डर')}
      </a>
    </div>
  )
}
