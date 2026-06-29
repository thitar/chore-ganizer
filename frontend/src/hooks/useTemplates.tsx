import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as templatesApi from '../api/templates.api'
import type { Template } from '../api/templates.api'

export function useTemplates() {
  const queryClient = useQueryClient()

  const {
    data: templates = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['templates'],
    queryFn: templatesApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: templatesApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Template> }) =>
      templatesApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: templatesApi.delete_,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  })

  return {
    templates,
    isLoading,
    error,
    createTemplate: (data: Parameters<typeof templatesApi.create>[0]) =>
      createMutation.mutateAsync(data),
    isCreating: createMutation.isPending,
    updateTemplate: (id: number, data: Parameters<typeof templatesApi.update>[1]) =>
      updateMutation.mutateAsync({ id, data }),
    isUpdating: updateMutation.isPending,
    deleteTemplate: (id: number) => deleteMutation.mutateAsync(id),
    isDeleting: deleteMutation.isPending,
  }
}
