import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { CountUp } from '../components/ui/CountUp'
import { ProgressRing } from '../components/ui/ProgressRing'

// jsdom has no matchMedia — simulate reduced motion so values render instantly.
function mockMatchMedia(reduced: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
  window.matchMedia = globalThis.matchMedia as typeof window.matchMedia
}

describe('CountUp', () => {
  it('renders the final value immediately under reduced motion', () => {
    mockMatchMedia(true)
    render(<CountUp value={42} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })
})

describe('ProgressRing', () => {
  it('exposes progress via aria-label', () => {
    mockMatchMedia(true)
    render(<ProgressRing value={4} max={6} />)
    expect(screen.getByRole('img', { name: '4 of 6' })).toBeInTheDocument()
  })
})
