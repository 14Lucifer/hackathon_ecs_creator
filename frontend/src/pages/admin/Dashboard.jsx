import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { api } from '../../services/api'
import { EmptyState, ErrorBanner, Spinner, StatCard } from '../../components/ui'

function fmtTime(ts) {
  return ts ? new Date(ts).toLocaleTimeString() : '—'
}

// Lightweight CSS bar chart: daily instance creations, zero-filled
function CreationsChart({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  const total = data.reduce((sum, d) => sum + d.count, 0)
  return (
    <div>
      <div className="flex h-36 items-end gap-1.5">
        {data.map((d) => (
          <div key={d.date} className="group flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] tabular-nums text-ink-500/70 opacity-0 transition-opacity group-hover:opacity-100">
              {d.count}
            </span>
            <div
              className={`w-full rounded-t transition-colors ${
                d.count > 0 ? 'bg-ink-900 group-hover:bg-ink-700' : 'bg-ink-100'
              }`}
              style={{ height: d.count > 0 ? `${(d.count / max) * 100}%` : '3px' }}
              title={`${d.date}: ${d.count} instance(s) created`}
            />
            <span className="text-[10px] tabular-nums text-ink-500/70">
              {Number(d.date.slice(8, 10))}
            </span>
          </div>
        ))}
      </div>
      {total === 0 && (
        <p className="mt-2 text-center text-xs text-ink-500/70">
          No instances created in the last 14 days.
        </p>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setMetrics(await api.dashboardMetrics())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="max-w-5xl">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="page-title">Dashboard</h1>
        <div className="flex items-center gap-3">
          {metrics && (
            <span className="text-xs text-ink-500/70">
              Last updated {fmtTime(metrics.generated_at)}
            </span>
          )}
          <button className="btn-secondary" onClick={load} disabled={loading} title="Refresh dashboard">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      <p className="mb-5 text-[13px] text-ink-500">Live metrics from the request database.</p>
      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {!metrics && loading ? (
        <Spinner text="Loading metrics..." />
      ) : metrics ? (
        <>
          {/* Stat cards */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Active Instances"
              value={metrics.active_instances}
              hint="approved or pending deletion"
            />
            <StatCard
              label="Pending Approvals"
              value={metrics.pending_requests}
              hint="awaiting your decision"
            />
            <StatCard
              label="Deletion Requests"
              value={metrics.delete_pending_requests}
              hint="awaiting your decision"
            />
            <StatCard
              label="Users"
              value={metrics.total_users}
              hint={`${metrics.active_users} active · ${metrics.disabled_users} disabled`}
            />
          </div>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Templates"
              value={`${metrics.templates_used}/${metrics.max_templates}`}
              hint="configured templates"
            />
            <StatCard label="Total Requests" value={metrics.total_requests} hint="ever submitted" />
            <StatCard label="Rejected" value={metrics.rejected_requests} hint="lifetime" />
            <StatCard label="Removed by Admin" value={metrics.removed_requests} hint="lifetime" />
          </div>

          {/* Panels */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <div className="border-b border-ink-100 px-4 py-3">
                <h2 className="section-title">Users with Active Instances</h2>
              </div>
              <table className="min-w-full divide-y divide-ink-100">
                <thead className="bg-ink-50/50">
                  <tr>
                    <th className="th">User</th>
                    <th className="th">Email</th>
                    <th className="th">Instances</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {metrics.users_with_active.length === 0 && (
                    <EmptyState text="No users with active instances." colSpan={3} />
                  )}
                  {metrics.users_with_active.map((u) => (
                    <tr key={u.user_email} className="table-row">
                      <td className="td font-medium text-ink-900">{u.user_name}</td>
                      <td className="td">{u.user_email}</td>
                      <td className="td">
                        <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-blue-700 ring-1 ring-inset ring-blue-600/20">
                          {u.count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card">
              <div className="border-b border-ink-100 px-4 py-3">
                <h2 className="section-title">Instance Creations — Last 14 Days</h2>
              </div>
              <div className="px-4 py-4">
                <CreationsChart data={metrics.creations_per_day} />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
