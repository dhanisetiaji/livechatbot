import React from 'react';
import type { Message } from '~/types';
import { formatMessageTime, highlightText } from '~/utils/chat';
import { API_URL } from '~/config';

interface MessageBubbleProps {
  message: Message;
  searchTerm?: string;
  isHighlighted?: boolean;
}

export const MessageBubble = React.memo(function MessageBubble({
  message,
  searchTerm,
  isHighlighted,
}: MessageBubbleProps) {
  const parts = searchTerm
    ? highlightText(message.content, searchTerm)
    : [{ text: message.content, highlighted: false }];

  const photoSrc = message.photoUrl
    ? message.photoUrl.startsWith('http')
      ? message.photoUrl
      : `${API_URL}${message.photoUrl}`
    : null;

  return (
    <div
      className={`message ${message.sender} ${isHighlighted ? 'search-highlight' : ''}`}
      data-message-id={message.id}
    >
      <div className="message-bubble">
        {photoSrc && (
          <div className="message-photo">
            <img src={photoSrc} alt="Photo" loading="lazy" />
          </div>
        )}
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
        <div className="message-time">{formatMessageTime(message.createdAt)}</div>
      </div>
    </div>
  );
});
