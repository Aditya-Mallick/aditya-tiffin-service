import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLang } from '../context/LanguageContext'
import { useAuth } from './AuthContext'
import { ConfirmDialog, Spinner, EmptyState } from './ui'
import { CustomerStatement } from './Statement'
import { CustomerForm } from './Customers'
import { getCustomer, getTiffinTypes, archiveCustomer } from './api'

// A real route (/manage/customers/:id) so the phone's Back button and the
// bottom "Customers" tab both return to the list, as expected.
export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useLang()
  const { isAdmin, canSeeMoney } = useAuth()

  const [customer, setCustomer] = useState(null)
  const [tiffinTypes, setTiffinTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [stmtKey, setStmtKey] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: c }, { data: tt }] = await Promise.all([getCustomer(id), getTiffinTypes()])
    setCustomer(c || null)
    setTiffinTypes(tt || [])
    setLoading(false)
  }, [id])
  useEffect(() => { load() }, [load])

  const backToList = () => navigate('/manage/customers')

  if (loading) return <Spinner />
  if (!customer) {
    return (
      <div className="space-y-3">
        <button onClick={backToList} className="text-saffron-dark font-medium text-sm">
          ‹ {t('Back', 'वापस')}
        </button>
        <EmptyState text={t('Customer not found.', 'ग्राहक नहीं मिला।')} />
      </div>
    )
  }

  return (
    <>
      <CustomerStatement
        key={stmtKey}
        customer={customer}
        isAdmin={isAdmin}
        onBack={backToList}
        onEdit={() => setEditing(true)}
      />

      {editing && (
        <CustomerForm
          customer={customer}
          tiffinTypes={tiffinTypes}
          canSeeMoney={canSeeMoney}
          isAdmin={isAdmin}
          onClose={() => setEditing(false)}
          onArchive={() => { setEditing(false); setConfirmArchive(true) }}
          onSaved={(saved) => {
            setEditing(false)
            if (saved) setCustomer(c => ({ ...c, ...saved }))
            setStmtKey(k => k + 1)   // refresh the statement figures
          }}
        />
      )}

      <ConfirmDialog
        open={confirmArchive}
        title={t('Archive customer?', 'ग्राहक आर्काइव करें?')}
        message={t(`Archive "${customer.name}"? They will be hidden but can be restored anytime.`,
                   `"${customer.name}" को आर्काइव करें? यह छिप जाएगा लेकिन कभी भी वापस लाया जा सकता है।`)}
        confirmLabel={t('Archive', 'आर्काइव')} danger
        onCancel={() => setConfirmArchive(false)}
        onConfirm={async () => { await archiveCustomer(customer.id); setConfirmArchive(false); backToList() }}
      />
    </>
  )
}
