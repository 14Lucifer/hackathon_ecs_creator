import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Trash2, Upload, UserCheck, UserPlus, UserX } from 'lucide-react'
import { api } from '../../services/api'
import { Badge, EmptyState, ErrorBanner, Modal, Spinner, useToast } from '../../components/ui'

function fmt(ts) {
  return ts ? new Date(ts).toLocaleDateString() : '—'
}

function UserModal({ mode, user, onClose, onSaved }) {
  const [form, setForm] = useState(
    mode === 'edit' ? { name: user.name, password: '' } : { email: '', name: '', password: '' },
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (mode === 'edit') {
        await api.updateUser(user.id, {
          name: form.name,
          ...(form.password ? { password: form.password } : {}),
        })
        toast('User updated')
      } else {
        await api.createUser(form)
        toast('User added')
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={mode === 'edit' ? `Edit User: ${user.email}` : 'Create User'} onClose={onClose}>
      <ErrorBanner message={error} onDismiss={() => setError('')} />
      <form onSubmit={submit} className="space-y-4">
        {mode === 'create' && (
          <div>
            <label className="label">Email (unique) *</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
            />
          </div>
        )}
        <div>
          <label className="label">Name *</label>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </div>
        <div>
          <label className="label">
            Password {mode === 'edit' ? '(leave blank to keep current)' : '*'}
          </label>
          <input
            type="password"
            className="input"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            required={mode === 'create'}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Spinner text="Saving..." /> : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState([])
  const [modal, setModal] = useState(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [batching, setBatching] = useState(false)
  const fileRef = useRef(null)
  const toast = useToast()

  const load = useCallback(() => {
    api
      .listUsers()
      .then((data) => {
        setUsers(data)
        setSelected([])
      })
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  // Admin accounts are not selectable for batch operations
  const selectableIds = users.filter((u) => u.role !== 'admin').map((u) => u.id)
  const toggleAll = () =>
    setSelected((s) => (s.length === selectableIds.length ? [] : selectableIds))

  const batchStatus = async (isActive) => {
    setError('')
    setBatching(true)
    try {
      const res = await api.batchUserStatus(selected, isActive)
      toast(
        `${res.updated} user(s) ${isActive ? 'enabled' : 'disabled'}` +
          (res.not_found ? `, ${res.not_found} not found` : ''),
      )
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBatching(false)
    }
  }

  const removeUser = async (u) => {
    if (
      !window.confirm(
        `Delete user "${u.email}" permanently?\n\nTheir finished request history will be purged. ` +
          'Users with active resources cannot be deleted.',
      )
    )
      return
    setError('')
    try {
      await api.deleteUser(u.id)
      toast('User deleted')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const batchDelete = async () => {
    if (
      !window.confirm(
        `Delete ${selected.length} user(s) permanently?\n\nFinished request history is purged. ` +
          'Users with active resources are skipped and reported.',
      )
    )
      return
    setError('')
    setBatching(true)
    try {
      const res = await api.batchDeleteUsers(selected)
      toast(`${res.deleted} user(s) deleted` + (res.skipped.length ? `, ${res.skipped.length} skipped` : ''))
      if (res.skipped.length) setError(res.skipped.join('; '))
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBatching(false)
    }
  }

  const toggleActive = async (u) => {
    setError('')
    try {
      await api.updateUser(u.id, { is_active: !u.is_active })
      toast(u.is_active ? 'User disabled' : 'User enabled')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const upload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const res = await api.batchUploadUsers(file)
      toast(`Batch upload: ${res.created} created, ${res.updated} updated`)
      if (res.errors.length) setError(res.errors.join('; '))
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="page-title">User Management</h1>
        <div className="flex gap-2">
          <a className="btn-secondary" href="/api/users/batch-template" download>
            <Download className="h-3.5 w-3.5" />
            Download Template
          </a>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? (
              <Spinner text="Uploading..." />
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Batch Upload (Excel)
              </>
            )}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={upload} />
          <button className="btn-primary" onClick={() => setModal({ mode: 'create' })}>
            <UserPlus className="h-3.5 w-3.5" />
            Create User
          </button>
        </div>
      </div>
      <p className="mb-4 text-xs text-ink-500">
        Batch upload logic: if the email already exists, its name and password are overwritten;
        new emails are appended as new users.
      </p>
      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {/* Batch toolbar */}
      <div className="mb-3 flex items-center gap-2">
        <button
          className="btn-secondary"
          disabled={selected.length === 0 || batching}
          onClick={() => batchStatus(true)}
        >
          <UserCheck className="h-3.5 w-3.5" />
          Enable ({selected.length})
        </button>
        <button
          className="btn-danger"
          disabled={selected.length === 0 || batching}
          onClick={() => batchStatus(false)}
        >
          <UserX className="h-3.5 w-3.5" />
          Disable ({selected.length})
        </button>
        <button
          className="btn-danger"
          disabled={selected.length === 0 || batching}
          onClick={batchDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete ({selected.length})
        </button>
        {batching && <Spinner text="Updating users..." />}
        <span className="text-xs text-ink-500/70">
          The admin account cannot be selected for batch operations.
        </span>
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-ink-100">
          <thead className="bg-ink-50/50">
            <tr>
              <th className="th w-10">
                <input
                  type="checkbox"
                  checked={selectableIds.length > 0 && selected.length === selectableIds.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="th">Email</th>
              <th className="th">Name</th>
              <th className="th">Role</th>
              <th className="th">Status</th>
              <th className="th">Active Resources</th>
              <th className="th">Created</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {users.length === 0 && <EmptyState text="No users yet." colSpan={8} />}
            {users.map((u) => (
              <tr key={u.id} className={`table-row ${u.is_active ? '' : 'opacity-60'}`}>
                <td className="td">
                  <input
                    type="checkbox"
                    checked={selected.includes(u.id)}
                    onChange={() => toggle(u.id)}
                    disabled={u.role === 'admin'}
                    className="disabled:cursor-not-allowed disabled:opacity-30"
                    title={u.role === 'admin' ? 'The admin account cannot be selected' : ''}
                  />
                </td>
                <td className="td font-medium text-ink-900">{u.email}</td>
                <td className="td">{u.name}</td>
                <td className="td capitalize">{u.role}</td>
                <td className="td">
                  <Badge status={u.is_active ? 'active' : 'inactive'} />
                </td>
                <td className="td">
                  <span
                    className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                      u.active_resources > 0
                        ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'
                        : 'text-ink-500/60'
                    }`}
                    title="Running instances (approved or pending deletion)"
                  >
                    {u.active_resources}
                  </span>
                </td>
                <td className="td">{fmt(u.created_at)}</td>
                <td className="td">
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => setModal({ mode: 'edit', user: u })}
                    >
                      Edit
                    </button>
                    {u.role !== 'admin' && (
                      <>
                        <button className="btn-danger btn-sm" onClick={() => toggleActive(u)}>
                          {u.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button className="btn-danger btn-sm" onClick={() => removeUser(u)}>
                          <Trash2 className="h-3 w-3" />
                          Delete
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

      {modal && (
        <UserModal mode={modal.mode} user={modal.user} onClose={() => setModal(null)} onSaved={load} />
      )}
    </div>
  )
}
