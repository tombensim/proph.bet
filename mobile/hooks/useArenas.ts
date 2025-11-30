import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { arenaApi } from '@/lib/api';

export function useArenas() {
  return useQuery({
    queryKey: ['arenas'],
    queryFn: async () => {
      const response = await arenaApi.getArenas();
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
  });
}

export function useArena(arenaId: string) {
  return useQuery({
    queryKey: ['arena', arenaId],
    queryFn: async () => {
      const response = await arenaApi.getArena(arenaId);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: !!arenaId,
  });
}

export function useArenaLeaderboard(arenaId: string, limit = 50) {
  return useQuery({
    queryKey: ['leaderboard', arenaId, limit],
    queryFn: async () => {
      const response = await arenaApi.getLeaderboard(arenaId, limit);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: !!arenaId,
  });
}

export function useArenaMarkets(arenaId: string, status?: string) {
  return useQuery({
    queryKey: ['markets', arenaId, status],
    queryFn: async () => {
      const response = await arenaApi.getMarkets(arenaId, status);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: !!arenaId,
  });
}
