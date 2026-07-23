// Thin fetch wrapper for the backend REST API (cookie-based sessions).
class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const opts = { method, credentials: 'include', headers: {} }
  if (body !== undefined) {
    if (isForm) {
      opts.body = body // FormData — browser sets the content type
    } else {
      opts.headers['Content-Type'] = 'application/json'
      opts.body = JSON.stringify(body)
    }
  }
  const res = await fetch(`/api${path}`, opts)
  if (res.status === 401 && !path.startsWith('/auth/login')) {
    // Session expired — send the user back to login
    window.dispatchEvent(new Event('session-expired'))
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (typeof data.detail === 'string') detail = data.detail
      else if (data.detail) detail = JSON.stringify(data.detail)
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(detail, res.status)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  // templates
  listTemplates: () => request('/templates'),
  createTemplate: (data) => request('/templates', { method: 'POST', body: data }),
  updateTemplate: (id, data) => request(`/templates/${id}`, { method: 'PUT', body: data }),
  deleteTemplate: (id) => request(`/templates/${id}`, { method: 'DELETE' }),

  // user requests
  myRequests: () => request('/requests/mine'),
  createRequest: (templateId) =>
    request('/requests', { method: 'POST', body: { template_id: templateId } }),
  requestDeletion: (id) => request(`/requests/${id}/request-deletion`, { method: 'POST' }),

  // users (admin)
  listUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: data }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: data }),
  batchUploadUsers: (file) => {
    const form = new FormData()
    form.append('file', file)
    return request('/users/batch-upload', { method: 'POST', body: form, isForm: true })
  },

  // approvals (admin)
  pendingRequests: () => request('/approvals/pending'),
  deletePendingRequests: () => request('/approvals/delete-pending'),
  approvalRegion: () => request('/approvals/region'),
  fetchVpcs: () => request('/approvals/network/vpcs'),
  fetchVswitches: (vpcId) =>
    request(`/approvals/network/vswitches?vpc_id=${encodeURIComponent(vpcId)}`),
  fetchSecurityGroups: (vpcId) =>
    request(`/approvals/network/security-groups?vpc_id=${encodeURIComponent(vpcId)}`),
  fetchDomains: () => request('/approvals/network/domains'),
  approve: (data) => request('/approvals/approve', { method: 'POST', body: data }),
  reject: (data) => request('/approvals/reject', { method: 'POST', body: data }),
  approveDeletions: (ids) =>
    request('/approvals/deletions/approve', { method: 'POST', body: { request_ids: ids } }),
  rejectDeletions: (ids) =>
    request('/approvals/deletions/reject', { method: 'POST', body: { request_ids: ids } }),

  // active resources / audit / settings (admin)
  activeResources: () => request('/active-resources'),
  removeResource: (id, remark) =>
    request(`/active-resources/${id}/remove`, { method: 'POST', body: { remark } }),
  auditLogs: (action, order) => {
    const params = new URLSearchParams()
    if (action) params.set('action', action)
    if (order) params.set('order', order)
    const qs = params.toString()
    return request(`/audit${qs ? `?${qs}` : ''}`)
  },
  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', { method: 'PUT', body: data }),
  changeAdminPassword: (data) =>
    request('/settings/admin-password', { method: 'POST', body: data }),
}

export { ApiError }
