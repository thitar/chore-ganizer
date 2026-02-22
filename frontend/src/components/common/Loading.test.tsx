import { describe, it, expect } from 'vitest'
import { render, screen } from '../../test/utils'
import { Loading } from './Loading'

describe('Loading', () => {
  it('renders loading spinner', () => {
    render(<Loading />)
    const spinner = document.querySelector('svg.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('renders text when provided', () => {
    render(<Loading text="Loading chores..." />)
    expect(screen.getByText('Loading chores...')).toBeInTheDocument()
  })

  it('does not render text when not provided', () => {
    render(<Loading />)
    expect(screen.queryByText('Loading')).not.toBeInTheDocument()
  })

  it('applies small size correctly', () => {
    render(<Loading size="sm" />)
    const spinner = document.querySelector('svg.animate-spin')
    expect(spinner).toHaveClass('w-4', 'h-4')
  })

  it('applies medium size by default', () => {
    render(<Loading />)
    const spinner = document.querySelector('svg.animate-spin')
    expect(spinner).toHaveClass('w-8', 'h-8')
  })

  it('applies large size correctly', () => {
    render(<Loading size="lg" />)
    const spinner = document.querySelector('svg.animate-spin')
    expect(spinner).toHaveClass('w-12', 'h-12')
  })

  it('has correct SVG structure', () => {
    render(<Loading />)
    const spinner = document.querySelector('svg.animate-spin')
    expect(spinner).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg')
    expect(spinner).toHaveAttribute('fill', 'none')
    expect(spinner).toHaveAttribute('viewBox', '0 0 24 24')
  })

  it('applies blue color class', () => {
    render(<Loading />)
    const spinner = document.querySelector('svg.animate-spin')
    expect(spinner).toHaveClass('text-blue-600')
  })
})
