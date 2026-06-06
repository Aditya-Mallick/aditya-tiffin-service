import { useLang } from '../context/LanguageContext'

export default function Footer() {
  const { t } = useLang()
  return (
    // pb-24 on mobile to clear the sticky order bar
    <footer className="bg-gray-900 text-gray-500 py-8 px-4 text-center text-xs pb-24 sm:pb-8">
      <p className="font-bold text-white text-sm mb-1">Aditya Tiffin Service</p>
      <p className="mb-1">
        {t('Owner: Satendra Mallick · Supaul, Bihar, India', 'मालिक: सतेन्द्र मल्लिक · सुपौल, बिहार, भारत')}
      </p>
      <p>{t('Serving home-cooked meals since 2020', '2020 से घर का पका खाना परोस रहे हैं')}</p>
    </footer>
  )
}
