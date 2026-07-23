import { useCallback, useEffect, useState } from 'react'
import { KeyRound, Trash2 } from 'lucide-react'
import { api } from '../../services/api'
import {
  EmptyState,
  ErrorBanner,
  Modal,
  PasswordReveal,
  Spinner,
  StatCard,
  useToast,
} from '../../components/ui'

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
        <span className="font-medium text-ink-500">Public Domain Name: </span>
        <span className="mono">{resource.fqdn || '—'}</span>
      </div>
      <div>
        <span className="font-medium text-ink-500">Domain Access: </span>
        <span className="mono font-semibold">{resource.fqdn ? `root@${resource.fqdn}` : '—'}</span>
      </div>
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

// --- Remove resource modal (optional remark shown to the user) -----------------
function RemoveModal({ resource, onClose, onDone }) {
  const [remark, setRemark] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const confirm = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await api.removeResource(resource.id, remark.trim() || null)
      const item = res.results[0]
      if (!item.success) {
        setError(item.error)
        return
      }
      toast('Resource removed — instance terminated')
      if (item.error) setError(item.error) // soft warning (e.g. DNS cleanup)
      onDone(item.error || '')
      if (!item.error) onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Remove Resource: ${resource.instance_name || `#${resource.id}`}`} onClose={onClose}>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      <p className="mb-3 text-[13px] text-ink-700">
        This terminates the instance of <span className="font-medium">{resource.user_name}</span>{' '}
        ({resource.user_email}) and deletes its DNS record. The user will see the status{' '}
        <span className="font-medium">Removed by Admin</span>.
      </p>
      <label className="label">Remark (optional, visible to the user)</label>
      <textarea
        className="input min-h-20"
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
        placeholder="e.g. Removed during cost cleanup — contact IT if still needed"
      />
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="btn-danger" onClick={confirm} disabled={loading}>
          {loading ? <Spinner text="Calling Alibaba Cloud API..." /> : 'Remove Resource'}
        </button>
      </div>
    </Modal>
  )
}

export default function ActiveResources() {
  const [resources, setResources] = useState([])
  const [removing, setRemoving] = useState(null) // resource being removed
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api.activeResources().then(setResources).catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    load()
  }, [load])

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
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {resources.length === 0 && (
              <EmptyState text="No active resources on the cloud." colSpan={6} />
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
                <td className="td">
                  <button className="btn-danger btn-sm" onClick={() => setRemoving(r)}>
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {removing && (
        <RemoveModal
          resource={removing}
          onClose={() => setRemoving(null)}
          onDone={(warning) => {
            if (warning) setError(warning)
            load()
          }}
        />
      )}
    </div>
  )
}
