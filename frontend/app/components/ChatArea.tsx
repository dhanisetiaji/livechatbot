import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { User, Message } from '~/types';
import { getInitials } from '~/utils/chat';
import { MessageList } from './MessageList';
import { SearchBar } from './SearchBar';
import { useChatSearch } from '~/hooks/useChatSearch';

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
  onRetryMessage?: (clientMessageId: string) => void;
  onDiscardMessage?: (clientMessageId: string) => void;
  isConnected?: boolean;
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
  onRetryMessage,
  onDiscardMessage,
  isConnected = true,
}: ChatAreaProps) {
  const [messageInput, setMessageInput] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const search = useChatSearch({ messages });

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
  }, [messageInput]);

  // Reset draft on user switch
  useEffect(() => {
    setMessageInput('');
    setPhotoFile(null);
    setPhotoPreview(null);
  }, [selectedUser?.id]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const text = messageInput.trim();
      if ((!text && !photoFile) || isSending) return;

      // Reset input immediately (optimistic UI in hook handles echo)
      const sentText = text;
      const sentFile = photoFile;
      setMessageInput('');
      setPhotoFile(null);
      setPhotoPreview(null);

      try {
        await onSendMessage(sentText, sentFile);
      } catch {
        // useMessages already marks the optimistic bubble as failed;
        // restore the draft so the user can edit + retry
        setMessageInput(sentText);
      }
    },
    [messageInput, photoFile, isSending, onSendMessage],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
      e.target.value = '';
    },
    [],
  );

  const clearPhoto = useCallback(() => {
    setPhotoFile(null);
    setPhotoPreview(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        search.openSearch();
      }
    },
    [search],
  );

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter = send, Shift+Enter = newline (standard chat convention)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  // Close lightbox on Esc
  useEffect(() => {
    if (!lightboxUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxUrl(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxUrl]);

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
      {/* Header */}
      <div className="chat-header">
        <button className="back-button" onClick={onBack} aria-label="Kembali">
          ←
        </button>
        <div className="chat-header-avatar">
          {getInitials(selectedUser.firstName, selectedUser.lastName)}
        </div>
        <div className="chat-header-info">
          <div className="chat-user-name">
            {selectedUser.firstName} {selectedUser.lastName || ''}
            {!isConnected && (
              <span className="conn-dot" title="Tidak terhubung ke server" />
            )}
          </div>
          <div className="chat-user-info">
            @{selectedUser.username || 'N/A'} • ID: {selectedUser.telegramId}
            {total > 0 && (
              <span>
                {' '}
                • {messages.length}/{total} pesan
              </span>
            )}
          </div>
        </div>
        <button
          className="btn-header-search"
          onClick={search.isSearchOpen ? search.closeSearch : search.openSearch}
          title="Cari pesan (Ctrl+F)"
          aria-label="Cari pesan"
        >
          🔍
        </button>
      </div>

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

      <MessageList
        messages={messages}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        onImageClick={setLightboxUrl}
        onRetry={onRetryMessage}
        onDiscard={onDiscardMessage}
        searchTerm={search.isSearchOpen ? search.searchTerm : undefined}
        currentMatch={search.isSearchOpen ? search.currentMatch : null}
      />

      {/* Input */}
      <div className="message-input-container">
        {photoPreview && (
          <div className="photo-preview-container">
            <div className="photo-preview-wrapper">
              <img src={photoPreview} alt="Preview" className="photo-preview-img" />
              <button
                type="button"
                onClick={clearPhoto}
                className="photo-preview-remove"
                aria-label="Hapus gambar"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="message-input-form">
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
          <textarea
            ref={textareaRef}
            className="message-input"
            placeholder="Ketik pesan… (Enter untuk kirim, Shift+Enter baris baru)"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            disabled={isSending}
            rows={1}
          />
          <button
            type="submit"
            className="send-button"
            disabled={(!messageInput.trim() && !photoFile) || isSending}
            aria-label="Kirim"
          >
            {isSending ? <span className="loading-spinner small white" /> : '➤'}
          </button>
        </form>
      </div>

      {/* Image lightbox */}
      {lightboxUrl && (
        <div
          className="lightbox-overlay"
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            className="lightbox-close"
            onClick={() => setLightboxUrl(null)}
            aria-label="Tutup"
          >
            ✕
          </button>
          <img
            src={lightboxUrl}
            alt="Preview"
            className="lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
});
