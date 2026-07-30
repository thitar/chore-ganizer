import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as gamesApi from '../api/games.api'

export function useGames() {
  return useQuery({
    queryKey: ['games'],
    queryFn: gamesApi.getGames,
    staleTime: 0,
  })
}

export function useSubmitPongScore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: gamesApi.submitPongScore,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['games'] }),
  })
}
