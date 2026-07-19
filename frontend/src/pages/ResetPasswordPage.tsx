import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/auth.api'
import { KeyRound } from 'lucide-react'
import { Button } from '../components/ui/Button'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validToken = token.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setIsSubmitting(true)
    try {
      await resetPassword(token, password)
      setSubmitted(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong.'
      setError(message.includes('expired') || message.includes('Invalid') ? 'This reset link is invalid or has expired.' : message)
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
          <KeyRound aria-hidden className="mx-auto h-12 w-12 text-accent" />
          <h1 className="mt-4 bg-gradient-to-r from-accent to-accent-to bg-clip-text font-display text-3xl font-bold text-transparent">
            Reset Password
          </h1>
          <p className="mt-2 text-zinc-400">Enter your new password below</p>
        </div>
        {!validToken ? (
          <div className="text-center space-y-4">
            <div className="alert-error">Invalid reset link.</div>
            <Link to="/forgot-password" className="inline-block text-accent hover:underline">
              Request a new reset link
            </Link>
          </div>
        ) : submitted ? (
          <div className="text-center space-y-4">
            <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-green-400">
              Password reset! You can now sign in.
            </div>
            <Link to="/login" className="inline-block text-accent hover:underline">
              Sign in
            </Link>
          </div>
        ) : (
          <>
            {error && <div className="alert-error mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="mb-1 block text-sm text-zinc-400">New password (min 6 chars)</label>
                <input id="new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" required minLength={6} />
              </div>
              <div>
                <label htmlFor="confirm-password" className="mb-1 block text-sm text-zinc-400">Confirm new password</label>
                <input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input" required minLength={6} />
              </div>
              <Button type="submit" loading={isSubmitting} className="w-full">
                {isSubmitting ? 'Resetting...' : 'Reset password'}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-zinc-400">
              <Link to="/login" className="text-accent hover:underline">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
