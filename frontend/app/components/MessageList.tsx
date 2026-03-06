import React, { useRef, useEffect, useCallback } from 'react';
import type { Message, SearchMatch } from '~/types';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => Promise<void>;
  searchTerm?: string;
  currentMatch?: SearchMatch | null;
}

export const MessageList = React.memo(function MessageList({
  messages,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  searchTerm,
  currentMatch,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isInitialScroll = useRef(true);
  const prevMessageCount = useRef(messages.length);
  const prevScrollHeight = useRef(0);

  // Scroll to bottom on initial load or new messages appended at bottom
  useEffect(() => {
    if (!containerRef.current || messages.length === 0) return;

    const wasAtBottom = prevMessageCount.current < messages.length;
    const wasLoadMore = messages.length - prevMessageCount.current > 1 && prevScrollHeight.current > 0;

    if (isInitialScroll.current) {
      // First load – jump to bottom instantly
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      isInitialScroll.current = false;
    } else if (wasLoadMore) {
      // Older messages prepended – maintain scroll position
      const newHeight = containerRef.current.scrollHeight;
      containerRef.current.scrollTop = newHeight - prevScrollHeight.current;
    } else if (wasAtBottom) {
      // New message at bottom – smooth scroll
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    prevMessageCount.current = messages.length;
    prevScrollHeight.current = containerRef.current.scrollHeight;
  }, [messages]);

  // Scroll to matched message when search navigation changes
  useEffect(() => {
    if (!currentMatch || !containerRef.current) return;

    const el = containerRef.current.querySelector(
      `[data-message-id="${currentMatch.messageId}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentMatch]);

  // Infinite scroll upward
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (el.scrollTop < 80 && hasMore && !isLoadingMore) {
      prevScrollHeight.current = el.scrollHeight;
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  // Reset initial scroll flag when messages are cleared (user switch)
  useEffect(() => {
    if (messages.length === 0) {
      isInitialScroll.current = true;
      prevMessageCount.current = 0;
      prevScrollHeight.current = 0;
    }
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="messages-container">
        <div className="messages-loading">
          <div className="loading-spinner" />
          Memuat pesan...
        </div>
      </div>
    );
  }

  return (
    <div className="messages-container" ref={containerRef} onScroll={handleScroll}>
      {/* Load more indicator */}
      {isLoadingMore && (
        <div className="load-more-indicator">
          <div className="loading-spinner small" />
          Memuat pesan lama...
        </div>
      )}
      {!isLoadingMore && hasMore && (
        <div className="load-more-indicator">
          <button className="btn-load-more" onClick={onLoadMore}>
            ↑ Muat pesan sebelumnya
          </button>
        </div>
      )}

      {/* Messages */}
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          searchTerm={searchTerm}
          isHighlighted={currentMatch?.messageId === msg.id}
        />
      ))}

      {messages.length === 0 && !isLoading && (
        <div className="messages-loading">Belum ada pesan</div>
      )}

      <div ref={bottomRef} />
    </div>
  );
});
