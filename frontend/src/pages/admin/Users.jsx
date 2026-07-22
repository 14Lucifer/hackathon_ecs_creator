import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../services/api'
import { Badge, ErrorBanner, Modal, Spinner, useToast } from '../../components/ui'

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
  const [modal, setModal] = useState(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const toast = useToast()

  const load = useCallback(() => {
    api.listUsers().then(setUsers).catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    load()
  }, [load])

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
        <h1 className="text-xl font-bold text-gray-900">User Management</h1>
        <div className="flex gap-2">
          <a className="btn-secondary" href="/api/users/batch-template" download>
            Download Template
          </a>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Spinner text="Uploading..." /> : 'Batch Upload (Excel)'}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={upload} />
          <button className="btn-primary" onClick={() => setModal({ mode: 'create' })}>
            Create User
          </button>
        </div>
      </div>
      <p className="mb-4 text-xs text-gray-500">
        Batch upload logic: if the email already exists, its name and password are overwritten;
        new emails are appended as new users.
      </p>
      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Email</th>
              <th className="th">Name</th>
              <th className="th">Role</th>
              <th className="th">Status</th>
              <th className="th">Created</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className={u.is_active ? '' : 'opacity-60'}>
                <td className="td font-medium text-gray-900">{u.email}</td>
                <td className="td">{u.name}</td>
                <td className="td capitalize">{u.role}</td>
                <td className="td">
                  <Badge status={u.is_active ? 'active' : 'inactive'} />
                </td>
                <td className="td">{fmt(u.created_at)}</td>
                <td className="td">
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary !px-2 !py-1"
                      onClick={() => setModal({ mode: 'edit', user: u })}
                    >
                      Edit
                    </button>
                    {u.role !== 'admin' && (
                      <button className="btn-danger !px-2 !py-1" onClick={() => toggleActive(u)}>
                        {u.is_active ? 'Disable' : 'Enable'}
                      </button>
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
