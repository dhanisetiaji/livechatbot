import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchMessages,
  sendMessage as apiSendMessage,
  uploadPhoto,
  markUserAsRead,
} from '~/services/api';
import type { Message, MessagesResponse } from '~/types';

export const MESSAGES_QUERY_KEY = 'chat-messages';
const PAGE_SIZE = 20;

function genClientId() {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useMessages(userId: string | null, enabled = true) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const markedUsers = useRef<Set<string>>(new Set());

  // Initial load (latest PAGE_SIZE)
  const query = useQuery({
    queryKey: [MESSAGES_QUERY_KEY, userId],
    queryFn: () => fetchMessages(userId!, PAGE_SIZE, 0),
    enabled: enabled && !!userId,
    staleTime: 0,
    gcTime: 1000 * 60 * 2,
  });

  // Sync the query data into local state when the user (or fetched page) changes.
  useEffect(() => {
    if (!userId) {
      setMessages([]);
      setHasMore(false);
      setTotal(0);
      return;
    }
    if (!query.data) return;

    setMessages(query.data.messages);
    setHasMore(query.data.hasMore);
    setTotal(query.data.total);

    if (!markedUsers.current.has(userId)) {
      const hasUnread = query.data.messages.some(
        (m) => m.sender === 'user' && !m.isRead,
      );
      if (hasUnread) {
        markedUsers.current.add(userId);
        markUserAsRead(userId).catch(() => markedUsers.current.delete(userId));
      }
    }
  }, [userId, query.data]);

  // Load older messages (upward infinite scroll)
  const loadMore = useCallback(async () => {
    if (!userId || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const res: MessagesResponse = await fetchMessages(
        userId,
        PAGE_SIZE,
        messages.filter((m) => m.status !== 'pending').length,
      );
      setMessages((prev) => {
        const known = new Set(prev.map((m) => m.id));
        const olderUnique = res.messages.filter((m) => !known.has(m.id));
        return [...olderUnique, ...prev];
      });
      setHasMore(res.hasMore);
      setTotal(res.total);
    } finally {
      setIsLoadingMore(false);
    }
  }, [userId, isLoadingMore, hasMore, messages]);

  // Append message from socket. Dedup by id + reconcile pending by clientMessageId.
  const appendMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (msg.clientMessageId) {
        const idx = prev.findIndex((m) => m.clientMessageId === msg.clientMessageId);
        if (idx >= 0) {
          const next = prev.slice();
          next[idx] = { ...msg, status: 'sent' };
          return next;
        }
      }
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
    setTotal((t) => t + 1);
  }, []);

  // Mark all messages for the current user as read (in local state).
  const markAllRead = useCallback(() => {
    setMessages((prev) =>
      prev.some((m) => !m.isRead)
        ? prev.map((m) => (m.isRead ? m : { ...m, isRead: true }))
        : prev,
    );
  }, []);

  // Send message with optimistic UI.
  const sendMutation = useMutation({
    mutationFn: async ({
      content,
      photoFile,
    }: {
      content: string;
      photoFile?: File | null;
    }) => {
      if (!userId) throw new Error('No user selected');

      const clientMessageId = genClientId();
      let photoUrl: string | undefined;
      let photoPreview: string | undefined;

      if (photoFile) {
        photoPreview = URL.createObjectURL(photoFile);
      }

      // Optimistic insert
      const optimistic: Message = {
        id: clientMessageId,
        clientMessageId,
        content: content || (photoFile ? '[Photo]' : ''),
        sender: 'admin',
        isRead: true,
        createdAt: new Date().toISOString(),
        photoUrl: photoPreview ?? null,
        userId: userId,
        status: 'pending',
      };
      setMessages((prev) => [...prev, optimistic]);
      setTotal((t) => t + 1);

      try {
        if (photoFile) {
          const uploadRes = await uploadPhoto(photoFile);
          photoUrl = uploadRes.url;
        }
        const saved = await apiSendMessage(
          userId,
          content || '[Photo]',
          photoUrl,
          clientMessageId,
        );

        // Reconcile optimistic with server result
        setMessages((prev) =>
          prev.map((m) =>
            m.clientMessageId === clientMessageId
              ? { ...saved, clientMessageId, status: 'sent' }
              : m,
          ),
        );

        if (photoPreview) URL.revokeObjectURL(photoPreview);
        return saved;
      } catch (err) {
        // Mark as failed instead of removing — let user retry
        setMessages((prev) =>
          prev.map((m) =>
            m.clientMessageId === clientMessageId ? { ...m, status: 'failed' } : m,
          ),
        );
        throw err;
      }
    },
  });

  // Retry a failed message
  const retryMessage = useCallback(
    async (clientMessageId: string) => {
      const failed = messages.find((m) => m.clientMessageId === clientMessageId);
      if (!failed || !userId) return;
      setMessages((prev) =>
        prev.filter((m) => m.clientMessageId !== clientMessageId),
      );
      try {
        await sendMutation.mutateAsync({ content: failed.content, photoFile: null });
      } catch {
        /* mutation handles state */
      }
    },
    [messages, userId, sendMutation],
  );

  // Discard a failed optimistic message
  const discardMessage = useCallback((clientMessageId: string) => {
    setMessages((prev) => prev.filter((m) => m.clientMessageId !== clientMessageId));
    setTotal((t) => Math.max(0, t - 1));
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setHasMore(false);
    setTotal(0);
  }, []);

  // Clean up "marked read" memory when the user changes – allow re-mark on revisit
  useEffect(() => {
    return () => {
      if (userId) markedUsers.current.delete(userId);
    };
  }, [userId]);

  return {
    messages,
    isLoading: query.isLoading,
    isLoadingMore,
    hasMore,
    total,
    loadMore,
    appendMessage,
    markAllRead,
    sendMessage: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
    retryMessage,
    discardMessage,
    reset,
  };
}
