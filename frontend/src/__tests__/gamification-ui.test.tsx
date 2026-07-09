import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { LevelBar } from '../components/LevelBar'
import { BadgeGrid } from '../components/BadgeGrid'
import type { Gamification } from '../api/points.api'

const celebrateMock = vi.hoisted(() => vi.fn())
vi.mock('../lib/celebrate', () => ({ celebrate: celebrateMock }))

const gamificationState: { data: Gamification | undefined } = { data: undefined }
vi.mock('../hooks/usePoints', () => ({
  useGamification: () => ({ data: gamificationState.data }),
}))

describe('LevelBar', () => {
  it('shows level and points toward next threshold', () => {
    render(
      <LevelBar
        level={{ level: 2, lifetimePoints: 85, currentThreshold: 50, nextThreshold: 120, progress: 0.5 }}
      />
    )
    expect(screen.getByText('Level 2')).toBeInTheDocument()
    expect(screen.getByText('85 / 120 pts')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
  })

  it('shows Max level without a next threshold', () => {
    render(
      <LevelBar
        level={{ level: 10, lifetimePoints: 2500, currentThreshold: 2000, nextThreshold: null, progress: 1 }}
      />
    )
    expect(screen.getByText('Level 10')).toBeInTheDocument()
    expect(screen.getByText('Max level')).toBeInTheDocument()
  })
})

describe('BadgeGrid', () => {
  const badges = [
    { id: 'first-chore', name: 'First Chore', description: 'Complete your first chore', emoji: '🎉', earnedAt: '2026-07-01T10:00:00.000Z' },
    { id: 'fifty-chores', name: '50 Chores', description: 'Complete 50 chores', emoji: '🏆', earnedAt: null },
  ]

  it('renders earned and locked badges', () => {
    render(<BadgeGrid badges={badges} />)
    expect(screen.getByText('First Chore')).toBeInTheDocument()
    expect(screen.getByText('50 Chores')).toBeInTheDocument()
    expect(screen.getByLabelText('First Chore — earned')).toBeInTheDocument()
    expect(screen.getByLabelText('50 Chores — locked')).toBeInTheDocument()
  })
})

describe('GamificationMoments', () => {
  it('toasts and celebrates when level increases after baseline', async () => {
    const { GamificationMoments } = await import('../components/GamificationMoments')
    const base: Gamification = {
      streak: 0,
      level: { level: 1, lifetimePoints: 40, currentThreshold: 0, nextThreshold: 50, progress: 0.8 },
      badges: [],
    }
    gamificationState.data = base
    const { rerender } = render(<GamificationMoments />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    gamificationState.data = {
      ...base,
      level: { level: 2, lifetimePoints: 55, currentThreshold: 50, nextThreshold: 120, progress: 0.07 },
    }
    rerender(<GamificationMoments />)
    expect(screen.getByRole('status')).toHaveTextContent('Level 2')
    expect(celebrateMock).toHaveBeenCalled()
  })

  it('toasts when a new badge is earned', async () => {
    celebrateMock.mockClear()
    const { GamificationMoments } = await import('../components/GamificationMoments')
    const level = { level: 1, lifetimePoints: 10, currentThreshold: 0, nextThreshold: 50, progress: 0.2 }
    const lockedBadge = { id: 'first-chore', name: 'First Chore', description: 'Complete your first chore', emoji: '🎉', earnedAt: null }
    gamificationState.data = { streak: 0, level, badges: [lockedBadge] }
    const { rerender } = render(<GamificationMoments />)

    gamificationState.data = {
      streak: 0,
      level,
      badges: [{ ...lockedBadge, earnedAt: '2026-07-07T10:00:00.000Z' }],
    }
    rerender(<GamificationMoments />)
    expect(screen.getByRole('status')).toHaveTextContent('First Chore')
    expect(celebrateMock).toHaveBeenCalled()
  })
})
