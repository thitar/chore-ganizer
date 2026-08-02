import { useQuery } from '@tanstack/react-query'
import * as calendarApi from '../api/calendar.api'

export function useCalendarMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const start = new Date(year, month, 1 - firstDay.getDay())
  const end = new Date(start)
  end.setDate(start.getDate() + 41)
  const from = toDateString(start)
  const to = toDateString(end)

  const query = useQuery({
    queryKey: ['calendar', year, month],
    queryFn: () => calendarApi.getCalendar(from, to),
  })

  return { ...query, from, to }
}

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
