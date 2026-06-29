import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as usersApi from '../api/users.api'

export function useUsers() {
  const queryClient = useQueryClient()
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
    staleTime: 5 * 60 * 1000,
  })

  const createMutation = useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: usersApi.deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  return {
    users,
    isLoading,
    error,
    createUser: (data: Parameters<typeof usersApi.createUser>[0]) =>
      createMutation.mutateAsync(data),
    isCreating: createMutation.isPending,
    deleteUser: (id: number) => deleteMutation.mutateAsync(id),
    isDeleting: deleteMutation.isPending,
  }
}
