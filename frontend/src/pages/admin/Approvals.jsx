import { useCallback, useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { api } from '../../services/api'
import { Badge, EmptyState, ErrorBanner, Modal, Spinner, StatCard, useToast } from '../../components/ui'

function fmt(ts) {
  return ts ? new Date(ts).toLocaleString() : '—'
}

// --- Cascading approve modal (Region → VPC → vSwitch → SG → Confirm) -----------
function ApproveModal({ requestIds, onClose, onDone }) {
  const [region, setRegion] = useState('')
  const [vpcs, setVpcs] = useState(null)
  const [vswitches, setVswitches] = useState(null)
  const [sgs, setSgs] = useState(null)
  const [vpcId, setVpcId] = useState('')
  const [vswitchId, setVswitchId] = useState('')
  const [sgId, setSgId] = useState('')
  const [loadingStep, setLoadingStep] = useState('') // 'vpc' | 'vsw' | 'sg' | 'confirm'
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    api
      .approvalRegion()
      .then((r) => setRegion(r.region_id))
      .catch((err) => setError(err.message))
  }, [])

  const call = async (step, fn, after) => {
    setError('')
    setLoadingStep(step)
    try {
      after(await fn())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingStep('')
    }
  }

  const fetchVpcs = () =>
    call('vpc', api.fetchVpcs, (data) => {
      setVpcs(data)
      setVpcId('')
      setVswitches(null)
      setVswitchId('')
      setSgs(null)
      setSgId('')
    })

  const fetchVswitches = () =>
    call('vsw', () => api.fetchVswitches(vpcId), (data) => {
      setVswitches(data)
      setVswitchId('')
      setSgs(null)
      setSgId('')
    })

  const fetchSgs = () =>
    call('sg', () => api.fetchSecurityGroups(vpcId), (data) => {
      setSgs(data)
      setSgId('')
    })

  const confirm = () =>
    call(
      'confirm',
      () =>
        api.approve({
          request_ids: requestIds,
          vpc_id: vpcId,
          vswitch_id: vswitchId,
          security_group_id: sgId,
        }),
      (res) => {
        setResult(res)
        onDone()
      },
    )

  const stepReady = { vsw: !!vpcId, sg: !!vswitchId, confirm: !!(vpcId && vswitchId && sgId) }

  if (result) {
    return (
      <Modal title="Approval Result" onClose={onClose} wide>
        <p className="mb-3 text-sm font-medium text-ink-900">
          {result.succeeded} approved successfully, {result.failed} failed
        </p>
        <ul className="space-y-1 text-sm">
          {result.results.map((r) => (
            <li key={r.request_id} className={r.success ? 'text-green-700' : 'text-red-700'}>
              Request #{r.request_id}:{' '}
              {r.success ? `approved (${r.instance_id})` : `failed — ${r.error}`}
            </li>
          ))}
        </ul>
        <div className="mt-4 text-right">
          <button className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={`Approve ${requestIds.length} Request(s)`} onClose={onClose} wide>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      {loadingStep && (
        <div className="mb-3">
          <Spinner text="Calling Alibaba Cloud API..." />
        </div>
      )}
      <div className="space-y-5">
        {/* Step 1: Region */}
        <div>
          <label className="label">Step 1 — Region ID (from Settings)</label>
          <input className="input bg-ink-50 text-ink-500" value={region} readOnly />
        </div>

        {/* Step 2: VPC */}
        <div>
          <label className="label">Step 2 — VPC</label>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={fetchVpcs} disabled={!!loadingStep}>
              Fetch VPCs
            </button>
            <select
              className="input"
              value={vpcId}
              onChange={(e) => {
                setVpcId(e.target.value)
                setVswitches(null)
                setVswitchId('')
                setSgs(null)
                setSgId('')
              }}
              disabled={!vpcs}
            >
              <option value="">{vpcs ? 'Select a VPC…' : 'Fetch VPCs first'}</option>
              {(vpcs || []).map((v) => (
                <option key={v.vpc_id} value={v.vpc_id}>
                  {v.name} ({v.vpc_id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 3: vSwitch */}
        <div className={stepReady.vsw ? '' : 'opacity-50'}>
          <label className="label">Step 3 — vSwitch</label>
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              onClick={fetchVswitches}
              disabled={!stepReady.vsw || !!loadingStep}
            >
              Fetch vSwitches
            </button>
            <select
              className="input"
              value={vswitchId}
              onChange={(e) => {
                setVswitchId(e.target.value)
                setSgs(null)
                setSgId('')
              }}
              disabled={!vswitches}
            >
              <option value="">{vswitches ? 'Select a vSwitch…' : 'Fetch vSwitches first'}</option>
              {(vswitches || []).map((s) => (
                <option key={s.vswitch_id} value={s.vswitch_id}>
                  {s.name} ({s.vswitch_id}) - {s.zone_id}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 4: Security Group */}
        <div className={stepReady.sg ? '' : 'opacity-50'}>
          <label className="label">Step 4 — Security Group</label>
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              onClick={fetchSgs}
              disabled={!stepReady.sg || !!loadingStep}
            >
              Fetch Security Groups
            </button>
            <select
              className="input"
              value={sgId}
              onChange={(e) => setSgId(e.target.value)}
              disabled={!sgs}
            >
              <option value="">{sgs ? 'Select a security group…' : 'Fetch security groups first'}</option>
              {(sgs || []).map((g) => (
                <option key={g.security_group_id} value={g.security_group_id}>
                  {g.name} ({g.security_group_id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 5: Confirm */}
        {stepReady.confirm && (
          <div className="border-t border-ink-100 pt-4 text-right">
            <button className="btn-primary" onClick={confirm} disabled={!!loadingStep}>
              Confirm Approve
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

// --- Reject modal ---------------------------------------------------------------
function RejectModal({ requestIds, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const confirm = async () => {
    setError('')
    setLoading(true)
    try {
      await api.reject({ request_ids: requestIds, reason })
      toast(`${requestIds.length} request(s) rejected`)
      onDone()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Reject ${requestIds.length} Request(s)`} onClose={onClose}>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      <label className="label">Reason for Rejection (required)</label>
      <textarea
        className="input min-h-24"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Explain why these requests are rejected…"
      />
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="btn-danger" onClick={confirm} disabled={!reason.trim() || loading}>
          {loading ? <Spinner text="Rejecting..." /> : 'Confirm Reject'}
        </button>
      </div>
    </Modal>
  )
}

// --- Page --------------------------------------------------------------------------
export default function Approvals() {
  const [pending, setPending] = useState([])
  const [deletions, setDeletions] = useState([])
  const [selected, setSelected] = useState([])
  const [modal, setModal] = useState(null) // {type: 'approve'|'reject', ids: []}
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const load = useCallback(async () => {
    try {
      const [p, d] = await Promise.all([api.pendingRequests(), api.deletePendingRequests()])
      setPending(p)
      setDeletions(d)
      setSelected([])
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const toggleAll = () =>
    setSelected((s) => (s.length === pending.length ? [] : pending.map((p) => p.id)))

  const decideDeletion = async (ids, approveIt) => {
    setError('')
    setBusy(true)
    try {
      const res = approveIt ? await api.approveDeletions(ids) : await api.rejectDeletions(ids)
      if (res.failed > 0) {
        setError(res.results.filter((r) => !r.success).map((r) => `#${r.request_id}: ${r.error}`).join('; '))
      } else {
        toast(approveIt ? 'Deletion approved — instance terminated' : 'Deletion request denied')
      }
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-5xl">
      <h1 className="page-title mb-1">Approval Management</h1>
      <p className="mb-5 text-[13px] text-ink-500">
        Review pending resource requests and deletion requests.
      </p>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Pending Requests" value={pending.length} hint="awaiting approval" />
        <StatCard label="Deletion Requests" value={deletions.length} hint="awaiting decision" />
        <StatCard label="Selected" value={selected.length} hint="for batch action" />
      </div>
      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {/* Pending resource requests */}
      <div className="card mb-8 overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <h2 className="section-title flex items-center gap-2">
            Pending Requests <Badge status="pending" />
          </h2>
          <div className="flex gap-2">
            <button
              className="btn-primary"
              disabled={selected.length === 0}
              onClick={() => setModal({ type: 'approve', ids: selected })}
            >
              <Check className="h-3.5 w-3.5" />
              Batch Approve ({selected.length})
            </button>
            <button
              className="btn-danger"
              disabled={selected.length === 0}
              onClick={() => setModal({ type: 'reject', ids: selected })}
            >
              <X className="h-3.5 w-3.5" />
              Batch Reject ({selected.length})
            </button>
          </div>
        </div>
        <table className="min-w-full divide-y divide-ink-100">
          <thead className="bg-ink-50/50">
            <tr>
              <th className="th w-10">
                <input
                  type="checkbox"
                  checked={pending.length > 0 && selected.length === pending.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="th">User Name</th>
              <th className="th">User Email</th>
              <th className="th">Template Name</th>
              <th className="th">Submitted At</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {pending.length === 0 && <EmptyState text="No pending requests." colSpan={6} />}
            {pending.map((r) => (
              <tr key={r.id} className="table-row">
                <td className="td">
                  <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} />
                </td>
                <td className="td font-medium text-ink-900">{r.user_name}</td>
                <td className="td">{r.user_email}</td>
                <td className="td">{r.template_name}</td>
                <td className="td tabular-nums">{fmt(r.submitted_at)}</td>
                <td className="td">
                  <div className="flex gap-2">
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => setModal({ type: 'approve', ids: [r.id] })}
                    >
                      Approve
                    </button>
                    <button
                      className="btn-danger btn-sm"
                      onClick={() => setModal({ type: 'reject', ids: [r.id] })}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending deletion requests */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-100 px-4 py-3">
          <h2 className="section-title flex items-center gap-2">
            Deletion Requests <Badge status="delete_pending" />
          </h2>
        </div>
        <table className="min-w-full divide-y divide-ink-100">
          <thead className="bg-ink-50/50">
            <tr>
              <th className="th">User Name</th>
              <th className="th">User Email</th>
              <th className="th">Template Name</th>
              <th className="th">Submitted At</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {deletions.length === 0 && <EmptyState text="No deletion requests." colSpan={5} />}
            {deletions.map((r) => (
              <tr key={r.id} className="table-row">
                <td className="td font-medium text-ink-900">{r.user_name}</td>
                <td className="td">{r.user_email}</td>
                <td className="td">{r.template_name}</td>
                <td className="td tabular-nums">{fmt(r.submitted_at)}</td>
                <td className="td">
                  <div className="flex items-center gap-2">
                    {busy ? (
                      <Spinner text="Calling Alibaba Cloud API..." />
                    ) : (
                      <>
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => decideDeletion([r.id], true)}
                        >
                          Approve Deletion
                        </button>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => decideDeletion([r.id], false)}
                        >
                          Deny
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.type === 'approve' && (
        <ApproveModal requestIds={modal.ids} onClose={() => setModal(null)} onDone={load} />
      )}
      {modal?.type === 'reject' && (
        <RejectModal requestIds={modal.ids} onClose={() => setModal(null)} onDone={load} />
      )}
    </div>
  )
}
