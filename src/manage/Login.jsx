import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useLang } from '../context/LanguageContext'
import { useAuth } from './AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'

export default function Login() {
  const { t, lang, setLang } = useLang()
  const { signInWithMobilePin, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mobile, setMobile] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const from = location.state?.from?.pathname || '/manage'

  if (!loading && isAuthenticated) return <Navigate to={from} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (mobile.replace(/\D/g, '').length < 10) {
      setError(t('Enter a valid 10-digit mobile number.', 'सही 10 अंकों का मोबाइल नंबर डालें।'))
      return
    }
    if (pin.length < 4) {
      setError(t('PIN must be at least 4 digits.', 'पिन कम से कम 4 अंकों का होना चाहिए।'))
      return
    }
    setBusy(true)
    const { error } = await signInWithMobilePin(mobile, pin)
    setBusy(false)
    if (error) {
      setError(t('Wrong mobile number or PIN.', 'गलत मोबाइल नंबर या पिन।'))
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Language toggle */}
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}
            className="text-sm font-medium text-saffron-dark bg-white rounded-full px-4 py-1.5 shadow-card"
          >
            {lang === 'hi' ? 'English' : 'हिंदी'}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-6">
          <h1 className="text-xl font-bold text-tgreen-dark text-center">
            {t('Aditya Tiffin Service', 'आदित्य टिफिन सेवा')}
          </h1>
          <p className="text-center text-gray-500 mt-1 mb-6">
            {t('Staff & family login', 'स्टाफ और परिवार लॉगिन')}
          </p>

          {!isSupabaseConfigured && (
            <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">
              {t(
                'Not connected to the database yet. Add your Supabase keys in .env.local (see setup guide).',
                'डेटाबेस से अभी कनेक्ट नहीं है। .env.local में Supabase कीज़ डालें (सेटअप गाइड देखें)।'
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('Mobile number', 'मोबाइल नंबर')}
              </label>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="username"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder={t('10-digit mobile number', '10 अंकों का मोबाइल नंबर')}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-saffron"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('PIN', 'पिन')}
              </label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-saffron"
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-saffron hover:bg-saffron-dark disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-base transition-colors"
            >
              {busy ? t('Signing in…', 'लॉगिन हो रहा है…') : t('Sign in', 'लॉगिन करें')}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 text-xs mt-4">
          {t('Forgot your PIN? Ask the owner to reset it.',
             'पिन भूल गए? मालिक से रीसेट करवाएं।')}
        </p>
      </div>
    </div>
  )
}
