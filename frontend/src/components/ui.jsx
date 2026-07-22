// Shared small UI components: badges, spinner, modal, error banner, toasts, password reveal.
import { createContext, useCallback, useContext, useState } from 'react'

// --- Status badge -------------------------------------------------------------
const BADGE_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  delete_pending: 'bg-orange-100 text-orange-800',
  deleted: 'bg-gray-200 text-gray-600',
  active: 'bg-blue-100 text-blue-800',
  inactive: 'bg-gray-100 text-gray-500',
}
const BADGE_LABELS = {
  pending: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  delete_pending: 'Deletion Pending',
  deleted: 'Deleted',
  active: 'Active',
  inactive: 'Inactive',
}

export function Badge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        BADGE_STYLES[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {BADGE_LABELS[status] || status}
    </span>
  )
}

// --- Spinner -------------------------------------------------------------------
export function Spinner({ text }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-gray-600">
      <svg className="h-4 w-4 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      {text}
    </span>
  )
}

// --- Modal -----------------------------------------------------------------------
export function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`card w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

// --- Error banner ------------------------------------------------------------------
export function ErrorBanner({ message, onDismiss }) {
  if (!message) return null
  return (
    <div className="mb-4 flex items-start justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <span className="flex items-start gap-2">
        <span aria-hidden>⚠️</span>
        <span className="break-all">{message}</span>
      </span>
      {onDismiss && (
        <button onClick={onDismiss} className="ml-3 font-bold text-red-500 hover:text-red-700">
          ✕
        </button>
      )}
    </div>
  )
}

// --- Password with eye-icon toggle ---------------------------------------------------
export function PasswordReveal({ password }) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="inline-flex items-center gap-2 font-mono">
      <span>{visible ? password : '••••••••••••••••'}</span>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="text-gray-400 hover:text-gray-600"
        title={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? '🙈' : '👁'}
      </button>
    </span>
  )
}

// --- Toast notifications ---------------------------------------------------------------
const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-md px-4 py-2 text-sm text-white shadow-lg ${
              t.type === 'error' ? 'bg-red-600' : 'bg-gray-900'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
