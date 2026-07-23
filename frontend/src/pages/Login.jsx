import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Server } from 'lucide-react'
import { useAuth } from '../App'
import { api } from '../services/api'
import { ErrorBanner, Spinner } from '../components/ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setUser } = useAuth()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await api.login(email, password)
      setUser(user)
      navigate(user.role === 'admin' ? '/admin/approvals' : '/portal')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      {/* subtle top gradient accent */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-gradient-to-b from-ink-100/80 to-transparent" />
      <div className="card relative w-full max-w-sm p-8 animate-slide-up">
        <div className="mb-6 flex flex-col items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-white shadow-card">
            <Server className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-ink-900">
              ECS Resource Request System
            </h1>
            <p className="text-[13px] text-ink-500">Sign in with your email and password</p>
          </div>
        </div>
        <ErrorBanner message={error} onDismiss={() => setError('')} />
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <Spinner text="Signing in..." /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
