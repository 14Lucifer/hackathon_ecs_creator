import { useEffect, useState } from 'react'
import { ArrowDownUp } from 'lucide-react'
import { api } from '../../services/api'
import { Badge, EmptyState, ErrorBanner } from '../../components/ui'

function fmt(ts) {
  return ts ? new Date(ts).toLocaleString() : '—'
}

// Map audit actions onto status badge styles
const ACTION_BADGE = { approve: 'approved', reject: 'rejected', remove: 'removed_by_admin' }

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [action, setAction] = useState('')
  const [order, setOrder] = useState('desc')
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .auditLogs(action || undefined, order)
      .then(setLogs)
      .catch((err) => setError(err.message))
  }, [action, order])

  return (
    <div className="max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="page-title">Audit Log</h1>
        <div className="flex gap-2">
          <select className="input w-auto" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All actions</option>
            <option value="approve">Approve</option>
            <option value="reject">Reject</option>
            <option value="remove">Remove</option>
          </select>
          <button
            className="btn-secondary"
            onClick={() => setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
          >
            <ArrowDownUp className="h-3.5 w-3.5" />
            Timestamp {order === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>
      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-ink-100">
          <thead className="bg-ink-50/50">
            <tr>
              <th className="th">Timestamp</th>
              <th className="th">Action</th>
              <th className="th">User Name</th>
              <th className="th">User Email</th>
              <th className="th">Template</th>
              <th className="th">Admin</th>
              <th className="th">Remark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {logs.length === 0 && <EmptyState text="No audit entries." colSpan={7} />}
            {logs.map((l) => (
              <tr key={l.id} className="table-row">
                <td className="td whitespace-nowrap tabular-nums">{fmt(l.created_at)}</td>
                <td className="td">
                  <Badge status={ACTION_BADGE[l.action] || l.action} />
                </td>
                <td className="td font-medium text-ink-900">{l.user_name}</td>
                <td className="td">{l.user_email}</td>
                <td className="td">{l.template_name}</td>
                <td className="td">{l.admin_name}</td>
                <td className="td max-w-56 truncate" title={l.reject_reason || ''}>
                  {l.reject_reason || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
