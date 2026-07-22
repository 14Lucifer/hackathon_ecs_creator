import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../App'

const NAV = [
  { to: '/admin/approvals', label: 'Approvals', icon: '✅' },
  { to: '/admin/templates', label: 'ECS Templates', icon: '🖥️' },
  { to: '/admin/users', label: 'Users', icon: '👥' },
  { to: '/admin/resources', label: 'Active Resources', icon: '📦' },
  { to: '/admin/audit', label: 'Audit Log', icon: '📜' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen">
      {/* Left sidebar */}
      <aside className="flex w-60 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-4">
          <div className="text-sm font-bold text-gray-900">ECS Request System</div>
          <div className="text-xs text-gray-500">Admin Portal</div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-3">
          <div className="mb-2 truncate px-1 text-xs text-gray-500">{user.email}</div>
          <button className="btn-secondary w-full justify-center" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-x-auto bg-gray-50 p-6">
        <Outlet />
      </main>
    </div>
  )
}
