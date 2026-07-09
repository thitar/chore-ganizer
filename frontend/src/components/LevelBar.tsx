import { Gamification } from '../api/points.api'

export function LevelBar({ level }: { level: Gamification['level'] }) {
  const pct = Math.round(level.progress * 100)
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-display text-sm font-bold text-zinc-100">Level {level.level}</span>
        <span className="text-xs text-zinc-500">
          {level.nextThreshold === null
            ? 'Max level'
            : `${level.lifetimePoints} / ${level.nextThreshold} pts`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Level ${level.level} progress`}
        className="h-2 overflow-hidden rounded-full bg-surface-raised"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-to transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
