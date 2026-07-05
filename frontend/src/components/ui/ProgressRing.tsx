import { useId } from 'react'

interface ProgressRingProps {
  value: number
  max: number
  size?: number
  label?: string
}

export function ProgressRing({ value, max, size = 96, label }: ProgressRingProps) {
  const gradientId = useId()
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const fraction = max > 0 ? Math.min(value / max, 1) : 0
  const offset = circumference * (1 - fraction)
  return (
    <div className="relative inline-flex items-center justify-center" role="img" aria-label={label ?? `${value} of ${max}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#27272A" strokeWidth="8" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute font-display font-bold text-zinc-100">
        {value}/{max}
      </span>
    </div>
  )
}
