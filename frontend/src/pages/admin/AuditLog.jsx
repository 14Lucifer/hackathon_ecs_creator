import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { Badge, ErrorBanner } from '../../components/ui'

function fmt(ts) {
  return ts ? new Date(ts).toLocaleString() : '—'
}

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
        <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
        <div className="flex gap-2">
          <select className="input w-auto" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All actions</option>
            <option value="approve">Approve</option>
            <option value="reject">Reject</option>
          </select>
          <button
            className="btn-secondary"
            onClick={() => setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
          >
            Timestamp {order === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>
      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Timestamp</th>
              <th className="th">Action</th>
              <th className="th">User Name</th>
              <th className="th">User Email</th>
              <th className="th">Template</th>
              <th className="th">Admin</th>
              <th className="th">Reject Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 && (
              <tr>
                <td className="td text-gray-400" colSpan={7}>
                  No audit entries.
                </td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="td whitespace-nowrap">{fmt(l.created_at)}</td>
                <td className="td">
                  <Badge status={l.action === 'approve' ? 'approved' : 'rejected'} />
                </td>
                <td className="td font-medium text-gray-900">{l.user_name}</td>
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
