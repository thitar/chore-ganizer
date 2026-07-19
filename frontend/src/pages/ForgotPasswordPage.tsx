import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/auth.api'
import { KeyRound } from 'lucide-react'
import { Button } from '../components/ui/Button'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await forgotPassword(email)
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
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
            Forgot Password
          </h1>
          <p className="mt-2 text-zinc-400">Enter your email to receive a reset link</p>
        </div>
        {submitted ? (
          <div className="text-center space-y-4">
            <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-green-400">
              If an account exists with that email, you will receive a password reset link.
            </div>
            <Link to="/login" className="inline-block text-accent hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            {error && <div className="alert-error mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="mb-1 block text-sm text-zinc-400">Email</label>
                <input id="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" required />
              </div>
              <Button type="submit" loading={isSubmitting} className="w-full">
                {isSubmitting ? 'Sending...' : 'Send reset link'}
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
