import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../test/utils'
import { ChoreFilters } from './ChoreFilters'

describe('ChoreFilters', () => {
  const mockOnFilterChange = vi.fn()

  beforeEach(() => {
    mockOnFilterChange.mockClear()
  })

  it('renders all filter buttons', () => {
    render(<ChoreFilters currentFilter="all" onFilterChange={mockOnFilterChange} />)
    expect(screen.getByText('All Chores')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('highlights the current filter with primary variant', () => {
    render(<ChoreFilters currentFilter="all" onFilterChange={mockOnFilterChange} />)
    const allButton = screen.getByText('All Chores').closest('button')
    expect(allButton).toHaveClass('bg-blue-600')
  })

  it('applies ghost variant to non-active filters', () => {
    render(<ChoreFilters currentFilter="all" onFilterChange={mockOnFilterChange} />)
    const pendingButton = screen.getByText('Pending').closest('button')
    expect(pendingButton).toHaveClass('bg-transparent')
  })

  it('calls onFilterChange when filter button is clicked', () => {
    render(<ChoreFilters currentFilter="all" onFilterChange={mockOnFilterChange} />)
    fireEvent.click(screen.getByText('Pending'))
    expect(mockOnFilterChange).toHaveBeenCalledWith('PENDING')
  })

  it('updates active filter when different filter is clicked', () => {
    const { rerender } = render(
      <ChoreFilters currentFilter="all" onFilterChange={mockOnFilterChange} />
    )
    
    let allButton = screen.getByText('All Chores').closest('button')
    expect(allButton).toHaveClass('bg-blue-600')
    
    // Simulate filter change
    rerender(
      <ChoreFilters currentFilter="PENDING" onFilterChange={mockOnFilterChange} />
    )
    
    allButton = screen.getByText('All Chores').closest('button')
    const pendingButton = screen.getByText('Pending').closest('button')
    
    expect(allButton).toHaveClass('bg-transparent')
    expect(pendingButton).toHaveClass('bg-blue-600')
  })

  it('renders filters in a flex container', () => {
    const { container } = render(
      <ChoreFilters currentFilter="all" onFilterChange={mockOnFilterChange} />
    )
    const filterContainer = container.querySelector('.flex.gap-2')
    expect(filterContainer).toBeInTheDocument()
  })

  it('renders small buttons', () => {
    render(<ChoreFilters currentFilter="all" onFilterChange={mockOnFilterChange} />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm')
    })
  })
})
