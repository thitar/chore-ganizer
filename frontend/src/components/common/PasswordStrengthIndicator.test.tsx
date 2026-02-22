import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../test/utils'
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator'

describe('PasswordStrengthIndicator', () => {
  it('does not render when password is empty', () => {
    render(<PasswordStrengthIndicator password="" />)
    expect(screen.queryByText('Password strength')).not.toBeInTheDocument()
  })

  it('renders when password is provided', () => {
    render(<PasswordStrengthIndicator password="test" />)
    expect(screen.getByText('Password strength')).toBeInTheDocument()
  })

  it('shows Very Weak for very weak password', () => {
    render(<PasswordStrengthIndicator password="a" />)
    expect(screen.getByText('Very Weak')).toBeInTheDocument()
  })

  it('shows Weak for weak password', () => {
    // "ab" only meets lowercase = 1 requirement = Very Weak
    // Let's use a password that meets 2 requirements for Weak
    render(<PasswordStrengthIndicator password="ab1" />)
    // Meets: lowercase, number = 2 requirements = Weak
    expect(screen.getByText('Weak')).toBeInTheDocument()
  })

  it('shows Fair for fair password', () => {
    // "Abc1" meets: uppercase, lowercase, number = 3 requirements = Fair
    render(<PasswordStrengthIndicator password="Abc1" />)
    expect(screen.getByText('Fair')).toBeInTheDocument()
  })

  it('shows Good for good password', () => {
    // Need 4 requirements met for Good
    // "Abcd1234" meets: 8 chars, uppercase, lowercase, number (no special) = 4 = Good
    render(<PasswordStrengthIndicator password="Abcd1234" />)
    expect(screen.getByText('Good')).toBeInTheDocument()
  })

  it('shows Strong for strong password', () => {
    // Need all 5 requirements met for Strong
    // "Abcd123!" has only 7 chars, so it doesn't meet 8 char requirement
    // Let's use a password that meets all 5 requirements
    render(<PasswordStrengthIndicator password="Abcd1234!" />)
    // Meets: 8+ chars, uppercase, lowercase, number, special = 5 = Strong
    expect(screen.getByText('Strong')).toBeInTheDocument()
  })

  it('displays all password requirements', () => {
    render(<PasswordStrengthIndicator password="test" />)
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument()
    expect(screen.getByText('At least one uppercase letter')).toBeInTheDocument()
    expect(screen.getByText('At least one lowercase letter')).toBeInTheDocument()
    expect(screen.getByText('At least one number')).toBeInTheDocument()
    expect(screen.getByText('At least one special character')).toBeInTheDocument()
  })

  it('calls onStrengthChange with correct percentage', () => {
    const handleStrengthChange = vi.fn()
    render(<PasswordStrengthIndicator password="Abcd123!" onStrengthChange={handleStrengthChange} />)
    expect(handleStrengthChange).toHaveBeenCalledWith(100)
  })

  it('calls onStrengthChange with partial percentage for weak password', () => {
    const handleStrengthChange = vi.fn()
    render(<PasswordStrengthIndicator password="a" onStrengthChange={handleStrengthChange} />)
    // Only lowercase letter requirement met = 20%
    expect(handleStrengthChange).toHaveBeenCalledWith(20)
  })

  it('shows checkmark for met requirements', () => {
    render(<PasswordStrengthIndicator password="Abcd123!" />)
    const checkIcons = document.querySelectorAll('svg.text-green-500')
    expect(checkIcons.length).toBe(5)
  })

  it('shows X for unmet requirements', () => {
    render(<PasswordStrengthIndicator password="a" />)
    const xIcons = document.querySelectorAll('svg.text-gray-300')
    expect(xIcons.length).toBe(4) // 4 unmet requirements
  })

  it('applies correct color class for strength bar', () => {
    const { rerender } = render(<PasswordStrengthIndicator password="a" />)
    let strengthBar = document.querySelector('.h-full.transition-all')
    expect(strengthBar).toHaveClass('bg-red-500')

    rerender(<PasswordStrengthIndicator password="Abcd123!" />)
    strengthBar = document.querySelector('.h-full.transition-all')
    expect(strengthBar).toHaveClass('bg-green-500')
  })

  it('sets correct width for strength bar', () => {
    render(<PasswordStrengthIndicator password="Abcd123!" />)
    const strengthBar = document.querySelector('.h-full.transition-all')
    expect(strengthBar).toHaveStyle({ width: '100%' })
  })
})
