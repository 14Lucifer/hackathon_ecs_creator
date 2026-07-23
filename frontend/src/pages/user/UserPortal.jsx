import { useCallback, useEffect, useState } from 'react'
import { LogOut, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../../App'
import { api } from '../../services/api'
import {
  Badge,
  EmptyState,
  ErrorBanner,
  PasswordReveal,
  Spinner,
  useToast,
} from '../../components/ui'

function fmt(ts) {
  return ts ? new Date(ts).toLocaleString() : '—'
}

function TemplateSpecs({ t }) {
  return (
    <span className="text-xs text-ink-500">
      {t.instance_type} · {t.system_disk_category} {t.system_disk_size_gb}GB ·{' '}
      {t.public_ip_enabled ? 'Public IP' : 'No Public IP'}
    </span>
  )
}

function RequestCard({ req, onDeleteRequest, deleting }) {
  return (
    <div className="card p-5 transition-shadow hover:shadow-pop">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold tracking-tight text-ink-900">{req.template.name}</div>
          <TemplateSpecs t={req.template} />
          <div className="mt-1 text-xs text-ink-500/70">Submitted {fmt(req.submitted_at)}</div>
        </div>
        <Badge status={req.status} />
      </div>

      {req.status === 'rejected' && (
        <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <span className="font-medium">Reason: </span>
          {req.reject_reason}
        </div>
      )}

      {(req.status === 'approved' || req.status === 'delete_pending') && (
        <div className="mt-3 space-y-1.5 rounded-lg border border-ink-100 bg-ink-50/60 px-3 py-2.5 text-[13px]">
          <div>
            <span className="font-medium text-ink-500">Public Domain Name: </span>
            <span className="mono">{req.fqdn || '—'}</span>
          </div>
          <div>
            <span className="font-medium text-ink-500">Domain Access: </span>
            <span className="mono font-semibold">{req.fqdn ? `root@${req.fqdn}` : '—'}</span>
          </div>
          <div>
            <span className="font-medium text-ink-500">Public Access: </span>
            <span className="mono">{req.public_ip ? `root@${req.public_ip}` : '—'}</span>
          </div>
          <div>
            <span className="font-medium text-ink-500">Private Access: </span>
            <span className="mono">{req.private_ip ? `root@${req.private_ip}` : '—'}</span>
          </div>
          <div>
            <span className="font-medium text-ink-500">Password: </span>
            {req.password ? <PasswordReveal password={req.password} /> : '—'}
          </div>
        </div>
      )}

      {req.status === 'approved' && (
        <div className="mt-3">
          <button className="btn-danger btn-sm" onClick={() => onDeleteRequest(req.id)} disabled={deleting}>
            <Trash2 className="h-3 w-3" />
            Request Deletion
          </button>
        </div>
      )}
      {req.status === 'delete_pending' && (
        <div className="mt-3 text-[13px] text-orange-600">Deletion pending admin approval.</div>
      )}
    </div>
  )
}

export default function UserPortal() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const [templates, setTemplates] = useState([])
  const [requests, setRequests] = useState([])
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [tpls, reqs] = await Promise.all([api.listTemplates(), api.myRequests()])
      setTemplates(tpls)
      setRequests(reqs)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const submit = async () => {
    if (!selected) return
    setError('')
    setSubmitting(true)
    try {
      await api.createRequest(Number(selected))
      toast('Request submitted')
      setSelected('')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const requestDeletion = async (id) => {
    setError('')
    setDeleting(true)
    try {
      await api.requestDeletion(id)
      toast('Deletion requested')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const active = requests.filter((r) => r.is_active)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 animate-slide-up">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="page-title">My ECS Resources</h1>
          <p className="text-[13px] text-ink-500">
            Signed in as {user.name} ({user.email})
          </p>
        </div>
        <button className="btn-secondary" onClick={logout}>
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </button>
      </header>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {/* New request */}
      <section className="card mb-8 p-5">
        <h2 className="section-title mb-3">New Resource Request</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            className="input sm:max-w-md"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Select an ECS template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.instance_type}, {t.system_disk_category} {t.system_disk_size_gb}GB,{' '}
                {t.public_ip_enabled ? 'Public IP' : 'No Public IP'}
              </option>
            ))}
          </select>
          <button className="btn-primary" onClick={submit} disabled={!selected || submitting}>
            {submitting ? (
              <Spinner text="Submitting..." />
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Submit Request
              </>
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-500/70">
          You may have at most 2 active requests (pending, approved or pending deletion).
        </p>
      </section>

      {/* Active requests */}
      <section className="mb-8">
        <h2 className="section-title mb-3">My Active Requests</h2>
        {loading ? (
          <Spinner text="Loading..." />
        ) : active.length === 0 ? (
          <p className="text-[13px] text-ink-500">No active requests.</p>
        ) : (
          <div className="space-y-4">
            {active.map((r) => (
              <RequestCard key={r.id} req={r} onDeleteRequest={requestDeletion} deleting={deleting} />
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h2 className="section-title mb-3">Request History</h2>
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-ink-100">
            <thead className="bg-ink-50/50">
              <tr>
                <th className="th">Template Name</th>
                <th className="th">Submitted At</th>
                <th className="th">Status</th>
                <th className="th">Active</th>
                <th className="th">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {requests.length === 0 && <EmptyState text="No requests yet." colSpan={5} />}
              {requests.map((r) => (
                <tr key={r.id} className="table-row">
                  <td className="td font-medium text-ink-900">{r.template.name}</td>
                  <td className="td tabular-nums">{fmt(r.submitted_at)}</td>
                  <td className="td">
                    <Badge status={r.status} />
                  </td>
                  <td className="td">
                    <Badge status={r.is_active ? 'active' : 'inactive'} />
                  </td>
                  <td className="td max-w-64">
                    {r.reject_reason ? (
                      <span className="text-ink-700" title={r.reject_reason}>
                        {r.reject_reason}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
