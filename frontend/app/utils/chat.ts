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

/** Decide whether a date separator should appear above the message. */
export function shouldShowDateSeparator(
  prev: string | undefined,
  current: string,
): boolean {
  if (!prev) return true;
  const a = new Date(prev);
  const b = new Date(current);
  return (
    a.getFullYear() !== b.getFullYear() ||
    a.getMonth() !== b.getMonth() ||
    a.getDate() !== b.getDate()
  );
}

/** Human-friendly date separator (e.g. "Hari ini", "Kemarin", "12 Mei 2026"). */
export function formatDateSeparator(dateString: string): string {
  const d = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (same(d, today)) return 'Hari ini';
  if (same(d, yesterday)) return 'Kemarin';

  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
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
