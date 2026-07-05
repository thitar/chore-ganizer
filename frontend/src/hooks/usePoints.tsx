import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as pointsApi from '../api/points.api'
import { getLeaderboard } from '../api/points.api'

export function useMyPoints() {
  return useQuery({
    queryKey: ['points', 'me'],
    queryFn: pointsApi.getMyPoints,
  })
}

export function useUserPoints(userId: number | null) {
  return useQuery({
    queryKey: ['points', 'user', userId],
    queryFn: () => pointsApi.getUserPoints(userId!),
    enabled: userId !== null,
  })
}

export function useAdjustPoints() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, amount, reason }: { userId: number; amount: number; reason: string }) =>
      pointsApi.adjustPoints(userId, amount, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points'] })
    },
  })
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ['points', 'leaderboard'],
    queryFn: getLeaderboard,
  })
}
