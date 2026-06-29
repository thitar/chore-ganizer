import { useQuery } from '@tanstack/react-query'
import * as calendarApi from '../api/calendar.api'

export function useCalendarMonth(year: number, month: number) {
  const from = new Date(year, month, 1).toISOString().split('T')[0]
  const to = new Date(year, month + 1, 0).toISOString().split('T')[0]

  const query = useQuery({
    queryKey: ['calendar', year, month],
    queryFn: () => calendarApi.getCalendar(from, to),
  })

  return { ...query, from, to }
}
