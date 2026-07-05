import { useState, useEffect } from 'react'
import { useMyPoints, useAdjustPoints, useLeaderboard } from '../hooks/usePoints'
import { useUsers } from '../hooks/useUsers'
import { useAuth } from '../hooks/useAuth'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { Toast } from '../components/ui/Toast'
import { CountUp } from '../components/ui/CountUp'
import { Leaderboard } from '../components/Leaderboard'
import { Plus } from 'lucide-react'

const TYPE_BADGE_CLASS: Record<string, string> = {
  EARNED: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  BONUS: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
  DEDUCTION: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  PENALTY: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  REVERSED: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  ADJUSTMENT: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
  PAYOUT: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  ADVANCE: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

export function PointsPage() {
  const { user } = useAuth()
  const { data: myPoints, isLoading, error } = useMyPoints()
  const { users } = useUsers()
  const adjustMutation = useAdjustPoints()
  const { data: leaderboard } = useLeaderboard()
  const [adjustUserId, setAdjustUserId] = useState<number | null>(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const isParent = user?.role === 'PARENT'
  const userList = (users as Array<{ id: number; name: string; role: string; color: string }>) ?? []

  function resetForm() {
    setAmount('')
    setReason('')
    setFormError(null)
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const targetUserId = adjustUserId ?? user?.id
    if (!targetUserId) {
      setFormError('Please select a user.')
      return
    }
    const amt = parseInt(amount, 10)
    if (!Number.isInteger(amt) || amt === 0) {
      setFormError('Amount must be a non-zero integer.')
      return
    }
    if (!reason.trim()) {
      setFormError('Reason is required.')
      return
    }
    try {
      await adjustMutation.mutateAsync({ userId: targetUserId, amount: amt, reason: reason.trim() })
      resetForm()
      setSuccessMessage(`Points adjusted by ${amt > 0 ? '+' : ''}${amt}!`)
    } catch {
      setFormError('Failed to adjust points. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <div className="py-12 text-center">
          <h2 className="mb-2 font-display text-2xl font-bold text-zinc-100">Something went wrong</h2>
          <p className="mb-4 text-zinc-400">Unable to load points. Check your connection and try again.</p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </AppShell>
    )
  }

  if (!myPoints) return null
  const { balance, logs } = myPoints

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <PageHeader title="My Points" />

        <div className="relative mb-6 overflow-hidden rounded-2xl border border-edge bg-gradient-to-br from-accent/20 via-surface to-surface p-8 text-center shadow-glow">
          <p className="mb-1 text-xs uppercase tracking-wider text-zinc-400">Current Balance</p>
          <p className="font-display text-5xl font-bold text-zinc-100">
            <CountUp value={balance} /> <span className="text-2xl text-accent">pts</span>
          </p>
        </div>

        <h3 className="mb-3 font-display text-base font-bold text-zinc-100">Family Leaderboard</h3>
        {leaderboard && leaderboard.length > 0 ? (
          <div className="mb-6">
            <Leaderboard entries={leaderboard} />
          </div>
        ) : (
          <p className="mb-6 text-sm text-zinc-500">No points earned yet.</p>
        )}

        {isParent && (
          <Card className="mb-6 p-6">
            <h3 className="mb-4 font-display text-lg font-bold text-zinc-100">Adjust Points</h3>
            <form onSubmit={handleAdjust} className="space-y-3">
              <div>
                <label htmlFor="user-select" className="mb-1 block text-sm text-zinc-400">User</label>
                <select
                  id="user-select"
                  value={adjustUserId ?? ''}
                  onChange={(e) => setAdjustUserId(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="input"
                >
                  <option value="">Select a user...</option>
                  {userList.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="amount" className="mb-1 block text-sm text-zinc-400">Amount</label>
                <input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Positive to add, negative to deduct"
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="reason" className="mb-1 block text-sm text-zinc-400">Reason</label>
                <input
                  id="reason"
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why this adjustment?"
                  className="input"
                />
              </div>
              {formError && <div className="alert-error">{formError}</div>}
              <div className="flex gap-2">
                <Button type="submit" loading={adjustMutation.isPending}>
                  {adjustMutation.isPending ? 'Adjusting...' : (<><Plus className="h-4 w-4" /> Adjust</>)}
                </Button>
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Clear
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card className="p-0">
          <div className="grid grid-cols-12 gap-4 border-b border-edge px-4 py-3 text-sm text-zinc-500">
            <div className="col-span-3 sm:col-span-2">Date</div>
            <div className="col-span-3 sm:col-span-2">Type</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-4 sm:col-span-6">Reason</div>
          </div>
          {logs.length === 0 ? (
            <div className="px-4 py-8 text-center text-zinc-500">
              No point history yet. Complete a chore to start earning points!
            </div>
          ) : (
            <div className="divide-y divide-edge">
              {logs.map(log => (
                <div key={log.id} className="grid grid-cols-12 items-center gap-4 px-4 py-3 hover:bg-white/5">
                  <div className="col-span-3 text-sm text-zinc-400 sm:col-span-2">{formatDate(log.createdAt)}</div>
                  <div className="col-span-3 sm:col-span-2">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${TYPE_BADGE_CLASS[log.type] ?? 'bg-zinc-500/10 text-zinc-400'}`}>
                      {log.type}
                    </span>
                  </div>
                  <div className={`col-span-2 font-display font-bold ${log.amount > 0 ? 'text-emerald-400' : log.amount < 0 ? 'text-rose-400' : 'text-zinc-100'}`}>
                    {log.amount > 0 ? '+' : ''}{log.amount}
                  </div>
                  <div className="col-span-4 text-sm text-zinc-400 sm:col-span-6">{log.reason}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {successMessage && <Toast kind="success">{successMessage}</Toast>}
    </AppShell>
  )
}
