import { useEffect, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { api } from '../../services/api'
import { EmptyState, ErrorBanner, PasswordReveal, StatCard } from '../../components/ui'

function CredentialCell({ resource }) {
  const [expanded, setExpanded] = useState(false)

  if (!expanded) {
    return (
      <button className="btn-secondary btn-sm" onClick={() => setExpanded(true)}>
        <KeyRound className="h-3 w-3" />
        View
      </button>
    )
  }
  return (
    <div className="space-y-1 rounded-lg border border-ink-100 bg-ink-50/60 px-3 py-2 text-xs animate-fade-in">
      <div>
        <span className="font-medium text-ink-500">Public Access: </span>
        <span className="mono">{resource.public_ip ? `root@${resource.public_ip}` : '—'}</span>
      </div>
      <div>
        <span className="font-medium text-ink-500">Private Access: </span>
        <span className="mono">{resource.private_ip ? `root@${resource.private_ip}` : '—'}</span>
      </div>
      <div>
        <span className="font-medium text-ink-500">Password: </span>
        {resource.password ? <PasswordReveal password={resource.password} /> : '—'}
      </div>
      <button className="text-ink-700 underline-offset-2 hover:underline" onClick={() => setExpanded(false)}>
        Collapse
      </button>
    </div>
  )
}

export default function ActiveResources() {
  const [resources, setResources] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.activeResources().then(setResources).catch((err) => setError(err.message))
  }, [])

  return (
    <div className="max-w-5xl">
      <h1 className="page-title mb-1">Active Approved Requests</h1>
      <p className="mb-5 text-[13px] text-ink-500">
        Overview of all running resources on the cloud.
      </p>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Active Instances" value={resources.length} hint="running on Alibaba Cloud" />
        <StatCard
          label="With Public IP"
          value={resources.filter((r) => r.public_ip).length}
          hint="publicly reachable"
        />
        <StatCard
          label="Unique Users"
          value={new Set(resources.map((r) => r.user_email)).size}
          hint="resource owners"
        />
      </div>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-ink-100">
          <thead className="bg-ink-50/50">
            <tr>
              <th className="th">User Name</th>
              <th className="th">User Email</th>
              <th className="th">ECS Template</th>
              <th className="th">Instance Name</th>
              <th className="th">Credential</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {resources.length === 0 && (
              <EmptyState text="No active resources on the cloud." colSpan={5} />
            )}
            {resources.map((r) => (
              <tr key={r.id} className="table-row align-top">
                <td className="td font-medium text-ink-900">{r.user_name}</td>
                <td className="td">{r.user_email}</td>
                <td className="td">{r.template_name}</td>
                <td className="td mono">{r.instance_name || '—'}</td>
                <td className="td">
                  <CredentialCell resource={r} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
