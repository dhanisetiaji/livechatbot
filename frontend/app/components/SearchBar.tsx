import React, { useRef, useEffect } from 'react';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  activeMatchIdx: number;
  totalMatches: number;
}

export const SearchBar = React.memo(function SearchBar({
  searchTerm,
  onSearchChange,
  onClose,
  onNext,
  onPrev,
  activeMatchIdx,
  totalMatches,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        onPrev();
      } else {
        onNext();
      }
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="search-bar">
      <div className="search-bar-inner">
        <input
          ref={inputRef}
          type="text"
          className="search-bar-input"
          placeholder="Cari dalam pesan..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {searchTerm && (
          <span className="search-bar-count">
            {totalMatches > 0 ? `${activeMatchIdx + 1}/${totalMatches}` : '0 hasil'}
          </span>
        )}
        <div className="search-bar-nav">
          <button
            className="search-nav-btn"
            onClick={onPrev}
            disabled={totalMatches === 0}
            title="Sebelumnya (Shift+Enter)"
          >
            ↑
          </button>
          <button
            className="search-nav-btn"
            onClick={onNext}
            disabled={totalMatches === 0}
            title="Berikutnya (Enter)"
          >
            ↓
          </button>
        </div>
        <button className="search-close-btn" onClick={onClose} title="Tutup (Esc)">
          ✕
        </button>
      </div>
    </div>
  );
});
