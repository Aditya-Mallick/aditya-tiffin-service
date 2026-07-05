import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useLang } from '../context/LanguageContext'
import { useAuth } from './AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated, loading, profile } = useAuth()
  const { t } = useLang()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center text-gray-500">
        {t('Loading…', 'लोड हो रहा है…')}
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/manage/login" replace state={{ from: location }} />
  }

  // Logged in but account disabled by the owner.
  if (profile && profile.active === false) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 text-center">
        <p className="text-gray-600 max-w-xs">
          {t('This account is disabled. Please contact the owner.',
             'यह खाता बंद है। कृपया मालिक से संपर्क करें।')}
        </p>
      </div>
    )
  }

  return <Outlet />
}
