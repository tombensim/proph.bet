import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { arenaApi } from '@/lib/api';

export interface CreateMarketData {
  title: string;
  description?: string;
  type: 'BINARY' | 'MULTIPLE_CHOICE' | 'NUMERIC_RANGE';
  resolutionDate: string;
  options?: string[];
  assets?: { type: string; url: string }[];
}

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

export function useCreateMarket(arenaId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMarketData) => {
      const response = await arenaApi.createMarket(arenaId, data);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate markets list to refetch
      queryClient.invalidateQueries({ queryKey: ['markets', arenaId] });
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
