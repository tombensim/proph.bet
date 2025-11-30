import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketApi, arenaApi } from '@/lib/api';

export function useMarket(marketId: string) {
  return useQuery({
    queryKey: ['market', marketId],
    queryFn: async () => {
      const response = await marketApi.getMarket(marketId);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    enabled: !!marketId,
  });
}

export function useCreateMarket(arenaId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      type: string;
      resolutionDate: string;
      options?: { value: string }[];
    }) => {
      const response = await arenaApi.createMarket(arenaId, data);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markets', arenaId] });
    },
  });
}

export function useResolveMarket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      marketId,
      winningOptionId,
      winningValue,
    }: {
      marketId: string;
      winningOptionId?: string;
      winningValue?: number;
    }) => {
      const response = await marketApi.resolveMarket(marketId, {
        winningOptionId,
        winningValue,
      });
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['market', variables.marketId] });
      queryClient.invalidateQueries({ queryKey: ['markets'] });
    },
  });
}
