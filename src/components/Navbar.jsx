import { useState, useEffect } from 'react'
import { Phone } from 'lucide-react'
import { useLang } from '../context/LanguageContext'
import { waLink } from '../data/content'

export default function Navbar() {
  const { lang, setLang, t } = useLang()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${scrolled ? 'shadow-card' : ''}`}>
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-extrabold text-saffron text-base sm:text-lg leading-tight">Aditya Tiffin Service</p>
          <p className="text-xs text-gray-400">{t('Supaul, Bihar', 'सुपौल, बिहार')}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            className="text-xs font-semibold border border-saffron text-saffron px-3 py-1.5 rounded-full hover:bg-saffron hover:text-white transition-colors"
          >
            {lang === 'en' ? 'हिंदी' : 'English'}
          </button>
          <a
            href={waLink('Hello, I want to order a tiffin.')}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 bg-tgreen text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-tgreen-dark transition-colors"
          >
            <Phone size={14} />
            {t('Order Now', 'अभी ऑर्डर करें')}
          </a>
        </div>
      </div>
    </nav>
  )
}
