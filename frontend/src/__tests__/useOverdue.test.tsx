import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useOverdue } from '../hooks/useOverdue'

vi.mock('../api/overdue.api', () => ({
  getOverdue: vi.fn(),
  cancelOverdue: vi.fn(),
  rescheduleOverdue: vi.fn(),
}))

import * as overdueApi from '../api/overdue.api'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useOverdue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
    ;(overdueApi.getOverdue as ReturnType<typeof vi.fn>).mockResolvedValue([])
  })

  it('fetches the overdue list', async () => {
    const { result } = renderHook(() => useOverdue(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(overdueApi.getOverdue).toHaveBeenCalled()
    expect(result.current.overdue).toEqual([])
  })

  it('invalidates overdue and points when a cancel applies a penalty', async () => {
    ;(overdueApi.cancelOverdue as ReturnType<typeof vi.fn>).mockResolvedValue({ penaltyPoints: 5 })

    const { result } = renderHook(() => useOverdue(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      await result.current.cancelChore(1, 'REGULAR', 5)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['overdue'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['assignments'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['calendar'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['points'] })
  })

  it('does not invalidate points when the cancel penalty is 0', async () => {
    ;(overdueApi.cancelOverdue as ReturnType<typeof vi.fn>).mockResolvedValue({ penaltyPoints: null })

    const { result } = renderHook(() => useOverdue(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      await result.current.cancelChore(1, 'REGULAR', 0)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['overdue'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['assignments'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['calendar'] })
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['points'] })
  })
})
