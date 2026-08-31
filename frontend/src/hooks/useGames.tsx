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

export function useSubmitPongScore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (score: number) => gamesApi.submitScore('PONG', score),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['games'] }),
  })
}

// Scaffolding for #222 — no callers yet (GamesPage still uses useSubmitPongScore).
// useSubmitScore is the generic entry point; useSubmitSnakeScore is a thin wrapper
// so callers can migrate to useSubmitScore({ gameId: 'SNAKE', score }) without churn.
export function useSubmitSnakeScore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (score: number) => gamesApi.submitScore('SNAKE', score),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['games'] }),
  })
}
