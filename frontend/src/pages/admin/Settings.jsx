import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { ErrorBanner, Spinner, useToast } from '../../components/ui'

export default function Settings() {
  const [form, setForm] = useState({
    api_endpoint: '',
    access_key_id: '',
    access_key_secret: '',
    region_id: '',
  })
  const [pwd, setPwd] = useState({ current_password: '', new_password: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [changingPwd, setChangingPwd] = useState(false)
  const toast = useToast()

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    api.getSettings().then(setForm).catch((err) => setError(err.message))
  }, [])

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const updated = await api.updateSettings(form)
      setForm(updated)
      toast('Settings saved')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    setError('')
    setChangingPwd(true)
    try {
      await api.changeAdminPassword(pwd)
      toast('Password changed — please log in again')
      // All admin sessions are invalidated server-side; the next API call
      // returns 401 and the app redirects to login.
      window.dispatchEvent(new Event('session-expired'))
    } catch (err) {
      setError(err.message)
    } finally {
      setChangingPwd(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-bold text-gray-900">System Settings</h1>
      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <form onSubmit={save} className="card mb-8 space-y-4 p-5">
        <h2 className="text-base font-semibold text-gray-900">Alibaba Cloud</h2>
        <div>
          <label className="label">API Endpoint</label>
          <input
            className="input"
            value={form.api_endpoint}
            onChange={(e) => set('api_endpoint', e.target.value)}
            placeholder="ecs.cn-hangzhou.aliyuncs.com"
          />
        </div>
        <div>
          <label className="label">Access Key ID (stored encrypted)</label>
          <input
            className="input"
            value={form.access_key_id}
            onChange={(e) => set('access_key_id', e.target.value)}
            placeholder="LTAI..."
          />
        </div>
        <div>
          <label className="label">Access Key Secret (stored encrypted, AES-256)</label>
          <input
            type="password"
            className="input"
            value={form.access_key_secret}
            onChange={(e) => set('access_key_secret', e.target.value)}
          />
        </div>
        <div>
          <label className="label">Region ID (used globally for all API calls)</label>
          <input
            className="input"
            value={form.region_id}
            onChange={(e) => set('region_id', e.target.value)}
            placeholder="cn-hangzhou"
          />
        </div>
        <p className="text-xs text-gray-400">
          Saved AK/SK are shown as **** and never returned in plaintext. Leave the mask
          untouched to keep the stored value.
        </p>
        <div className="text-right">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Spinner text="Saving..." /> : 'Save'}
          </button>
        </div>
      </form>

      <form onSubmit={changePassword} className="card space-y-4 p-5">
        <h2 className="text-base font-semibold text-gray-900">Change Admin Password</h2>
        <div>
          <label className="label">Current Password</label>
          <input
            type="password"
            className="input"
            value={pwd.current_password}
            onChange={(e) => setPwd((p) => ({ ...p, current_password: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label">New Password (min 6 characters)</label>
          <input
            type="password"
            className="input"
            minLength={6}
            value={pwd.new_password}
            onChange={(e) => setPwd((p) => ({ ...p, new_password: e.target.value }))}
            required
          />
        </div>
        <p className="text-xs text-gray-400">
          Changing the password invalidates all existing admin sessions.
        </p>
        <div className="text-right">
          <button type="submit" className="btn-danger" disabled={changingPwd}>
            {changingPwd ? <Spinner text="Changing..." /> : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  )
}
