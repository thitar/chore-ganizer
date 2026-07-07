import { LeaderboardEntry } from '../api/points.api'
import { Avatar } from './ui/Avatar'
import { Card } from './ui/Card'

const MEDALS = ['🥇', '🥈', '🥉']

export function Leaderboard({ entries, limit }: { entries: LeaderboardEntry[]; limit?: number }) {
  const shown = limit ? entries.slice(0, limit) : entries
  return (
    <Card className="divide-y divide-edge p-0">
      {shown.map((entry, i) => (
        <div key={entry.user.id} className="flex items-center gap-3 px-4 py-3">
          <span className="w-6 text-center">
            {MEDALS[i] ? (
              <>
                <span aria-hidden>{MEDALS[i]}</span>
                <span className="sr-only">{i + 1}</span>
              </>
            ) : (
              <span className="text-sm text-zinc-500">{i + 1}</span>
            )}
          </span>
          <Avatar name={entry.user.name} color={entry.user.color} size="sm" />
          <span className="flex-1 font-medium text-zinc-200">{entry.user.name}</span>
          <span className="font-display font-bold text-zinc-100">
            {entry.balance} <span className="text-xs font-normal text-zinc-500">pts</span>
          </span>
        </div>
      ))}
    </Card>
  )
}
