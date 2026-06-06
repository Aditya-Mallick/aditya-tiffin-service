import { Truck, Info } from 'lucide-react'
import { useLang } from '../context/LanguageContext'

export default function DeliveryBanner() {
  const { t } = useLang()
  return (
    <div className="bg-tgreen text-white text-xs sm:text-sm py-2 px-4">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-center">
        <span className="flex items-center gap-1.5">
          <Truck size={13} />
          {t('Free home delivery on all tiffin orders', 'सभी टिफिन ऑर्डर पर मुफ्त होम डिलीवरी')}
        </span>
        <span className="flex items-center gap-1.5 text-green-200">
          <Info size={13} />
          {t('Roti-only orders: free delivery on ₹100+', 'केवल रोटी: ₹100+ पर मुफ्त डिलीवरी')}
        </span>
      </div>
    </div>
  )
}
