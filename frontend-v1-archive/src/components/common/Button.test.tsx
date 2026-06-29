import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('applies primary variant by default', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-primary')
  })

  it('applies secondary variant when specified', () => {
    render(<Button variant="secondary">Click me</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-surface-muted')
  })

  it('applies danger variant when specified', () => {
    render(<Button variant="danger">Click me</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('bg-red-50')
    expect(btn).toHaveClass('text-red-600')
  })

  it('applies ghost variant when specified', () => {
    render(<Button variant="ghost">Click me</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-transparent')
  })

  it('is disabled when loading', () => {
    render(<Button loading>Click me</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows loading spinner when loading', () => {
    render(<Button loading>Click me</Button>)
    expect(screen.getByRole('button').querySelector('svg')).not.toBeNull()
  })

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    screen.getByRole('button').click()
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
