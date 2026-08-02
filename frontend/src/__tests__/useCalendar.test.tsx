import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { useCalendarMonth } from '../hooks/useCalendar'
import * as calendarApi from '../api/calendar.api'

vi.mock('../api/calendar.api', () => ({
  getCalendar: vi.fn().mockResolvedValue([]),
}))

function createWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useCalendarMonth', () => {
  it('fetches the complete visible calendar grid, including adjacent-month days', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    renderHook(() => useCalendarMonth(2026, 5), { wrapper: createWrapper(queryClient) })

    await waitFor(() => {
      expect(calendarApi.getCalendar).toHaveBeenCalledWith('2026-05-31', '2026-07-11')
    })
  })
})
