import { useState, useEffect } from 'react'
import { useMyPoints, useAdjustPoints } from '../hooks/usePoints'
import { useUsers } from '../hooks/useUsers'
import { useAuth } from '../hooks/useAuth'
import { NavBar } from '../components/NavBar'
import { Plus } from 'lucide-react'

const TYPE_BADGE_CLASS: Record<string, string> = {
  EARNED: 'bg-green-100 text-green-800',
  BONUS: 'bg-blue-100 text-blue-800',
  DEDUCTION: 'bg-red-100 text-red-800',
  PENALTY: 'bg-red-100 text-red-800',
  REVERSED: 'bg-gray-100 text-gray-600',
  ADJUSTMENT: 'bg-purple-100 text-purple-800',
  PAYOUT: 'bg-yellow-100 text-yellow-800',
  ADVANCE: 'bg-indigo-100 text-indigo-800',
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
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          <span className="ml-3 text-gray-500">Loading points...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">Unable to load points. Check your connection and try again.</p>
          <button onClick={() => window.location.reload()} className="bg-primary text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-primary-hover">
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!myPoints) return null
  const { balance, logs } = myPoints

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">My Points</h2>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-center">
          <p className="text-sm font-normal text-gray-500 mb-1">Current Balance</p>
          <p className="text-4xl font-bold text-primary">{balance} pts</p>
        </div>

        {isParent && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Adjust Points</h3>
            <form onSubmit={handleAdjust} className="space-y-3">
              <div>
                <label htmlFor="user-select" className="block text-sm font-normal text-gray-700 mb-1">User</label>
                <select
                  id="user-select"
                  value={adjustUserId ?? ''}
                  onChange={(e) => setAdjustUserId(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring bg-white"
                >
                  <option value="">Select a user...</option>
                  {userList.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="amount" className="block text-sm font-normal text-gray-700 mb-1">Amount</label>
                <input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Positive to add, negative to deduct"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring"
                />
              </div>
              <div>
                <label htmlFor="reason" className="block text-sm font-normal text-gray-700 mb-1">Reason</label>
                <input
                  id="reason"
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why this adjustment?"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring"
                />
              </div>
              {formError && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{formError}</div>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={adjustMutation.isPending}
                  className="bg-primary text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-primary-hover disabled:opacity-50 flex items-center gap-1"
                >
                  {adjustMutation.isPending ? 'Adjusting...' : (<><Plus className="h-4 w-4" /> Adjust</>)}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md">
          <div className="bg-gray-50 px-4 py-3 border-b text-sm font-normal text-gray-500 grid grid-cols-12 gap-4">
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-6">Reason</div>
          </div>
          {logs.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No point history yet. Complete a chore to start earning points!
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => (
                <div key={log.id} className="px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-gray-50">
                  <div className="col-span-2 text-sm text-gray-600">{formatDate(log.createdAt)}</div>
                  <div className="col-span-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-normal ${TYPE_BADGE_CLASS[log.type] ?? 'bg-gray-100 text-gray-800'}`}>
                      {log.type}
                    </span>
                  </div>
                  <div className={`col-span-2 font-bold ${log.amount > 0 ? 'text-green-600' : log.amount < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {log.amount > 0 ? '+' : ''}{log.amount}
                  </div>
                  <div className="col-span-6 text-sm text-gray-600">{log.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 text-green-700 px-4 py-2 rounded-lg shadow-md">
          {successMessage}
        </div>
      )}
    </div>
  )
}
