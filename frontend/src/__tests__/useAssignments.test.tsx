import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { useAssignments } from '../hooks/useAssignments'

vi.mock('../api/assignments.api', () => ({
  getAll: vi.fn().mockResolvedValue([]),
  create: vi.fn(),
  update: vi.fn(),
  complete: vi.fn().mockResolvedValue({}),
  uncomplete: vi.fn(),
  delete_: vi.fn(),
}))

vi.mock('../api/recurring.api', () => ({
  complete: vi.fn(),
}))

function createWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useAssignments', () => {
  it('invalidates games eligibility after completing a regular chore', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useAssignments(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await result.current.completeAssignment(42)

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['games'] })
  })

  it('invalidates games eligibility after completing a recurring chore', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useAssignments(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await result.current.completeAssignment(42, 'RECURRING')

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['games'] })
  })
})
