import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LanguageContext'
import { useAuth } from './AuthContext'
import { Modal, ConfirmDialog, Spinner, EmptyState } from './ui'
import { listProfiles, adminUsers } from './api'

const ROLE = {
  owner: { en: 'Owner', hi: 'मालिक', cls: 'bg-saffron/15 text-saffron-dark' },
  admin: { en: 'Admin', hi: 'एडमिन', cls: 'bg-blue-100 text-blue-700' },
  staff: { en: 'Staff', hi: 'स्टाफ', cls: 'bg-gray-100 text-gray-600' },
}

export default function Users() {
  const { t } = useLang()
  const { isAdmin, isOwner, user } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [resetFor, setResetFor] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await listProfiles()
    setRows(data || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  if (!isAdmin) {
    return <EmptyState text={t('Only the owner and admin can manage logins.',
                              'लॉगिन केवल मालिक और एडमिन बना सकते हैं।')} />
  }

  // An admin (non-owner) can only manage staff, and never themselves.
  const canManage = (row) => row.id !== user?.id && (isOwner || row.role === 'staff')

  async function toggleActive(row) {
    setBusyId(row.id); setError('')
    const { error } = await adminUsers({ action: 'set_active', user_id: row.id, active: !row.active })
    setBusyId(null)
    if (error) { setError(error.message); return }
    load()
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/manage/settings')} className="text-saffron-dark font-medium text-sm">
          ‹ {t('Back', 'वापस')}
        </button>
        <button onClick={() => setAdding(true)}
                className="bg-saffron hover:bg-saffron-dark text-white text-sm font-semibold rounded-full px-4 py-2">
          + {t('Add user', 'यूज़र जोड़ें')}
        </button>
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-800">{t('Users & logins', 'यूज़र और लॉगिन')}</h2>
        <p className="text-sm text-gray-500">
          {t('People who can sign in with their mobile + PIN.', 'जो मोबाइल + पिन से लॉगिन कर सकते हैं।')}
        </p>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {loading ? <Spinner /> : rows.length === 0 ? (
        <EmptyState text={t('No users yet.', 'अभी कोई यूज़र नहीं।')} />
      ) : (
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.id} className="bg-white rounded-xl shadow-card p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {r.full_name}
                    {r.id === user?.id && <span className="text-gray-400 font-normal"> ({t('you', 'आप')})</span>}
                  </p>
                  <p className="text-xs text-gray-400">{r.mobile}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!r.active && <span className="text-[11px] text-red-500">{t('disabled', 'बंद')}</span>}
                  <span className={`text-[11px] rounded-full px-2 py-0.5 ${ROLE[r.role]?.cls}`}>
                    {t(ROLE[r.role]?.en, ROLE[r.role]?.hi)}
                  </span>
                </div>
              </div>

              {canManage(r) && (
                <div className="flex gap-3 mt-2 pt-2 border-t border-gray-100 text-sm">
                  <button onClick={() => setResetFor(r)} className="text-saffron-dark font-medium">
                    {t('Reset PIN', 'पिन रीसेट')}
                  </button>
                  <button onClick={() => toggleActive(r)} disabled={busyId === r.id} className="text-gray-600 font-medium">
                    {r.active ? t('Disable', 'बंद करें') : t('Enable', 'चालू करें')}
                  </button>
                  <button onClick={() => setConfirmRemove(r)} className="text-red-600 font-medium ml-auto">
                    {t('Remove', 'हटाएं')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {adding && (
        <AddUserModal isOwner={isOwner} onClose={() => setAdding(false)}
                      onSaved={() => { setAdding(false); load() }} />
      )}
      {resetFor && (
        <ResetPinModal user={resetFor} onClose={() => setResetFor(null)}
                       onSaved={() => setResetFor(null)} />
      )}
      <ConfirmDialog
        open={Boolean(confirmRemove)}
        title={t('Remove user?', 'यूज़र हटाएं?')}
        message={t(`Remove "${confirmRemove?.full_name}"? They will no longer be able to sign in.`,
                   `"${confirmRemove?.full_name}" को हटाएं? वे अब लॉगिन नहीं कर पाएंगे।`)}
        confirmLabel={t('Remove', 'हटाएं')} danger
        onCancel={() => setConfirmRemove(null)}
        onConfirm={async () => {
          const r = confirmRemove; setConfirmRemove(null); setError('')
          const { error } = await adminUsers({ action: 'delete', user_id: r.id })
          if (error) setError(error.message)
          load()
        }}
      />
    </div>
  )
}

function AddUserModal({ isOwner, onClose, onSaved }) {
  const { t } = useLang()
  const [fullName, setFullName] = useState('')
  const [mobile, setMobile] = useState('')
  const [pin, setPin] = useState('')
  const [role, setRole] = useState('staff')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setError('')
    if (!fullName.trim()) { setError(t('Enter a name.', 'नाम डालें।')); return }
    if (mobile.replace(/\D/g, '').length < 10) { setError(t('Enter a valid mobile.', 'सही मोबाइल डालें।')); return }
    if (pin.length < 4) { setError(t('PIN must be at least 4 digits.', 'पिन कम से कम 4 अंक।')); return }
    setBusy(true)
    const { error } = await adminUsers({ action: 'create', full_name: fullName.trim(), mobile, pin, role })
    setBusy(false)
    if (error) { setError(error.message); return }
    onSaved()
  }

  return (
    <Modal open onClose={onClose} title={t('Add user', 'यूज़र जोड़ें')}>
      <div className="space-y-4">
        <UField label={t('Name', 'नाम')} value={fullName} onChange={setFullName} />
        <UField label={t('Mobile number', 'मोबाइल नंबर')} value={mobile} onChange={setMobile} type="tel"
                placeholder={t('10-digit mobile', '10 अंक मोबाइल')} />
        <UField label={t('PIN (4+ digits)', 'पिन (4+ अंक)')} value={pin} onChange={setPin} type="tel"
                placeholder="••••" />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('Role', 'भूमिका')}</label>
          <div className="grid grid-cols-2 gap-2">
            <RoleBtn active={role === 'staff'} onClick={() => setRole('staff')}
                     label={t('Staff (delivery)', 'स्टाफ (डिलीवरी)')} />
            <RoleBtn active={role === 'admin'} onClick={() => setRole('admin')} disabled={!isOwner}
                     label={t('Admin', 'एडमिन')} />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {t('Staff can manage daily lists only — never payments or bills.',
               'स्टाफ केवल रोज़ की सूची संभाल सकते हैं — भुगतान/बिल नहीं।')}
          </p>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-lg border border-gray-300 font-medium text-gray-700">
            {t('Cancel', 'रद्द करें')}
          </button>
          <button onClick={save} disabled={busy}
                  className="flex-1 py-3 rounded-lg font-semibold text-white bg-saffron hover:bg-saffron-dark disabled:opacity-60">
            {busy ? t('Adding…', 'जोड़ रहे…') : t('Add user', 'यूज़र जोड़ें')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ResetPinModal({ user, onClose, onSaved }) {
  const { t } = useLang()
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setError('')
    if (pin.length < 4) { setError(t('PIN must be at least 4 digits.', 'पिन कम से कम 4 अंक।')); return }
    setBusy(true)
    const { error } = await adminUsers({ action: 'set_pin', user_id: user.id, pin })
    setBusy(false)
    if (error) { setError(error.message); return }
    onSaved()
  }

  return (
    <Modal open onClose={onClose} title={`${t('Reset PIN', 'पिन रीसेट')} · ${user.full_name}`}>
      <div className="space-y-4">
        <UField label={t('New PIN (4+ digits)', 'नया पिन (4+ अंक)')} value={pin} onChange={setPin} type="tel"
                placeholder="••••" />
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
      </div>
    </Modal>
  )
}

function RoleBtn({ active, onClick, label, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
            className={`py-2.5 rounded-lg text-sm font-medium ${active ? 'bg-saffron text-white' : 'bg-cream text-gray-600'} ${disabled ? 'opacity-40' : ''}`}>
      {label}
    </button>
  )
}

function UField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} inputMode={type === 'tel' ? 'numeric' : undefined}
             value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
             className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
    </div>
  )
}
