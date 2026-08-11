import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useNudge } from '../hooks/useNudge'

vi.mock('../api/assignments.api', () => ({
  nudgeAssignment: vi.fn(),
}))

import * as assignmentsApi from '../api/assignments.api'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useNudge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('calls nudgeAssignment with the chore id and type', async () => {
    ;(assignmentsApi.nudgeAssignment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 5 })

    const { result } = renderHook(() => useNudge(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ id: 5, type: 'REGULAR' })
    })

    expect(assignmentsApi.nudgeAssignment).toHaveBeenCalledWith(5, 'REGULAR')
    expect(result.current.isPending).toBe(false)
  })

  it('surfaces an API error to the caller', async () => {
    ;(assignmentsApi.nudgeAssignment as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useNudge(), { wrapper })

    await act(async () => {
      await expect(result.current.mutateAsync({ id: 5, type: 'REGULAR' })).rejects.toThrow('boom')
    })
  })
})
