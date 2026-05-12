import React from 'react';
import type { Message } from '~/types';
import { formatMessageTime, highlightText } from '~/utils/chat';
import { API_URL } from '~/config';

interface MessageBubbleProps {
  message: Message;
  searchTerm?: string;
  isHighlighted?: boolean;
  onImageClick?: (url: string) => void;
  onRetry?: (clientMessageId: string) => void;
  onDiscard?: (clientMessageId: string) => void;
}

function StatusIcon({ message }: { message: Message }) {
  if (message.sender !== 'admin') return null;
  if (message.status === 'pending') {
    return (
      <span className="msg-status pending" title="Mengirim…">
        🕓
      </span>
    );
  }
  if (message.status === 'failed') {
    return (
      <span className="msg-status failed" title="Gagal terkirim">
        !
      </span>
    );
  }
  // Sent / delivered
  return (
    <span className="msg-status sent" title="Terkirim">
      ✓
    </span>
  );
}

export const MessageBubble = React.memo(function MessageBubble({
  message,
  searchTerm,
  isHighlighted,
  onImageClick,
  onRetry,
  onDiscard,
}: MessageBubbleProps) {
  const parts = searchTerm
    ? highlightText(message.content, searchTerm)
    : [{ text: message.content, highlighted: false }];

  const photoSrc = message.photoUrl
    ? message.photoUrl.startsWith('http') || message.photoUrl.startsWith('blob:')
      ? message.photoUrl
      : `${API_URL}${message.photoUrl}`
    : null;

  const isFailed = message.status === 'failed';
  const isPending = message.status === 'pending';

  return (
    <div
      className={`message ${message.sender} ${
        isHighlighted ? 'search-highlight' : ''
      } ${isPending ? 'is-pending' : ''} ${isFailed ? 'is-failed' : ''}`}
      data-message-id={message.id}
    >
      <div className="message-bubble">
        {photoSrc && (
          <div
            className="message-photo"
            onClick={() => onImageClick?.(photoSrc)}
            role={onImageClick ? 'button' : undefined}
            tabIndex={onImageClick ? 0 : undefined}
          >
            <img src={photoSrc} alt="Photo" loading="lazy" />
          </div>
        )}
        {message.content && message.content !== '[Photo]' && (
          <div className="message-content">
            {parts.map((part, i) =>
              part.highlighted ? (
                <mark key={i} className="search-mark">
                  {part.text}
                </mark>
              ) : (
                <span key={i}>{part.text}</span>
              ),
            )}
          </div>
        )}
        <div className="message-time">
          <span>{formatMessageTime(message.createdAt)}</span>
          <StatusIcon message={message} />
        </div>

        {isFailed && message.clientMessageId && (
          <div className="msg-failed-actions">
            <button
              type="button"
              onClick={() => onRetry?.(message.clientMessageId!)}
              className="msg-failed-btn retry"
            >
              Coba lagi
            </button>
            <button
              type="button"
              onClick={() => onDiscard?.(message.clientMessageId!)}
              className="msg-failed-btn discard"
            >
              Buang
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
