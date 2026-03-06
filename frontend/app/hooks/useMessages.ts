import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import {
  fetchMessages,
  sendMessage as apiSendMessage,
  uploadPhoto,
  markUserAsRead,
} from '~/services/api';
import type { Message, MessagesResponse } from '~/types';

export const MESSAGES_QUERY_KEY = 'chat-messages';
const PAGE_SIZE = 20;

export function useMessages(userId: string | null, enabled = true) {
  const queryClient = useQueryClient();
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const markingAsRead = useRef(false);
  const markedUsers = useRef<Set<string>>(new Set());

  // Initial load (latest 20 messages)
  const query = useQuery({
    queryKey: [MESSAGES_QUERY_KEY, userId],
    queryFn: async () => {
      const res = await fetchMessages(userId!, PAGE_SIZE, 0);
      return res;
    },
    enabled: enabled && !!userId,
    staleTime: 0, // Always refetch on user switch
    gcTime: 1000 * 60 * 2,
  });

  // Sync query result into local state (only on first load / user switch)
  const prevUserId = useRef<string | null>(null);
  if (query.data && userId !== prevUserId.current) {
    prevUserId.current = userId;
    setAllMessages(query.data.messages);
    setHasMore(query.data.hasMore);
    setTotal(query.data.total);

    // Auto-mark as read
    if (userId && !markingAsRead.current && !markedUsers.current.has(userId)) {
      const hasUnread = query.data.messages.some(
        (m) => m.sender === 'user' && !m.isRead,
      );
      if (hasUnread) {
        markingAsRead.current = true;
        markedUsers.current.add(userId);
        markUserAsRead(userId)
          .catch(() => markedUsers.current.delete(userId!))
          .finally(() => {
            markingAsRead.current = false;
          });
      }
    }
  }

  // Load older messages (infinite scroll upward)
  const loadMore = useCallback(async () => {
    if (!userId || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetchMessages(userId, PAGE_SIZE, allMessages.length);
      setAllMessages((prev) => [...res.messages, ...prev]);
      setHasMore(res.hasMore);
      setTotal(res.total);
    } finally {
      setIsLoadingMore(false);
    }
  }, [userId, isLoadingMore, hasMore, allMessages.length]);

  // Append a new message (from WS or after send)
  const appendMessage = useCallback((msg: Message) => {
    setAllMessages((prev) => {
      // Deduplicate
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
    setTotal((t) => t + 1);
  }, []);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async ({
      content,
      photoFile,
    }: {
      content: string;
      photoFile?: File | null;
    }) => {
      if (!userId) throw new Error('No user selected');

      let photoUrl: string | undefined;
      if (photoFile) {
        const uploadRes = await uploadPhoto(photoFile);
        photoUrl = uploadRes.url;
      }

      return apiSendMessage(userId, content || '[Photo]', photoUrl);
    },
    onSuccess: (msg) => {
      appendMessage(msg);
    },
  });

  // Reset when switching users
  const reset = useCallback(() => {
    setAllMessages([]);
    setHasMore(false);
    setTotal(0);
    prevUserId.current = null;
  }, []);

  return {
    messages: allMessages,
    isLoading: query.isLoading,
    isLoadingMore,
    hasMore,
    total,
    loadMore,
    appendMessage,
    sendMessage: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
    reset,
  };
}
