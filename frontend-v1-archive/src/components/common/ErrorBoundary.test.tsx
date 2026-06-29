import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '../../test/utils'
import { ErrorBoundary } from './ErrorBoundary'

// Suppress console.error for cleaner test output
const originalError = console.error

describe('ErrorBoundary', () => {
  beforeEach(() => {
    console.error = vi.fn()
  })

  afterEach(() => {
    console.error = originalError
  })

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('renders default error UI when error occurs', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('An unexpected error occurred. Please try refreshing the page.')).toBeInTheDocument()
  })

  it('renders custom fallback when provided and error occurs', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary fallback={<div>Custom Error UI</div>}>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom Error UI')).toBeInTheDocument()
  })

  it('displays error message in details', () => {
    const ThrowError = () => {
      throw new Error('Specific error message')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Error details')).toBeInTheDocument()
    expect(screen.getByText('Specific error message')).toBeInTheDocument()
  })

  it('renders refresh button', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Refresh Page')).toBeInTheDocument()
  })

  it('calls window.location.reload when refresh button is clicked', () => {
    const mockReload = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    })

    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    fireEvent.click(screen.getByText('Refresh Page'))
    expect(mockReload).toHaveBeenCalledTimes(1)
  })

  it('logs error to console', () => {
    const consoleSpy = vi.spyOn(console, 'error')

    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(consoleSpy).toHaveBeenCalled()
  })
})
