import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { ErrorBanner, PasswordReveal } from '../../components/ui'

function CredentialCell({ resource }) {
  const [expanded, setExpanded] = useState(false)

  if (!expanded) {
    return (
      <button className="btn-secondary !px-2 !py-1" onClick={() => setExpanded(true)}>
        View
      </button>
    )
  }
  return (
    <div className="space-y-1 rounded-md bg-gray-50 px-3 py-2 text-xs">
      <div>
        <span className="font-medium text-gray-500">Public Access: </span>
        <span className="font-mono">{resource.public_ip ? `root@${resource.public_ip}` : '—'}</span>
      </div>
      <div>
        <span className="font-medium text-gray-500">Private Access: </span>
        <span className="font-mono">{resource.private_ip ? `root@${resource.private_ip}` : '—'}</span>
      </div>
      <div>
        <span className="font-medium text-gray-500">Password: </span>
        {resource.password ? <PasswordReveal password={resource.password} /> : '—'}
      </div>
      <button className="text-blue-600 hover:underline" onClick={() => setExpanded(false)}>
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
      <h1 className="mb-4 text-xl font-bold text-gray-900">
        Active Approved Requests ({resources.length})
      </h1>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">User Name</th>
              <th className="th">User Email</th>
              <th className="th">ECS Template</th>
              <th className="th">Instance Name</th>
              <th className="th">Credential</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {resources.length === 0 && (
              <tr>
                <td className="td text-gray-400" colSpan={5}>
                  No active resources on the cloud.
                </td>
              </tr>
            )}
            {resources.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="td font-medium text-gray-900">{r.user_name}</td>
                <td className="td">{r.user_email}</td>
                <td className="td">{r.template_name}</td>
                <td className="td font-mono text-xs">{r.instance_name || '—'}</td>
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
