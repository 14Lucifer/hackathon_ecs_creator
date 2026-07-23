// Shared UI components — Clean SaaS Minimal style (Linear/Vercel inspired).
import { createContext, useCallback, useContext, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Inbox,
  Loader2,
  X,
  XCircle,
} from 'lucide-react'

// --- Status badge (dot + label, subtle tinted pill) ---------------------------
const BADGE_STYLES = {
  pending: { chip: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-500' },
  approved: { chip: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
  rejected: { chip: 'bg-red-50 text-red-700 ring-red-600/20', dot: 'bg-red-500' },
  delete_pending: { chip: 'bg-orange-50 text-orange-700 ring-orange-600/20', dot: 'bg-orange-500' },
  deleted: { chip: 'bg-ink-100 text-ink-500 ring-ink-500/20', dot: 'bg-ink-500/50' },
  removed_by_admin: { chip: 'bg-rose-50 text-rose-700 ring-rose-600/20', dot: 'bg-rose-500' },
  active: { chip: 'bg-blue-50 text-blue-700 ring-blue-600/20', dot: 'bg-blue-500' },
  inactive: { chip: 'bg-ink-50 text-ink-500 ring-ink-500/15', dot: 'bg-ink-200' },
}
const BADGE_LABELS = {
  pending: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  delete_pending: 'Deletion Pending',
  deleted: 'Deleted',
  removed_by_admin: 'Removed by Admin',
  active: 'Active',
  inactive: 'Inactive',
}

export function Badge({ status }) {
  const s = BADGE_STYLES[status] || BADGE_STYLES.inactive
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {BADGE_LABELS[status] || status}
    </span>
  )
}

// --- Spinner -------------------------------------------------------------------
export function Spinner({ text }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-ink-500">
      <Loader2 className="h-4 w-4 animate-spin text-ink-700" />
      {text}
    </span>
  )
}

// --- Modal (fade backdrop + scale-in panel) --------------------------------------
export function Modal({ title, children, onClose, wide = false }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-[2px] animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`card w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto shadow-pop animate-scale-in`}
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
          <h3 className="text-[15px] font-semibold tracking-tight text-ink-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
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
    <div className="mb-4 flex items-start justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800 animate-slide-up">
      <span className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
        <span className="break-all">{message}</span>
      </span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-3 rounded p-0.5 text-red-400 transition-colors hover:text-red-700"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// --- Password with eye-icon toggle ---------------------------------------------------
export function PasswordReveal({ password }) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="inline-flex items-center gap-2">
      <span className="mono">{visible ? password : '••••••••••••••••'}</span>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="rounded p-0.5 text-ink-500 transition-colors hover:text-ink-900"
        title={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </span>
  )
}

// --- Empty state for tables -------------------------------------------------------
export function EmptyState({ text, colSpan }) {
  return (
    <tr>
      <td className="td" colSpan={colSpan}>
        <div className="flex flex-col items-center gap-1.5 py-8 text-center">
          <Inbox className="h-6 w-6 text-ink-200" />
          <span className="text-[13px] text-ink-500">{text}</span>
        </div>
      </td>
    </tr>
  )
}

// --- Stat summary card ---------------------------------------------------------------
export function StatCard({ label, value, hint }) {
  return (
    <div className="stat-card">
      <span className="text-xs font-medium text-ink-500">{label}</span>
      <span className="text-2xl font-semibold tracking-tight tabular-nums text-ink-900">
        {value}
      </span>
      {hint && <span className="text-[11px] text-ink-500/70">{hint}</span>}
    </div>
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
            className="flex items-center gap-2 rounded-lg border border-ink-100 bg-white px-4 py-2.5 text-[13px] font-medium text-ink-900 shadow-pop animate-slide-up"
          >
            {t.type === 'error' ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
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
