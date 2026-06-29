import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as assignmentsApi from '../api/assignments.api'
import * as recurringApi from '../api/recurring.api'

export function useAssignments() {
  const queryClient = useQueryClient()

  const {
    data: assignments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['assignments'],
    queryFn: assignmentsApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: assignmentsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments'] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof assignmentsApi.update>[1] }) =>
      assignmentsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments'] }),
  })

  const completeMutation = useMutation({
    mutationFn: assignmentsApi.complete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments'] }),
  })

  const completeRecurringMutation = useMutation({
    mutationFn: recurringApi.complete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments'] }),
  })

  const uncompleteMutation = useMutation({
    mutationFn: assignmentsApi.uncomplete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: assignmentsApi.delete_,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments'] }),
  })

  return {
    assignments,
    isLoading,
    error,
    createAssignment: (data: Parameters<typeof assignmentsApi.create>[0]) =>
      createMutation.mutateAsync(data),
    isCreating: createMutation.isPending,
    updateAssignment: (id: number, data: Parameters<typeof assignmentsApi.update>[1]) =>
      updateMutation.mutateAsync({ id, data }),
    isUpdating: updateMutation.isPending,
    completeAssignment: (id: number, type?: 'REGULAR' | 'RECURRING') => {
      if (type === 'RECURRING') {
        return completeRecurringMutation.mutateAsync(id)
      }
      return completeMutation.mutateAsync(id)
    },
    isCompleting: completeMutation.isPending || completeRecurringMutation.isPending,
    uncompleteAssignment: (id: number) => uncompleteMutation.mutateAsync(id),
    isUncompleting: uncompleteMutation.isPending,
    deleteAssignment: (id: number) => deleteMutation.mutateAsync(id),
    isDeleting: deleteMutation.isPending,
  }
}
