import { useNavigate } from 'react-router-dom'
import { ChevronRight, UtensilsCrossed, Users as UsersIcon } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { useAuth } from './AuthContext'
import { EmptyState } from './ui'

export default function Settings() {
  const { t } = useLang()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()

  if (!isAdmin) {
    return <EmptyState text={t('Settings are only for the owner and admin.',
                              'सेटिंग्स केवल मालिक और एडमिन के लिए।')} />
  }

  const items = [
    { to: '/manage/menu', Icon: UtensilsCrossed,
      title: t('Menu & prices', 'मेन्यू और दरें'),
      desc: t('Add or edit items and their default rates.', 'आइटम और उनकी दरें बदलें।') },
    { to: '/manage/users', Icon: UsersIcon,
      title: t('Users & logins', 'यूज़र और लॉगिन'),
      desc: t('Add family or staff, reset PINs.', 'परिवार/स्टाफ जोड़ें, पिन रीसेट करें।') },
  ]

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-bold text-gray-800">{t('Settings', 'सेटिंग्स')}</h2>
      <div className="space-y-2">
        {items.map(({ to, Icon, title, desc }) => (
          <button key={to} onClick={() => navigate(to)}
                  className="w-full text-left bg-white rounded-xl shadow-card p-4 flex items-center gap-3">
            <Icon className="text-saffron shrink-0" size={22} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800">{title}</p>
              <p className="text-sm text-gray-500">{desc}</p>
            </div>
            <ChevronRight className="text-gray-300 shrink-0" size={20} />
          </button>
        ))}
      </div>
    </div>
  )
}
