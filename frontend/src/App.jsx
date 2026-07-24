import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { api } from './services/api'
import { Spinner } from './components/ui'
import Login from './pages/Login'
import UserPortal from './pages/user/UserPortal'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Approvals from './pages/admin/Approvals'
import Templates from './pages/admin/Templates'
import Users from './pages/admin/Users'
import ActiveResources from './pages/admin/ActiveResources'
import AuditLog from './pages/admin/AuditLog'
import Settings from './pages/admin/Settings'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onExpired = () => {
      setUser(null)
      navigate('/login')
    }
    window.addEventListener('session-expired', onExpired)
    return () => window.removeEventListener('session-expired', onExpired)
  }, [navigate])

  const logout = async () => {
    try {
      await api.logout()
    } finally {
      setUser(null)
      navigate('/login')
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner text="Loading..." />
      </div>
    )
  }

  const home = user ? (user.role === 'admin' ? '/admin/dashboard' : '/portal') : '/login'

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to={home} /> : <Login />} />
        <Route
          path="/portal"
          element={user && user.role === 'user' ? <UserPortal /> : <Navigate to={home} />}
        />
        <Route
          path="/admin"
          element={user && user.role === 'admin' ? <AdminLayout /> : <Navigate to={home} />}
        >
          <Route index element={<Navigate to="dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="templates" element={<Templates />} />
          <Route path="users" element={<Users />} />
          <Route path="resources" element={<ActiveResources />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to={home} />} />
      </Routes>
    </AuthContext.Provider>
  )
}
