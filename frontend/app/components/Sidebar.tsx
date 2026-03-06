import React from 'react';
import type { User } from '~/types';
import { formatTime, getInitials } from '~/utils/chat';

interface SidebarProps {
  users: User[];
  selectedUserId: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectUser: (user: User) => void;
  totalUnread: number;
  isLoading: boolean;
  currentUser: any;
  selectedBot: string | null;
  onBotChange: (botId: string) => void;
  onBotSwitch: () => void;
  onAdminPanel: () => void;
  onLogout: () => void;
  currentBotName: string;
  isMobileChatOpen: boolean;
}

export const Sidebar = React.memo(function Sidebar({
  users,
  selectedUserId,
  searchQuery,
  onSearchChange,
  onSelectUser,
  totalUnread,
  isLoading,
  currentUser,
  selectedBot,
  onBotChange,
  onBotSwitch,
  onAdminPanel,
  onLogout,
  currentBotName,
  isMobileChatOpen,
}: SidebarProps) {
  const filteredUsers = React.useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter((u) => {
      const full = `${u.firstName} ${u.lastName || ''}`.toLowerCase();
      const uname = u.username?.toLowerCase() || '';
      return full.includes(q) || uname.includes(q);
    });
  }, [users, searchQuery]);

  return (
    <div className={`sidebar ${isMobileChatOpen ? 'hidden' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-header-top">
          <h1>💬 Live Chat</h1>
          <div className="sidebar-header-actions">
            {currentUser?.role === 'super_admin' && (
              <button className="btn-header btn-admin" onClick={onAdminPanel} title="Admin Panel">
                ⚙️
              </button>
            )}
            {currentUser?.bots?.length > 1 && (
              <button
                className="btn-header btn-switch"
                onClick={onBotSwitch}
                title={`Current: ${currentBotName}`}
              >
                🤖
              </button>
            )}
            <button className="btn-header btn-logout" onClick={onLogout}>
              ↪
            </button>
          </div>
        </div>

        {/* Bot selector */}
        {currentUser?.bots?.length > 0 && (
          <div className="bot-selector">
            <select
              value={selectedBot || ''}
              onChange={(e) => onBotChange(e.target.value)}
              className="bot-select"
            >
              <option value="">Pilih Bot</option>
              {currentUser.bots.map((bot: any) => (
                <option key={bot.id} value={bot.id}>
                  {bot.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="stats">
          {users.length} kontak • {totalUnread} belum dibaca
        </div>
      </div>

      {/* Search */}
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Cari kontak..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* User list */}
      <div className="user-list">
        {isLoading && users.length === 0 && (
          <div className="user-list-empty">
            <div className="loading-spinner" />
            Memuat kontak...
          </div>
        )}

        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className={`user-item ${selectedUserId === user.id ? 'active' : ''} ${
              user.unreadCount > 0 ? 'has-unread' : ''
            }`}
            onClick={() => onSelectUser(user)}
          >
            <div className="user-avatar">{getInitials(user.firstName, user.lastName)}</div>
            <div className="user-content">
              <div className="user-info">
                <div className="user-name">
                  {user.firstName} {user.lastName || ''}
                </div>
                <div className="user-time">
                  {user.lastMessage && formatTime(user.lastMessage.createdAt)}
                </div>
              </div>
              <div className="last-message">
                <span className="last-message-text">
                  {user.lastMessage
                    ? user.lastMessage.sender === 'admin'
                      ? `Anda: ${user.lastMessage.content}`
                      : user.lastMessage.content
                    : 'Tidak ada pesan'}
                </span>
                {user.unreadCount > 0 && (
                  <span className="unread-badge">{user.unreadCount}</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {!isLoading && filteredUsers.length === 0 && (
          <div className="user-list-empty">
            {searchQuery ? 'Tidak ada hasil pencarian' : 'Belum ada kontak'}
          </div>
        )}
      </div>
    </div>
  );
});
