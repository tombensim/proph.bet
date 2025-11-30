import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { betApi } from '@/lib/api';

export function useBets(arenaId?: string) {
  return useQuery({
    queryKey: ['bets', arenaId],
    queryFn: async () => {
      const response = await betApi.getBets(arenaId);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
  });
}

export function usePlaceBet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      marketId: string;
      amount: number;
      optionId?: string;
      numericValue?: number;
      idempotencyKey?: string;
    }) => {
      const response = await betApi.placeBet(data);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['market', variables.marketId] });
      queryClient.invalidateQueries({ queryKey: ['bets'] });
      queryClient.invalidateQueries({ queryKey: ['arenas'] }); // Refresh points
    },
  });
}
