import { describe, it, expect } from 'vitest'
import { render, screen } from '../../test/utils'
import { PocketMoneyCard } from './PocketMoneyCard'
import type { PointBalance, ProjectedEarnings } from '../../types/pocket-money'

describe('PocketMoneyCard', () => {
  const mockBalance: PointBalance = {
    points: 150,
    monetaryValue: 1.5,
    currency: 'EUR',
  }

  const mockProjected: ProjectedEarnings = {
    currentBalance: 150,
    earnedThisPeriod: 50,
    projectedTotal: 200,
    projectedValue: 2.0,
    currency: 'EUR',
    periodEnd: '2024-12-31T23:59:59.000Z',
  }

  it('renders loading state', () => {
    render(<PocketMoneyCard balance={null} projected={null} isLoading={true} />)
    const skeletonElements = document.querySelectorAll('.animate-pulse')
    expect(skeletonElements.length).toBeGreaterThan(0)
  })

  it('renders empty state when no balance', () => {
    render(<PocketMoneyCard balance={null} projected={null} isLoading={false} />)
    expect(screen.getByText('No pocket money data available')).toBeInTheDocument()
  })

  it('renders balance points', () => {
    render(<PocketMoneyCard balance={mockBalance} projected={null} isLoading={false} />)
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('points')).toBeInTheDocument()
  })

  it('renders monetary value', () => {
    render(<PocketMoneyCard balance={mockBalance} projected={null} isLoading={false} />)
    expect(screen.getByText('€1.50')).toBeInTheDocument()
    expect(screen.getByText('worth')).toBeInTheDocument()
  })

  it('renders card title', () => {
    render(<PocketMoneyCard balance={mockBalance} projected={null} isLoading={false} />)
    expect(screen.getByText('💰 Pocket Money')).toBeInTheDocument()
  })

  it('renders current balance section', () => {
    render(<PocketMoneyCard balance={mockBalance} projected={null} isLoading={false} />)
    expect(screen.getByText('Current Balance')).toBeInTheDocument()
  })

  it('renders value section', () => {
    render(<PocketMoneyCard balance={mockBalance} projected={null} isLoading={false} />)
    expect(screen.getByText('Value')).toBeInTheDocument()
  })

  it('renders projected earnings when provided', () => {
    render(<PocketMoneyCard balance={mockBalance} projected={mockProjected} isLoading={false} />)
    expect(screen.getByText('📈 This Period')).toBeInTheDocument()
  })

  it('does not render projected section when not provided', () => {
    render(<PocketMoneyCard balance={mockBalance} projected={null} isLoading={false} />)
    expect(screen.queryByText('📈 This Period')).not.toBeInTheDocument()
  })

  it('renders earned this period', () => {
    render(<PocketMoneyCard balance={mockBalance} projected={mockProjected} isLoading={false} />)
    expect(screen.getByText('50 pts')).toBeInTheDocument()
  })

  it('renders projected total', () => {
    render(<PocketMoneyCard balance={mockBalance} projected={mockProjected} isLoading={false} />)
    expect(screen.getByText('200 pts')).toBeInTheDocument()
  })

  it('renders projected value', () => {
    render(<PocketMoneyCard balance={mockBalance} projected={mockProjected} isLoading={false} />)
    expect(screen.getByText('€2.00')).toBeInTheDocument()
  })

  it('formats currency correctly for USD', () => {
    const usdBalance: PointBalance = {
      points: 100,
      monetaryValue: 1.0,
      currency: 'USD',
    }
    render(<PocketMoneyCard balance={usdBalance} projected={null} isLoading={false} />)
    expect(screen.getByText('$1.00')).toBeInTheDocument()
  })

  it('formats large numbers with locale separators', () => {
    const largeBalance: PointBalance = {
      points: 1500,
      monetaryValue: 15.0,
      currency: 'EUR',
    }
    render(<PocketMoneyCard balance={largeBalance} projected={null} isLoading={false} />)
    expect(screen.getByText('1,500')).toBeInTheDocument()
  })
})
