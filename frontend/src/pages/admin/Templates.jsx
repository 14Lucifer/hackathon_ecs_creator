import { useCallback, useEffect, useState } from 'react'
import { api } from '../../services/api'
import { ErrorBanner, Modal, Spinner, useToast } from '../../components/ui'

const MAX_TEMPLATES = 6
const EMPTY = {
  name: '',
  instance_type: '',
  image_id: '',
  system_disk_category: 'cloud_essd',
  system_disk_size_gb: 40,
  public_ip_enabled: false,
}

function TemplateForm({ initial, onSubmit, onClose, saving }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ ...form, system_disk_size_gb: Number(form.system_disk_size_gb) })
      }}
      className="space-y-4"
    >
      <div>
        <label className="label">Template Name *</label>
        <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
      </div>
      <div>
        <label className="label">Instance Type * (e.g., ecs.g7.large)</label>
        <input
          className="input"
          value={form.instance_type}
          onChange={(e) => set('instance_type', e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label">Image ID *</label>
        <input className="input" value={form.image_id} onChange={(e) => set('image_id', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">System Disk Category</label>
          <select
            className="input"
            value={form.system_disk_category}
            onChange={(e) => set('system_disk_category', e.target.value)}
          >
            <option value="cloud_essd">cloud_essd</option>
            <option value="cloud_ssd">cloud_ssd</option>
            <option value="cloud_efficiency">cloud_efficiency</option>
          </select>
        </div>
        <div>
          <label className="label">System Disk Size (GB)</label>
          <input
            type="number"
            min={20}
            className="input"
            value={form.system_disk_size_gb}
            onChange={(e) => set('system_disk_size_gb', e.target.value)}
            required
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          id="public-ip"
          type="checkbox"
          checked={form.public_ip_enabled}
          onChange={(e) => set('public_ip_enabled', e.target.checked)}
        />
        <label htmlFor="public-ip" className="text-sm text-gray-700">
          Enable Public IP (Pay-By-Traffic, 20 Mbps)
        </label>
      </div>
      <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
        Fixed: Pay-As-You-Go billing · root user · auto-generated 16-char password at creation ·
        instance name &lt;user&gt;_&lt;seq&gt; · Region from Settings.
      </p>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <Spinner text="Saving..." /> : 'Save Template'}
        </button>
      </div>
    </form>
  )
}

export default function Templates() {
  const [templates, setTemplates] = useState([])
  const [modal, setModal] = useState(null) // null | {mode:'create'} | {mode:'edit', tpl}
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const load = useCallback(() => {
    api.listTemplates().then(setTemplates).catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async (data) => {
    setError('')
    setSaving(true)
    try {
      if (modal.mode === 'edit') {
        await api.updateTemplate(modal.tpl.id, data)
        toast('Template updated')
      } else {
        await api.createTemplate(data)
        toast('Template created')
      }
      setModal(null)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (tpl) => {
    if (!window.confirm(`Delete template "${tpl.name}"?`)) return
    setError('')
    try {
      await api.deleteTemplate(tpl.id)
      toast('Template deleted')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const atLimit = templates.length >= MAX_TEMPLATES

  return (
    <div className="max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">ECS Templates ({templates.length}/{MAX_TEMPLATES})</h1>
        <span title={atLimit ? `Delete a template to create a new one (max ${MAX_TEMPLATES}).` : ''}>
          <button
            className="btn-primary"
            disabled={atLimit}
            onClick={() => setModal({ mode: 'create' })}
          >
            Create Template
          </button>
        </span>
      </div>
      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Name</th>
              <th className="th">Instance Type</th>
              <th className="th">Image ID</th>
              <th className="th">System Disk</th>
              <th className="th">Public IP</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {templates.length === 0 && (
              <tr>
                <td className="td text-gray-400" colSpan={6}>
                  No templates yet — create one to let users request resources.
                </td>
              </tr>
            )}
            {templates.map((t) => (
              <tr key={t.id}>
                <td className="td font-medium text-gray-900">{t.name}</td>
                <td className="td font-mono text-xs">{t.instance_type}</td>
                <td className="td max-w-48 truncate font-mono text-xs" title={t.image_id}>
                  {t.image_id}
                </td>
                <td className="td">
                  {t.system_disk_category} / {t.system_disk_size_gb} GB
                </td>
                <td className="td">{t.public_ip_enabled ? 'Enabled (20 Mbps)' : 'Disabled'}</td>
                <td className="td">
                  <div className="flex gap-2">
                    <button className="btn-secondary !px-2 !py-1" onClick={() => setModal({ mode: 'edit', tpl: t })}>
                      Edit
                    </button>
                    <button className="btn-danger !px-2 !py-1" onClick={() => remove(t)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'edit' ? `Edit Template: ${modal.tpl.name}` : 'Create Template'}
          onClose={() => setModal(null)}
        >
          <TemplateForm
            initial={modal.mode === 'edit' ? modal.tpl : EMPTY}
            onSubmit={save}
            onClose={() => setModal(null)}
            saving={saving}
          />
        </Modal>
      )}
    </div>
  )
}
