import { useEffect } from 'react'
import { useLang } from '../context/LanguageContext'

// Generic centered modal.
export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
         onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-card-hover max-h-[90vh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="px-5 pt-4 pb-2 border-b border-gray-100 sticky top-0 bg-white">
            <h3 className="text-base font-bold text-gray-800">{title}</h3>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// Confirmation dialog for higher-stakes actions (e.g. archiving a customer).
export function ConfirmDialog({ open, title, message, confirmLabel, danger, onConfirm, onCancel }) {
  const { t } = useLang()
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-gray-600 mb-5">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-lg border border-gray-300 font-medium text-gray-700"
        >
          {t('No', 'नहीं')}
        </button>
        <button
          onClick={onConfirm}
          className={`flex-1 py-3 rounded-lg font-semibold text-white ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-saffron hover:bg-saffron-dark'}`}
        >
          {confirmLabel || t('Yes', 'हाँ')}
        </button>
      </div>
    </Modal>
  )
}

// Bottom "Removed — Undo" toast. Auto-dismisses after `duration` ms.
export function UndoToast({ message, onUndo, onDismiss, duration = 6000 }) {
  useEffect(() => {
    if (!message) return
    const id = setTimeout(onDismiss, duration)
    return () => clearTimeout(id)
  }, [message, onDismiss, duration])
  const { t } = useLang()
  if (!message) return null
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-full shadow-card-hover px-4 py-2.5 flex items-center gap-4">
      <span className="text-sm">{message}</span>
      <button onClick={onUndo} className="text-gold font-semibold text-sm">
        {t('Undo', 'वापस लाएं')}
      </button>
    </div>
  )
}

export function Spinner({ label }) {
  const { t } = useLang()
  return (
    <div className="py-10 text-center text-gray-400">
      {label || t('Loading…', 'लोड हो रहा है…')}
    </div>
  )
}

export function EmptyState({ text }) {
  return <div className="py-10 text-center text-gray-400">{text}</div>
}
