import { useState, useCallback, useMemo } from 'react';
import type { Message, SearchMatch } from '~/types';

interface UseChatSearchOptions {
  messages: Message[];
}

/**
 * Client-side search within the currently loaded messages.
 * Returns matching indices and provides navigation (next/prev)
 * so the UI can scroll to each match and highlight it.
 */
export function useChatSearch({ messages }: UseChatSearchOptions) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);

  // All matches in display order
  const matches: SearchMatch[] = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return messages
      .map((m, idx) => ({ messageId: m.id, index: idx }))
      .filter(({ index }) =>
        messages[index].content.toLowerCase().includes(term),
      );
  }, [messages, searchTerm]);

  const currentMatch = matches[activeMatchIdx] ?? null;

  const goToNextMatch = useCallback(() => {
    setActiveMatchIdx((prev) => (prev + 1) % (matches.length || 1));
  }, [matches.length]);

  const goToPrevMatch = useCallback(() => {
    setActiveMatchIdx((prev) =>
      prev <= 0 ? Math.max(matches.length - 1, 0) : prev - 1,
    );
  }, [matches.length]);

  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
    setSearchTerm('');
    setActiveMatchIdx(0);
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchTerm('');
    setActiveMatchIdx(0);
  }, []);

  const updateSearchTerm = useCallback((term: string) => {
    setSearchTerm(term);
    setActiveMatchIdx(0);
  }, []);

  return {
    searchTerm,
    setSearchTerm: updateSearchTerm,
    isSearchOpen,
    openSearch,
    closeSearch,
    matches,
    activeMatchIdx,
    currentMatch,
    goToNextMatch,
    goToPrevMatch,
    totalMatches: matches.length,
  };
}
