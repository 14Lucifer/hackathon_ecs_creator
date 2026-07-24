import { useCallback, useEffect, useMemo, useState } from 'react'
import { FilterX, KeyRound, Trash2 } from 'lucide-react'
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

// --- Remove resource modal (single or batch; one shared optional remark) -------
function RemoveModal({ resources, onClose, onDone }) {
  const [remark, setRemark] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const confirm = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await api.batchRemoveResources(
        resources.map((r) => r.id),
        remark.trim() || null,
      )
      const messages = res.results
        .filter((r) => r.error)
        .map((r) => `#${r.request_id}: ${r.error}`)
      toast(
        res.failed > 0
          ? `${res.succeeded} removed, ${res.failed} failed`
          : `${res.succeeded} resource(s) removed — instance(s) terminated`,
        res.failed > 0 ? 'error' : 'success',
      )
      onDone(messages.join('; '))
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const single = resources.length === 1
  return (
    <Modal
      title={
        single
          ? `Remove Resource: ${resources[0].instance_name || `#${resources[0].id}`}`
          : `Remove ${resources.length} Resources`
      }
      onClose={onClose}
    >
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      <p className="mb-3 text-[13px] text-ink-700">
        {single ? (
          <>
            This terminates the instance of{' '}
            <span className="font-medium">{resources[0].user_name}</span> (
            {resources[0].user_email}) and deletes its DNS record.
          </>
        ) : (
          <>
            This terminates <span className="font-medium">{resources.length} instances</span>{' '}
            and deletes their DNS records. Resources are processed one by one — partial
            success is possible.
          </>
        )}{' '}
        The affected user(s) will see the status{' '}
        <span className="font-medium">Removed by Admin</span>.
      </p>
      {!single && (
        <ul className="mb-3 max-h-32 space-y-0.5 overflow-y-auto rounded-lg border border-ink-100 bg-ink-50/60 px-3 py-2 text-xs text-ink-700">
          {resources.map((r) => (
            <li key={r.id}>
              <span className="mono">{r.instance_name || `#${r.id}`}</span> — {r.user_name}
            </li>
          ))}
        </ul>
      )}
      <label className="label">
        Remark (optional, visible to the user{single ? '' : 's — shared across all selected'})
      </label>
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
          {loading ? (
            <Spinner text="Calling Alibaba Cloud API..." />
          ) : single ? (
            'Remove Resource'
          ) : (
            `Remove ${resources.length} Resources`
          )}
        </button>
      </div>
    </Modal>
  )
}

const EMPTY_FILTERS = { user_name: '', user_email: '', template_name: '', instance_name: '' }

export default function ActiveResources() {
  const [resources, setResources] = useState([])
  const [selected, setSelected] = useState([])
  const [removing, setRemoving] = useState(null) // array of resources being removed
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api
      .activeResources()
      .then((data) => {
        setResources(data)
        setSelected([])
      })
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }))
  const hasFilters = Object.values(filters).some(Boolean)

  const filtered = useMemo(() => {
    const match = (value, query) =>
      !query || (value || '').toLowerCase().includes(query.toLowerCase())
    return resources.filter(
      (r) =>
        match(r.user_name, filters.user_name) &&
        match(r.user_email, filters.user_email) &&
        (!filters.template_name || r.template_name === filters.template_name) &&
        match(r.instance_name, filters.instance_name),
    )
  }, [resources, filters])

  const templates = useMemo(
    () => [...new Set(resources.map((r) => r.template_name))].sort(),
    [resources],
  )

  // Keep the selection limited to currently visible rows
  useEffect(() => {
    const visible = new Set(filtered.map((r) => r.id))
    setSelected((s) => s.filter((id) => visible.has(id)))
  }, [filtered])

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const toggleAll = () =>
    setSelected((s) => (s.length === filtered.length ? [] : filtered.map((r) => r.id)))

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

      {/* Batch toolbar */}
      <div className="mb-3 flex items-center gap-2">
        <button
          className="btn-danger"
          disabled={selected.length === 0}
          onClick={() => setRemoving(resources.filter((r) => selected.includes(r.id)))}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Batch Remove ({selected.length})
        </button>
        <span className="text-xs text-ink-500/70">
          One shared remark is applied to all selected resources.
        </span>
      </div>

      {/* Column filters */}
      <div className="card mb-3 flex flex-wrap items-end gap-3 px-4 py-3">
        <div className="min-w-36 flex-1">
          <label className="label !mb-1 !text-xs">User Name</label>
          <input
            className="input !py-1.5"
            placeholder="Filter…"
            value={filters.user_name}
            onChange={(e) => setFilter('user_name', e.target.value)}
          />
        </div>
        <div className="min-w-36 flex-1">
          <label className="label !mb-1 !text-xs">User Email</label>
          <input
            className="input !py-1.5"
            placeholder="Filter…"
            value={filters.user_email}
            onChange={(e) => setFilter('user_email', e.target.value)}
          />
        </div>
        <div className="min-w-36 flex-1">
          <label className="label !mb-1 !text-xs">ECS Template</label>
          <select
            className="input !py-1.5"
            value={filters.template_name}
            onChange={(e) => setFilter('template_name', e.target.value)}
          >
            <option value="">All templates</option>
            {templates.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-36 flex-1">
          <label className="label !mb-1 !text-xs">Instance Name</label>
          <input
            className="input !py-1.5"
            placeholder="Filter…"
            value={filters.instance_name}
            onChange={(e) => setFilter('instance_name', e.target.value)}
          />
        </div>
        <button
          className="btn-secondary"
          disabled={!hasFilters}
          onClick={() => setFilters(EMPTY_FILTERS)}
        >
          <FilterX className="h-3.5 w-3.5" />
          Clear
        </button>
        {hasFilters && (
          <span className="pb-2 text-xs text-ink-500/70">
            {filtered.length} of {resources.length} shown
          </span>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-ink-100">
          <thead className="bg-ink-50/50">
            <tr>
              <th className="th w-10">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.length === filtered.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="th">User Name</th>
              <th className="th">User Email</th>
              <th className="th">ECS Template</th>
              <th className="th">Instance Name</th>
              <th className="th">Credential</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {filtered.length === 0 && (
              <EmptyState
                text={
                  hasFilters
                    ? 'No resources match the current filters.'
                    : 'No active resources on the cloud.'
                }
                colSpan={7}
              />
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="table-row align-top">
                <td className="td">
                  <input
                    type="checkbox"
                    checked={selected.includes(r.id)}
                    onChange={() => toggle(r.id)}
                  />
                </td>
                <td className="td font-medium text-ink-900">{r.user_name}</td>
                <td className="td">{r.user_email}</td>
                <td className="td">{r.template_name}</td>
                <td className="td mono">{r.instance_name || '—'}</td>
                <td className="td">
                  <CredentialCell resource={r} />
                </td>
                <td className="td">
                  <button className="btn-danger btn-sm" onClick={() => setRemoving([r])}>
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
          resources={removing}
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
