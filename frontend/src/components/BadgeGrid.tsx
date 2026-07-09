import { GamificationBadge } from '../api/points.api'

export function BadgeGrid({ badges }: { badges: GamificationBadge[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {badges.map(badge => {
        const earned = badge.earnedAt !== null
        return (
          <div
            key={badge.id}
            aria-label={`${badge.name} — ${earned ? 'earned' : 'locked'}`}
            title={badge.description}
            className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-center ${
              earned
                ? 'border-accent/40 bg-accent/10'
                : 'border-edge bg-surface opacity-40 grayscale'
            }`}
          >
            <span className="text-2xl" aria-hidden>
              {badge.emoji}
            </span>
            <span className="text-xs font-medium text-zinc-200">{badge.name}</span>
          </div>
        )
      })}
    </div>
  )
}
