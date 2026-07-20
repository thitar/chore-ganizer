import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { getAuthStatus } from '../api/auth.api'
import { LogIn } from 'lucide-react'
import { Button } from '../components/ui/Button'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const { data: authStatus } = useQuery({
    queryKey: ['auth', 'status'],
    queryFn: getAuthStatus,
    staleTime: Infinity,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError('Invalid email or password')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_60%)]"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-edge bg-surface p-8 shadow-glow">
        <div className="mb-8 text-center">
          <LogIn aria-hidden className="mx-auto h-12 w-12 text-accent" />
          <h1 className="mt-4 bg-gradient-to-r from-accent to-accent-to bg-clip-text font-display text-3xl font-bold text-transparent">
            Chore-Ganizer
          </h1>
          <p className="mt-2 text-zinc-400">Sign in to your account</p>
        </div>
        {error && <div className="alert-error mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm text-zinc-400">Email</label>
            <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" required />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1 block text-sm text-zinc-400">Password</label>
            <input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" required />
          </div>
          <Button type="submit" loading={isSubmitting} className="w-full">
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
        {authStatus?.passwordResetEnabled && (
          <p className="mt-4 text-center text-sm text-zinc-400">
            <Link to="/forgot-password" className="text-accent hover:underline">Forgot password?</Link>
          </p>
        )}
      </div>
    </div>
  )
}
