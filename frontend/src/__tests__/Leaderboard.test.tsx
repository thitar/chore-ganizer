import { render, screen } from '@testing-library/react'
import { Leaderboard } from '../components/Leaderboard'

const entries = [
  { user: { id: 2, name: 'Alice', color: '#F59E0B', role: 'CHILD' }, balance: 120 },
  { user: { id: 1, name: 'Dad', color: '#3B82F6', role: 'PARENT' }, balance: 30 },
  { user: { id: 3, name: 'Bob', color: '#10B981', role: 'CHILD' }, balance: 0 },
]

describe('Leaderboard', () => {
  it('renders entries in given order with balances', () => {
    render(<Leaderboard entries={entries} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('respects the limit prop', () => {
    render(<Leaderboard entries={entries} limit={2} />)
    expect(screen.queryByText('Bob')).not.toBeInTheDocument()
  })

  it('exposes numeric rank to assistive tech for rows past the medals, while medals stay decorative', () => {
    const fourEntries = [
      ...entries,
      { user: { id: 4, name: 'Eve', color: '#EC4899', role: 'CHILD' }, balance: -10 },
    ]
    render(<Leaderboard entries={fourEntries} />)
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('🥇')).toBeInTheDocument()
  })
})
