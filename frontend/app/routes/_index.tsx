import type { MetaFunction } from '@remix-run/node';
import { useNavigate } from '@remix-run/react';
import { useState, useCallback } from 'react';
import { useAuth } from '~/hooks/useAuth';
import { useUsers } from '~/hooks/useUsers';
import { useMessages } from '~/hooks/useMessages';
import { useSocket } from '~/hooks/useSocket';
import { useMobile } from '~/hooks/useMobile';
import { Sidebar } from '~/components/Sidebar';
import { ChatArea } from '~/components/ChatArea';
import type { User, Message } from '~/types';

export const meta: MetaFunction = () => [
  { title: 'Telegram Live Chat - Admin Dashboard' },
  { name: 'description', content: 'Admin dashboard untuk mengelola live chat Telegram' },
];

export default function Index() {
  const navigate = useNavigate();
  const isMobile = useMobile();
  const auth = useAuth();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  // ── Data hooks ──────────────────────────────────────────
  const {
    users,
    isLoading: usersLoading,
    updateUser,
    handleIncomingMessage,
    refetch: refetchUsers,
  } = useUsers(auth.selectedBot, auth.isReady);

  const {
    messages,
    isLoading: messagesLoading,
    isLoadingMore,
    hasMore,
    total,
    loadMore,
    appendMessage,
    sendMessage,
    isSending,
    reset: resetMessages,
  } = useMessages(selectedUser?.id ?? null, auth.isReady);

  // ── Socket ──────────────────────────────────────────────
  useSocket({
    enabled: auth.isReady,
    onNewMessage: useCallback(
      (msg: Message) => {
        // Update sidebar
        handleIncomingMessage(msg);

        // If this chat is open, append
        const msgUserId = msg.userId || msg.user?.id;
        if (selectedUser && msgUserId === selectedUser.id) {
          appendMessage(msg);
        }
      },
      [handleIncomingMessage, appendMessage, selectedUser],
    ),
  });

  // ── Handlers ────────────────────────────────────────────
  const handleSelectUser = useCallback(
    (user: User) => {
      if (selectedUser?.id !== user.id) {
        resetMessages();
      }
      setSelectedUser(user);
      setIsMobileChatOpen(true);
    },
    [selectedUser, resetMessages],
  );

  const handleBack = useCallback(() => {
    setIsMobileChatOpen(false);
    setSelectedUser(null);
    resetMessages();
  }, [resetMessages]);

  const handleBotChange = useCallback(
    (botId: string) => {
      auth.switchBot(botId);
      setSelectedUser(null);
      resetMessages();
    },
    [auth, resetMessages],
  );

  const handleSendMessage = useCallback(
    async (content: string, photoFile?: File | null) => {
      const msg = await sendMessage({ content, photoFile });

      // Update sidebar for the sent message
      if (selectedUser) {
        updateUser(selectedUser.id, {
          lastMessage: {
            content: msg.content,
            createdAt: msg.createdAt,
            sender: msg.sender,
          },
          updatedAt: msg.createdAt,
        });
      }
    },
    [sendMessage, selectedUser, updateUser],
  );

  const totalUnread = users.reduce((sum, u) => sum + u.unreadCount, 0);

  // ── Auth loading state ──────────────────────────────────
  if (!auth.isReady) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <span>Memuat...</span>
      </div>
    );
  }

  return (
    <div className="container">
      <Sidebar
        users={users}
        selectedUserId={selectedUser?.id ?? null}
        searchQuery={contactSearch}
        onSearchChange={setContactSearch}
        onSelectUser={handleSelectUser}
        totalUnread={totalUnread}
        isLoading={usersLoading}
        currentUser={auth.currentUser}
        selectedBot={auth.selectedBot}
        onBotChange={handleBotChange}
        onBotSwitch={auth.goToSelectBot}
        onAdminPanel={() => navigate('/admin')}
        onLogout={auth.logout}
        currentBotName={auth.getCurrentBotName()}
        isMobileChatOpen={isMobileChatOpen}
      />

      <ChatArea
        selectedUser={selectedUser}
        messages={messages}
        isLoading={messagesLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        total={total}
        onLoadMore={loadMore}
        onSendMessage={handleSendMessage}
        isSending={isSending}
        onBack={handleBack}
        isMobile={isMobile}
      />
    </div>
  );
}
