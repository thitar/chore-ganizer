import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as recurringApi from '../api/recurring.api'

export function useRecurringChores() {
  const queryClient = useQueryClient()

  const {
    data: recurringChores = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['recurring-chores'],
    queryFn: recurringApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: recurringApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-chores'] })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: recurringApi.delete_,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-chores'] })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
    },
  })

  return {
    recurringChores,
    isLoading,
    error,
    createRecurringChore: (data: Parameters<typeof recurringApi.create>[0]) =>
      createMutation.mutateAsync(data),
    isCreating: createMutation.isPending,
    deleteRecurringChore: (id: number) => deleteMutation.mutateAsync(id),
    isDeleting: deleteMutation.isPending,
  }
}
