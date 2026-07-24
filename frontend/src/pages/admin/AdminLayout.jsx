import { NavLink, Outlet } from 'react-router-dom'
import {
  CheckSquare,
  FileClock,
  LayoutDashboard,
  LogOut,
  Package,
  Server,
  Settings,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import { useAuth } from '../../App'

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/admin/approvals', label: 'Approvals', Icon: CheckSquare },
  { to: '/admin/templates', label: 'ECS Templates', Icon: SlidersHorizontal },
  { to: '/admin/users', label: 'Users', Icon: Users },
  { to: '/admin/resources', label: 'Active Resources', Icon: Package },
  { to: '/admin/audit', label: 'Audit Log', Icon: FileClock },
  { to: '/admin/settings', label: 'Settings', Icon: Settings },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen">
      {/* Left sidebar */}
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-ink-100 bg-white">
        <div className="flex items-center gap-2.5 border-b border-ink-100 px-4 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-white">
            <Server className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold tracking-tight text-ink-900">
              ECS Request System
            </div>
            <div className="text-[11px] text-ink-500">Admin Portal</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-ink-900 text-white shadow-card'
                    : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-ink-100 p-3">
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[10px] font-semibold text-ink-700">
              {user.name?.[0]?.toUpperCase() || 'A'}
            </span>
            <span className="truncate text-xs text-ink-500">{user.email}</span>
          </div>
          <button className="btn-secondary w-full" onClick={logout}>
            <LogOut className="h-3.5 w-3.5" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 overflow-x-auto bg-ink-50 p-8">
        <div className="animate-slide-up">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
