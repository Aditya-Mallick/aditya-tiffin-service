import { Outlet, NavLink, Link } from 'react-router-dom'
import { Settings as SettingsIcon } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { useAuth } from './AuthContext'

const ROLE_LABEL = {
  owner: { en: 'Owner', hi: 'मालिक' },
  admin: { en: 'Admin', hi: 'एडमिन' },
  staff: { en: 'Staff', hi: 'स्टाफ' },
}

export default function ManageLayout() {
  const { t, lang, setLang } = useLang()
  const { profile, role, signOut, canSeeMoney, isAdmin } = useAuth()
  const roleLabel = role ? t(ROLE_LABEL[role].en, ROLE_LABEL[role].hi) : ''

  const tabs = [
    { to: '/manage', end: true, en: 'Today', hi: 'आज' },
    { to: '/manage/customers', end: false, en: 'Customers', hi: 'ग्राहक' },
    ...(canSeeMoney ? [
      { to: '/manage/payments', end: false, en: 'Payments', hi: 'भुगतान' },
      { to: '/manage/bills', end: false, en: 'Bills', hi: 'बिल' },
    ] : []),
  ]
  const gridCols = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[tabs.length] || 'grid-cols-2'

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white shadow-card">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-tgreen-dark leading-tight truncate">
              {t('Aditya Tiffin Service', 'आदित्य टिफिन सेवा')}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {profile?.full_name}{roleLabel ? ` · ${roleLabel}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <Link to="/manage/settings" aria-label={t('Settings', 'सेटिंग्स')}
                    className="text-gray-500 hover:text-gray-700 p-1.5">
                <SettingsIcon size={20} />
              </Link>
            )}
            <button type="button" onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}
                    className="text-sm font-medium text-saffron-dark px-3 py-1.5 rounded-full bg-cream">
              {lang === 'hi' ? 'EN' : 'हिं'}
            </button>
            <button type="button" onClick={signOut}
                    className="text-sm font-medium text-white bg-saffron hover:bg-saffron-dark px-3 py-1.5 rounded-full">
              {t('Logout', 'लॉगआउट')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 pb-24">
        <Outlet />
      </main>

      {/* Bottom tab bar (thumb-friendly on phones) */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-20">
        <div className={`max-w-3xl mx-auto grid ${gridCols}`}>
          {tabs.map(tab => (
            <NavLink key={tab.to} to={tab.to} end={tab.end}
              className={({ isActive }) =>
                `py-3 text-center text-xs sm:text-sm font-semibold ${isActive ? 'text-saffron' : 'text-gray-500'}`}>
              {t(tab.en, tab.hi)}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
