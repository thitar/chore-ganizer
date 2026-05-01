import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test/utils'
import type { Mock } from 'vitest'

vi.mock('../hooks', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}))

import { useAuth } from '../hooks'
import client from '../api/client'
import { Settings } from './Settings'

const mockUseAuth = useAuth as Mock
const mockClientGet = client.get as Mock

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ isParent: true, isAuthenticated: true, loading: false })
  })

  it('shows loading state initially', () => {
    mockClientGet.mockReturnValue(new Promise(() => {}))
    render(<Settings />)
    expect(screen.getByText('Loading rate limit status...')).toBeDefined()
  })

  it('displays rate limit status after fetch', async () => {
    mockClientGet.mockResolvedValue({
      data: {
        general: { windowMs: 900000, max: 300, currentCount: 45, windowStart: new Date().toISOString(), disabled: false },
        auth: { windowMs: 900000, max: 100 },
      },
    })
    render(<Settings />)
    await waitFor(() => {
      expect(screen.getByText('General API Limiter')).toBeDefined()
      expect(screen.getByText('45 / 300')).toBeDefined()
    })
  })

  it('shows error message on API failure', async () => {
    mockClientGet.mockRejectedValue({
      response: {
        data: {
          success: false,
          error: { message: 'Failed to fetch', code: 'INTERNAL_ERROR' }
        }
      }
    })
    render(<Settings />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load rate limit status')).toBeDefined()
    })
  })

  it('shows rate limit disabled status', async () => {
    mockClientGet.mockResolvedValue({
      data: {
        general: { windowMs: 900000, max: 300, currentCount: 0, windowStart: new Date().toISOString(), disabled: true },
        auth: { windowMs: 900000, max: 100 },
      },
    })
    render(<Settings />)
    await waitFor(() => {
      expect(screen.getByText('Rate limiting is disabled')).toBeDefined()
    })
  })
})
