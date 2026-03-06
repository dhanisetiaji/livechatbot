/**
 * Shared utility helpers for the chat UI.
 */

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  if (diffHours < 24 * 7) {
    return date.toLocaleDateString('id-ID', { weekday: 'short' });
  }

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
  });
}

export function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.charAt(0) || '';
  const l = lastName?.charAt(0) || '';
  return (f + l).toUpperCase() || '?';
}

/**
 * Highlights portions of `text` that match `term`.
 * Returns an array of React-compatible spans.
 */
export function highlightText(
  text: string,
  term: string,
): Array<{ text: string; highlighted: boolean }> {
  if (!term.trim()) return [{ text, highlighted: false }];

  const parts: Array<{ text: string; highlighted: boolean }> = [];
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  let lastIdx = 0;

  let idx = lowerText.indexOf(lowerTerm, lastIdx);
  while (idx !== -1) {
    if (idx > lastIdx) {
      parts.push({ text: text.slice(lastIdx, idx), highlighted: false });
    }
    parts.push({
      text: text.slice(idx, idx + term.length),
      highlighted: true,
    });
    lastIdx = idx + term.length;
    idx = lowerText.indexOf(lowerTerm, lastIdx);
  }

  if (lastIdx < text.length) {
    parts.push({ text: text.slice(lastIdx), highlighted: false });
  }

  return parts.length ? parts : [{ text, highlighted: false }];
}
