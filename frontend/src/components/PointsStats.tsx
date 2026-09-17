import { useState } from 'react'
import { Avatar } from './ui/Avatar'
import { Card } from './ui/Card'
import { Skeleton } from './ui/Skeleton'
import { usePointsStats } from '../hooks/usePoints'
import { startOfWeekUTC } from '../utils/dateFormat'

type Period = 'week' | 'month' | 'last30'

const PERIODS: { id: Period; label: string }[] = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'last30', label: 'Last 30 days' },
]

function toDateParam(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function rangeForPeriod(period: Period): { from: string; to: string } {
  const now = new Date()
  const to = toDateParam(now)
  if (period === 'week') return { from: toDateParam(startOfWeekUTC(now)), to }
  if (period === 'month') return { from: toDateParam(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))), to }
  const last30 = new Date(now)
  last30.setUTCDate(last30.getUTCDate() - 29)
  return { from: toDateParam(last30), to }
}

export function PointsStats() {
  const [period, setPeriod] = useState<Period>('week')
  const { from, to } = rangeForPeriod(period)
  const { data, isLoading, isError } = usePointsStats(from, to)

  return (
    <div>
      <h3 className="mb-4 font-display text-base font-bold text-zinc-100">Points stats</h3>
      <div className="mb-3 flex flex-wrap gap-2">
        {PERIODS.map(p => (
          <button
            key={p.id}
            type="button"
            aria-pressed={period === p.id}
            onClick={() => setPeriod(p.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              period === p.id ? 'bg-accent text-zinc-950' : 'bg-surface-raised text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : isError ? (
        <p className="text-sm text-red-400">Couldn&apos;t load points stats.</p>
      ) : !data || data.entries.length === 0 ? (
        <p className="text-sm text-zinc-500">No points earned in this period.</p>
      ) : (
        <Card className="divide-y divide-edge p-0">
          {data.entries.map(entry => (
            <div key={entry.user.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={entry.user.name} color={entry.user.color} size="sm" />
              <span className="flex-1 font-medium text-zinc-200">{entry.user.name}</span>
              <span className="font-display font-bold text-zinc-100">{entry.points}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
