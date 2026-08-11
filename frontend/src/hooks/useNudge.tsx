import { useMutation } from '@tanstack/react-query'
import * as assignmentsApi from '../api/assignments.api'

export function useNudge() {
  return useMutation({
    mutationFn: ({ id, type }: { id: number; type: 'REGULAR' | 'RECURRING' }) =>
      assignmentsApi.nudgeAssignment(id, type),
  })
}
