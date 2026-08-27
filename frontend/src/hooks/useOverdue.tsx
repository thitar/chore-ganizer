import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as overdueApi from '../api/overdue.api'

export function useOverdue() {
  const queryClient = useQueryClient()

  const {
    data: overdue = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['overdue'],
    queryFn: overdueApi.getOverdue,
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, type, penalty }: { id: number; type: 'REGULAR' | 'RECURRING'; penalty: number }) =>
      overdueApi.cancelOverdue(id, type, penalty),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['overdue'] })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      if ((data.penaltyPoints ?? 0) > 0) {
        queryClient.invalidateQueries({ queryKey: ['points'] })
        queryClient.invalidateQueries({ queryKey: ['points', 'gamification'] })
      }
    },
  })

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, dueDate }: { id: number; dueDate: string }) =>
      overdueApi.rescheduleOverdue(id, dueDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overdue'] })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
    },
  })

  return {
    overdue,
    isLoading,
    error,
    cancelChore: (id: number, type: 'REGULAR' | 'RECURRING', penalty: number) =>
      cancelMutation.mutateAsync({ id, type, penalty }),
    isCancelling: cancelMutation.isPending,
    rescheduleChore: (id: number, dueDate: string) => rescheduleMutation.mutateAsync({ id, dueDate }),
    isRescheduling: rescheduleMutation.isPending,
  }
}
