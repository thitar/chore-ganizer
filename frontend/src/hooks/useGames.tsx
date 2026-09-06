import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as gamesApi from '../api/games.api'

export function useGames() {
  return useQuery({
    queryKey: ['games'],
    queryFn: gamesApi.getGames,
    staleTime: 0,
  })
}

export function useSubmitScore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ gameId, score }: { gameId: string; score: number }) => gamesApi.submitScore(gameId, score),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['games'] }),
  })
}
