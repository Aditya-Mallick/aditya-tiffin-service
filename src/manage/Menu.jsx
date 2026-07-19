import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LanguageContext'
import { useAuth } from './AuthContext'
import { Modal, ConfirmDialog, Spinner, EmptyState } from './ui'
import { getTiffinTypes, saveTiffinType, deactivateTiffinType, formatINR } from './api'

const CATEGORIES = [
  { key: 'tiffin',  en: 'Tiffin',  hi: 'टिफिन' },
  { key: 'special', en: 'Special', hi: 'स्पेशल' },
  { key: 'roti',    en: 'Roti',    hi: 'रोटी' },
  { key: 'other',   en: 'Other',   hi: 'अन्य' },
]

export default function Menu() {
  const { t, lang } = useLang()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await getTiffinTypes()
    setItems(data || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  if (!isAdmin) {
    return <EmptyState text={t('Only the owner and admin can edit the menu.',
                              'मेन्यू केवल मालिक और एडमिन बदल सकते हैं।')} />
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/manage')} className="text-saffron-dark font-medium text-sm">
          ‹ {t('Back', 'वापस')}
        </button>
        <button onClick={() => setEditing({})}
                className="bg-saffron hover:bg-saffron-dark text-white text-sm font-semibold rounded-full px-4 py-2">
          + {t('Add item', 'आइटम जोड़ें')}
        </button>
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-800">{t('Menu & prices', 'मेन्यू और दरें')}</h2>
        <p className="text-sm text-gray-500">
          {t('Default prices. Each customer can have their own rate on their page.',
             'डिफ़ॉल्ट दरें। हर ग्राहक की अपनी दर उसके पेज पर रख सकते हैं।')}
        </p>
      </div>

      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState text={t('No items yet. Tap “Add item”.', 'कोई आइटम नहीं। “आइटम जोड़ें” दबाएं।')} />
      ) : (
        <div className="space-y-2">
          {items.map(it => (
            <button key={it.id} onClick={() => setEditing(it)}
                    className="w-full text-left bg-white rounded-xl shadow-card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {lang === 'hi' && it.name_hi ? it.name_hi : it.name_en}
                </p>
                <p className="text-xs text-gray-400">
                  {t(CATEGORIES.find(c => c.key === it.category)?.en || it.category,
                     CATEGORIES.find(c => c.key === it.category)?.hi || it.category)}
                </p>
              </div>
              <span className="font-bold text-gray-800">{formatINR(it.default_price)}</span>
            </button>
          ))}
        </div>
      )}

      {editing !== null && (
        <MenuForm
          item={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
          onRemove={(it) => { setEditing(null); setConfirmRemove(it) }}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmRemove)}
        title={t('Remove item?', 'आइटम हटाएं?')}
        message={t(`Remove "${confirmRemove?.name_en}" from the menu? Past records keep it.`,
                   `"${confirmRemove?.name_en}" को मेन्यू से हटाएं? पुराने रिकॉर्ड में रहेगा।`)}
        confirmLabel={t('Remove', 'हटाएं')}
        danger
        onCancel={() => setConfirmRemove(null)}
        onConfirm={async () => { await deactivateTiffinType(confirmRemove.id); setConfirmRemove(null); load() }}
      />
    </div>
  )
}

function MenuForm({ item, onClose, onSaved, onRemove }) {
  const { t } = useLang()
  const isNew = !item
  const [nameEn, setNameEn] = useState(item?.name_en || '')
  const [nameHi, setNameHi] = useState(item?.name_hi || '')
  const [price, setPrice] = useState(item?.default_price ?? '')
  const [category, setCategory] = useState(item?.category || 'tiffin')
  const [hasPortions, setHasPortions] = useState(item?.has_portions || false)
  const [fullPrice, setFullPrice] = useState(item?.full_price ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setError('')
    if (!nameEn.trim()) { setError(t('Enter a name.', 'नाम डालें।')); return }
    setBusy(true)
    const { error } = await saveTiffinType({
      id: item?.id, name_en: nameEn, name_hi: nameHi,
      default_price: price === '' ? 0 : price, category,
      has_portions: hasPortions,
      full_price: hasPortions ? (fullPrice === '' ? 0 : fullPrice) : null,
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    onSaved()
  }

  return (
    <Modal open onClose={onClose} title={isNew ? t('Add item', 'आइटम जोड़ें') : t('Edit item', 'आइटम बदलें')}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('Name (English)', 'नाम (अंग्रेज़ी)')}</label>
          <input value={nameEn} onChange={(e) => setNameEn(e.target.value)}
                 placeholder={t('e.g. Mutton Thali (4 pcs)', 'जैसे मटन थाली (4 पीस)')}
                 className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('Name (Hindi, optional)', 'नाम (हिंदी, वैकल्पिक)')}</label>
          <input value={nameHi} onChange={(e) => setNameHi(e.target.value)}
                 className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {hasPortions ? t('Half price (₹)', 'हाफ दर (₹)') : t('Price (₹)', 'दर (₹)')}
            </label>
            <input type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)}
                   className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('Category', 'श्रेणी')}</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 bg-white">
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{t(c.en, c.hi)}</option>)}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={hasPortions} onChange={(e) => setHasPortions(e.target.checked)} />
          {t('Has half / full plate', 'हाफ / फुल प्लेट है')}
        </label>
        {hasPortions && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('Full plate price (₹)', 'फुल प्लेट दर (₹)')}</label>
            <input type="number" inputMode="numeric" value={fullPrice} onChange={(e) => setFullPrice(e.target.value)}
                   className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-lg border border-gray-300 font-medium text-gray-700">
            {t('Cancel', 'रद्द करें')}
          </button>
          <button onClick={save} disabled={busy}
                  className="flex-1 py-3 rounded-lg font-semibold text-white bg-saffron hover:bg-saffron-dark disabled:opacity-60">
            {busy ? t('Saving…', 'सेव हो रहा है…') : t('Save', 'सेव करें')}
          </button>
        </div>
        {!isNew && (
          <button onClick={() => onRemove(item)} className="w-full text-red-600 text-sm font-medium">
            {t('Remove from menu', 'मेन्यू से हटाएं')}
          </button>
        )}
      </div>
    </Modal>
  )
}
