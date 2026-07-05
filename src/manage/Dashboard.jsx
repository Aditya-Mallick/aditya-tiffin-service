import { useLang } from '../context/LanguageContext'
import { useAuth } from './AuthContext'

function Card({ title, desc, soon }) {
  return (
    <div className="bg-white rounded-xl shadow-card p-4 flex items-start justify-between gap-3">
      <div>
        <p className="font-semibold text-gray-800">{title}</p>
        <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
      </div>
      {soon && (
        <span className="shrink-0 text-[11px] font-medium text-saffron-dark bg-cream rounded-full px-2 py-1">
          {soon}
        </span>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { t } = useLang()
  const { profile, canSeeMoney } = useAuth()
  const soon = t('Coming soon', 'जल्द आ रहा है')

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-800">
          {t('Welcome', 'नमस्ते')}{profile?.full_name ? `, ${profile.full_name}` : ''} 🎉
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          {t('You are signed in. The tools below are being built next.',
             'आप लॉगिन हैं। नीचे के टूल्स अगले चरण में बन रहे हैं।')}
        </p>
      </div>

      <Card
        title={t('Daily lists', 'रोज़ की सूची')}
        desc={t('Morning, afternoon & evening customer lists.',
                'सुबह, दोपहर और शाम की ग्राहक सूची।')}
        soon={soon}
      />
      <Card
        title={t('Customers', 'ग्राहक')}
        desc={t('Names, mobile numbers and addresses.',
                'नाम, मोबाइल नंबर और पते।')}
        soon={soon}
      />

      {canSeeMoney && (
        <>
          <Card
            title={t('Payments', 'भुगतान')}
            desc={t('Record money received from customers.',
                    'ग्राहकों से मिला पैसा दर्ज करें।')}
            soon={soon}
          />
          <Card
            title={t('Monthly bills', 'मासिक बिल')}
            desc={t('Generate and send month-end bills.',
                    'महीने के अंत के बिल बनाएं और भेजें।')}
            soon={soon}
          />
        </>
      )}

      {!canSeeMoney && (
        <p className="text-xs text-gray-400 pt-2">
          {t('Payment and billing tools are only visible to the owner and admin.',
             'भुगतान और बिलिंग टूल केवल मालिक और एडमिन को दिखते हैं।')}
        </p>
      )}
    </div>
  )
}
