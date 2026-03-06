import React, { useState, useRef, useCallback } from 'react';
import type { User, Message } from '~/types';
import { getInitials } from '~/utils/chat';
import { MessageList } from './MessageList';
import { SearchBar } from './SearchBar';
import { useChatSearch } from '~/hooks/useChatSearch';
import type { SearchMatch } from '~/types';

interface ChatAreaProps {
  selectedUser: User | null;
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  total: number;
  onLoadMore: () => Promise<void>;
  onSendMessage: (content: string, photoFile?: File | null) => Promise<void>;
  isSending: boolean;
  onBack: () => void;
  isMobile: boolean;
}

export const ChatArea = React.memo(function ChatArea({
  selectedUser,
  messages,
  isLoading,
  isLoadingMore,
  hasMore,
  total,
  onLoadMore,
  onSendMessage,
  isSending,
  onBack,
  isMobile,
}: ChatAreaProps) {
  const [messageInput, setMessageInput] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const search = useChatSearch({ messages });

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if ((!messageInput.trim() && !photoFile) || isSending) return;

      try {
        await onSendMessage(messageInput.trim(), photoFile);
        setMessageInput('');
        setPhotoFile(null);
        setPhotoPreview(null);
      } catch {
        alert('Gagal mengirim pesan');
      }
    },
    [messageInput, photoFile, isSending, onSendMessage],
  );

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Hanya file gambar yang diperbolehkan');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    e.target.value = '';
  }, []);

  const clearPhoto = useCallback(() => {
    setPhotoFile(null);
    setPhotoPreview(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ctrl+F / Cmd+F to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        search.openSearch();
      }
    },
    [search],
  );

  // Empty state
  if (!selectedUser) {
    return (
      <div className="chat-area" onKeyDown={handleKeyDown} tabIndex={-1}>
        <div className="empty-state">
          <div className="empty-state-icon">💬</div>
          <div className="empty-state-text">Pilih kontak untuk mulai chat</div>
          <div className="empty-state-hint">Pilih dari daftar di sebelah kiri</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area" onKeyDown={handleKeyDown} tabIndex={-1}>
      {/* ── Header ── */}
      <div className="chat-header">
        <button className="back-button" onClick={onBack}>
          ←
        </button>
        <div className="chat-header-avatar">
          {getInitials(selectedUser.firstName, selectedUser.lastName)}
        </div>
        <div className="chat-header-info">
          <div className="chat-user-name">
            {selectedUser.firstName} {selectedUser.lastName || ''}
          </div>
          <div className="chat-user-info">
            @{selectedUser.username || 'N/A'} • ID: {selectedUser.telegramId}
            {total > 0 && <span> • {messages.length}/{total} pesan</span>}
          </div>
        </div>
        <button
          className="btn-header-search"
          onClick={search.isSearchOpen ? search.closeSearch : search.openSearch}
          title="Cari pesan (Ctrl+F)"
        >
          🔍
        </button>
      </div>

      {/* ── Search bar ── */}
      {search.isSearchOpen && (
        <SearchBar
          searchTerm={search.searchTerm}
          onSearchChange={search.setSearchTerm}
          onClose={search.closeSearch}
          onNext={search.goToNextMatch}
          onPrev={search.goToPrevMatch}
          activeMatchIdx={search.activeMatchIdx}
          totalMatches={search.totalMatches}
        />
      )}

      {/* ── Messages ── */}
      <MessageList
        messages={messages}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        searchTerm={search.isSearchOpen ? search.searchTerm : undefined}
        currentMatch={search.isSearchOpen ? search.currentMatch : null}
      />

      {/* ── Input area ── */}
      <div className="message-input-container">
        {photoPreview && (
          <div className="photo-preview-container">
            <div className="photo-preview-wrapper">
              <img src={photoPreview} alt="Preview" className="photo-preview-img" />
              <button type="button" onClick={clearPhoto} className="photo-preview-remove">
                ✕
              </button>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="message-input-form">
          <input
            type="text"
            className="message-input"
            placeholder="Ketik pesan..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            disabled={isSending}
          />
          <label className="upload-button" title="Kirim gambar">
            📎
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              disabled={isSending}
              style={{ display: 'none' }}
            />
          </label>
          <button
            type="submit"
            className="send-button"
            disabled={(!messageInput.trim() && !photoFile) || isSending}
          >
            {isSending ? (
              <span className="loading-spinner small white" />
            ) : (
              '➤'
            )}
          </button>
        </form>
      </div>
    </div>
  );
});
