import React, { useRef, useEffect, useCallback, useState, useLayoutEffect } from 'react';
import type { Message, SearchMatch } from '~/types';
import { MessageBubble } from './MessageBubble';
import { shouldShowDateSeparator, formatDateSeparator } from '~/utils/chat';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => Promise<void>;
  onImageClick?: (url: string) => void;
  onRetry?: (clientMessageId: string) => void;
  onDiscard?: (clientMessageId: string) => void;
  searchTerm?: string;
  currentMatch?: SearchMatch | null;
}

const NEAR_BOTTOM_PX = 120;

export const MessageList = React.memo(function MessageList({
  messages,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  onImageClick,
  onRetry,
  onDiscard,
  searchTerm,
  currentMatch,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll lifecycle state
  const isInitialScroll = useRef(true);
  const prevMessageIds = useRef<string[]>([]);
  const prevScrollHeight = useRef(0);
  const lastSeenId = useRef<string | null>(null);

  const [isNearBottom, setIsNearBottom] = useState(true);
  const [unreadBelow, setUnreadBelow] = useState(0);

  // ── Detect "near bottom" on scroll ─────────────────────────────
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distFromBottom < NEAR_BOTTOM_PX;
    setIsNearBottom(near);
    if (near) setUnreadBelow(0);

    // Infinite scroll up
    if (el.scrollTop < 80 && hasMore && !isLoadingMore) {
      prevScrollHeight.current = el.scrollHeight;
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  // ── React to new messages ──────────────────────────────────────
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) {
      prevMessageIds.current = messages.map((m) => m.id);
      return;
    }

    const prevIds = prevMessageIds.current;
    const currentIds = messages.map((m) => m.id);
    const addedAtTop =
      prevIds.length > 0 &&
      currentIds.length > prevIds.length &&
      currentIds[0] !== prevIds[0] &&
      currentIds[currentIds.length - 1] === prevIds[prevIds.length - 1];
    const addedAtBottom =
      prevIds.length > 0 &&
      currentIds.length > prevIds.length &&
      currentIds[currentIds.length - 1] !== prevIds[prevIds.length - 1];

    if (isInitialScroll.current && messages.length > 0) {
      // First paint – jump straight to bottom (no smooth)
      el.scrollTop = el.scrollHeight;
      isInitialScroll.current = false;
      lastSeenId.current = currentIds[currentIds.length - 1] ?? null;
    } else if (addedAtTop && prevScrollHeight.current > 0) {
      // Older messages prepended – preserve viewport position
      const newHeight = el.scrollHeight;
      el.scrollTop = newHeight - prevScrollHeight.current;
      prevScrollHeight.current = 0;
    } else if (addedAtBottom) {
      const last = messages[messages.length - 1];
      if (isNearBottom || last?.sender === 'admin') {
        // User is at/near bottom OR sent the message – auto-scroll
        el.scrollTop = el.scrollHeight;
        lastSeenId.current = last.id;
      } else {
        // User is reading history – don't yank scroll, bump pill
        setUnreadBelow((n) => n + (currentIds.length - prevIds.length));
      }
    }

    prevMessageIds.current = currentIds;
  }, [messages, isNearBottom]);

  // Reset state when messages are cleared (user switch)
  useEffect(() => {
    if (messages.length === 0) {
      isInitialScroll.current = true;
      prevMessageIds.current = [];
      prevScrollHeight.current = 0;
      lastSeenId.current = null;
      setUnreadBelow(0);
      setIsNearBottom(true);
    }
  }, [messages.length]);

  // Scroll to a search-match
  useEffect(() => {
    if (!currentMatch || !containerRef.current) return;
    const el = containerRef.current.querySelector(
      `[data-message-id="${currentMatch.messageId}"]`,
    );
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentMatch]);

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setUnreadBelow(0);
  }, []);

  if (isLoading) {
    return (
      <div className="messages-container">
        <div className="messages-skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`skeleton-bubble ${i % 2 === 0 ? 'left' : 'right'}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="messages-wrap">
      <div className="messages-container" ref={containerRef} onScroll={handleScroll}>
        {isLoadingMore && (
          <div className="load-more-indicator">
            <div className="loading-spinner small" />
            Memuat pesan lama…
          </div>
        )}
        {!isLoadingMore && hasMore && (
          <div className="load-more-indicator">
            <button className="btn-load-more" onClick={onLoadMore}>
              ↑ Muat pesan sebelumnya
            </button>
          </div>
        )}

        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const showDate = shouldShowDateSeparator(prev?.createdAt, msg.createdAt);
          return (
            <React.Fragment key={msg.clientMessageId || msg.id}>
              {showDate && (
                <div className="date-separator">
                  <span>{formatDateSeparator(msg.createdAt)}</span>
                </div>
              )}
              <MessageBubble
                message={msg}
                searchTerm={searchTerm}
                isHighlighted={currentMatch?.messageId === msg.id}
                onImageClick={onImageClick}
                onRetry={onRetry}
                onDiscard={onDiscard}
              />
            </React.Fragment>
          );
        })}

        {messages.length === 0 && !isLoading && (
          <div className="messages-loading">Belum ada pesan</div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Scroll-to-bottom pill */}
      {(!isNearBottom || unreadBelow > 0) && (
        <button
          className={`scroll-bottom-pill ${unreadBelow > 0 ? 'has-unread' : ''}`}
          onClick={scrollToBottom}
          aria-label="Scroll ke bawah"
          title="Scroll ke bawah"
        >
          {unreadBelow > 0 && (
            <span className="scroll-bottom-badge">{unreadBelow}</span>
          )}
          ↓
        </button>
      )}
    </div>
  );
});
