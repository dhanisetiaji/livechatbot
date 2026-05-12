import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { fetchUsers } from '~/services/api';
import type { User, Message } from '~/types';

export const USERS_QUERY_KEY = 'chat-users';

export function useUsers(botId: string | null, enabled = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [USERS_QUERY_KEY, botId],
    queryFn: () => fetchUsers(botId || undefined),
    enabled: enabled && !!botId,
    // Reduced fallback poll – primary updates come via WebSocket
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
    select: (data) =>
      [...data].sort((a, b) => {
        const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bTime - aTime;
      }),
  });

  const updateUser = useCallback(
    (userId: string, patch: Partial<User>) => {
      queryClient.setQueryData<User[]>([USERS_QUERY_KEY, botId], (old) => {
        if (!old) return old;
        const updated = old.map((u) => (u.id === userId ? { ...u, ...patch } : u));
        return updated.sort((a, b) => {
          const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
          const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
          return bTime - aTime;
        });
      });
    },
    [queryClient, botId],
  );

  const incrementUnread = useCallback(
    (userId: string) => {
      queryClient.setQueryData<User[]>([USERS_QUERY_KEY, botId], (old) => {
        if (!old) return old;
        return old.map((u) =>
          u.id === userId ? { ...u, unreadCount: u.unreadCount + 1 } : u,
        );
      });
    },
    [queryClient, botId],
  );

  const clearUnread = useCallback(
    (userId: string) => {
      queryClient.setQueryData<User[]>([USERS_QUERY_KEY, botId], (old) => {
        if (!old) return old;
        return old.map((u) =>
          u.id === userId ? { ...u, unreadCount: 0 } : u,
        );
      });
    },
    [queryClient, botId],
  );

  const handleIncomingMessage = useCallback(
    (msg: Message) => {
      const userId = msg.userId || msg.user?.id;
      if (!userId) return;

      updateUser(userId, {
        lastMessage: {
          content: msg.content,
          createdAt: msg.createdAt,
          sender: msg.sender,
        },
        updatedAt: msg.createdAt,
      });
    },
    [updateUser],
  );

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    updateUser,
    incrementUnread,
    clearUnread,
    handleIncomingMessage,
  };
}
