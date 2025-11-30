import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '@/lib/api';

export function useNotifications(arenaId?: string) {
  return useQuery({
    queryKey: ['notifications', arenaId],
    queryFn: async () => {
      const response = await notificationApi.getNotifications(arenaId);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds?: string[]) => {
      const response = await notificationApi.markRead(notificationIds);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
