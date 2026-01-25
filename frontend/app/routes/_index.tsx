import { json, type MetaFunction, type LoaderFunction, redirect } from "@remix-run/node";
import { useLoaderData, useRevalidator, useNavigate } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";
import { getUsers, getUserMessages, sendMessage } from "~/services/api";
import { getSocket } from "~/services/socket";
import { API_URL } from "~/config";
import type { User, Message } from "~/types";

export const meta: MetaFunction = () => {
  return [
    { title: "Telegram Live Chat - Admin Dashboard" },
    { name: "description", content: "Admin dashboard untuk mengelola live chat Telegram" },
  ];
};

export const loader: LoaderFunction = async () => {
  // Note: In SSR, we can't access localStorage
  // Auth check will be done on client side
  return json({ users: [] });
};

export default function Index() {
  const navigate = useNavigate();
  const { users: initialUsers } = useLoaderData<{ users: User[] }>();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const revalidator = useRevalidator();
  const isMarkingAsRead = useRef(false);
  const markedUsers = useRef<Set<string>>(new Set());

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      navigate('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      
      // Check if user has multiple bots and no bot selected yet
      if (user.bots && user.bots.length > 1) {
        const selectedBotId = localStorage.getItem('selectedBotId');
        if (!selectedBotId) {
          navigate('/select-bot');
          return;
        }
        setSelectedBot(selectedBotId);
      } else if (user.bots && user.bots.length === 1) {
        // Auto-select single bot
        setSelectedBot(user.bots[0].id);
      }
      
      setIsAuthChecked(true);
    } catch (error) {
      console.error('Invalid user data:', error);
      navigate('/login');
    }
  }, [navigate]);

  // Load users when bot is selected
  useEffect(() => {
    if (selectedBot && isAuthChecked) {
      const token = localStorage.getItem('token');
      
      fetch(`${API_URL}/api/chats/users?botId=${selectedBot}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(res => {
          if (res.status === 401) {
            navigate('/login');
            throw new Error('Unauthorized');
          }
          return res.json();
        })
        .then(data => {
          // Sort by lastMessage createdAt (newest first)
          const sorted = data.sort((a: User, b: User) => {
            const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return bTime - aTime;
          });
          setUsers(sorted);
        })
        .catch(error => {
          console.error('Failed to load users:', error);
        });
    }
  }, [selectedBot, isAuthChecked, navigate]);

  // Setup WebSocket
  useEffect(() => {
    const socket = getSocket();

    socket.on("connect", () => {
      console.log("Connected to WebSocket");
    });

    socket.on("newMessage", (newMessage: any) => {
      console.log("New message received:", newMessage);
      
      // Update messages if this chat is open
      if (selectedUser && newMessage.userId === selectedUser.id) {
        setMessages((prev) => [...prev, newMessage]);
      }

      // Refresh user list to update unread counts
      revalidator.revalidate();
    });

    return () => {
      socket.off("connect");
      socket.off("newMessage");
    };
  }, [selectedUser, revalidator]);

  // Load messages when user is selected
  useEffect(() => {
    if (selectedUser && isAuthChecked) {
      const token = localStorage.getItem('token');
      
      getUserMessages(selectedUser.id, 20, 0, messageSearchQuery).then(async (response: any) => {
        setMessages(response.messages);
        setHasMore(response.hasMore);
        setTotalMessages(response.total);
        
        // Check if there are unread messages and we haven't marked this user yet
        const hasUnread = response.messages.some((msg: Message) => msg.sender === 'user' && !msg.isRead);
        
        if (hasUnread && !isMarkingAsRead.current && !markedUsers.current.has(selectedUser.id)) {
          // Mark all user messages as read in one API call
          isMarkingAsRead.current = true;
          markedUsers.current.add(selectedUser.id);
          
          try {
            await fetch(`${API_URL}/api/chats/users/${selectedUser.id}/read`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            // Refresh user list to update unread count
            setTimeout(() => {
              if (selectedBot) {
                fetch(`${API_URL}/api/chats/users?botId=${selectedBot}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                })
                  .then(res => res.json())
                  .then(setUsers)
                  .catch(console.error);
              }
            }, 300);
          } catch (error) {
            console.error('Failed to mark messages as read:', error);
            // Remove from marked set on error so it can retry later
            markedUsers.current.delete(selectedUser.id);
          } finally {
            isMarkingAsRead.current = false;
          }
        }
        
        // Scroll to bottom after initial load
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        }, 100);
      }).catch(error => {
        console.error('Failed to load messages:', error);
      });
    } else {
      // Reset when no user selected
      setMessages([]);
      setHasMore(false);
      setTotalMessages(0);
    }
  }, [selectedUser, isAuthChecked, selectedBot, messageSearchQuery]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Refresh users when revalidator triggers
  useEffect(() => {
    if (revalidator.state === "idle" && selectedBot && isAuthChecked) {
      const token = localStorage.getItem('token');
      
      fetch(`${API_URL}/api/chats/users?botId=${selectedBot}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(res => {
          if (res.status === 401) {
            navigate('/login');
            throw new Error('Unauthorized');
          }
          return res.json();
        })
        .then(setUsers)
        .catch(error => {
          console.error('Failed to refresh users:', error);
        });
    }
  }, [revalidator.state, selectedBot, isAuthChecked, navigate]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageInput.trim() && !photoFile) || !selectedUser || isSending) return;

    setIsSending(true);
    const token = localStorage.getItem('token');
    
    try {
      let photoPath: string | undefined = undefined;
      
      // Upload file to backend if file is selected
      if (photoFile) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        
        const uploadResponse = await fetch(`${API_URL}/api/upload/photo`, {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload photo');
        }
        
        const uploadData = await uploadResponse.json();
        photoPath = uploadData.url; // /uploads/filename.jpg
      }
      
      const newMessage = await sendMessage(
        selectedUser.id, 
        messageInput.trim() || '[Photo]',
        photoPath
      );
      setMessages((prev) => [...prev, newMessage]);
      setMessageInput("");
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Gagal mengirim pesan");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Hanya file gambar yang diperbolehkan');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file maksimal 5MB');
        return;
      }
      setPhotoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleLoadMore = async () => {
    if (!selectedUser || isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      const response = await getUserMessages(selectedUser.id, 20, messages.length, messageSearchQuery);
      
      // Prepend older messages
      setMessages((prev) => [...response.messages, ...prev]);
      setHasMore(response.hasMore);
      setTotalMessages(response.total);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    // Load more when scrolled to top
    if (element.scrollTop === 0 && hasMore && !isLoadingMore) {
      const previousScrollHeight = element.scrollHeight;
      
      handleLoadMore().then(() => {
        // Maintain scroll position after loading
        requestAnimationFrame(() => {
          const newScrollHeight = element.scrollHeight;
          element.scrollTop = newScrollHeight - previousScrollHeight;
        });
      });
    }
  };

  const handleMessageSearch = () => {
    // Trigger reload with search
    if (selectedUser) {
      getUserMessages(selectedUser.id, 20, 0, messageSearchQuery).then((response: any) => {
        setMessages(response.messages);
        setHasMore(response.hasMore);
        setTotalMessages(response.total);
      }).catch(console.error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      const hours = date.getHours();
      const mins = date.getMinutes();
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }
    return date.toLocaleDateString("id-ID", { 
      day: "2-digit", 
      month: "short"
    });
  };

  const getInitials = (firstName: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setIsMobileChatOpen(true);
  };

  const handleBackToList = () => {
    setIsMobileChatOpen(false);
    setSelectedUser(null);
  };

  const filteredUsers = users.filter(user => {
    const fullName = `${user.firstName} ${user.lastName || ''}`.toLowerCase();
    const username = user.username?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || username.includes(query);
  });

  const totalUnread = users.reduce((sum, user) => sum + user.unreadCount, 0);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedBotId');
    navigate('/login');
  };

  const handleBotSwitch = () => {
    if (currentUser?.bots && currentUser.bots.length > 1) {
      localStorage.removeItem('selectedBotId');
      navigate('/select-bot');
    }
  };

  const getCurrentBotName = () => {
    if (!currentUser?.bots || !selectedBot) return 'No Bot';
    const bot = currentUser.bots.find((b: any) => b.id === selectedBot);
    return bot?.name || 'Unknown Bot';
  };

  if (!isAuthChecked) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#667781'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="container">
      {/* Sidebar */}
      <div className={`sidebar ${isMobileChatOpen ? 'hidden' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h1>💬 Live Chat Admin</h1>
            <div style={{ display: 'flex', gap: '8px' }}>
              {currentUser?.role === 'super_admin' && (
                <button
                  onClick={() => navigate('/admin')}
                  style={{
                    padding: '8px 16px',
                    background: '#00a884',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  title="Admin Panel"
                >
                  ⚙️ Admin
                </button>
              )}
              {currentUser?.bots && currentUser.bots.length > 1 && (
                <button
                  onClick={handleBotSwitch}
                  style={{
                    padding: '8px 16px',
                    background: '#128C7E',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  title={`Current: ${getCurrentBotName()}`}
                >
                  🤖 Switch Bot
                </button>
              )}
              <button
                onClick={handleLogout}
                style={{
                padding: '8px 16px',
                background: '#f0f2f5',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                color: '#3b4a54',
              }}
            >
              Logout
            </button>
          </div>
          </div>
          
          {/* Bot Selector */}
          {currentUser && currentUser.bots && currentUser.bots.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                color: '#667781', 
                marginBottom: '6px',
                fontWeight: '500'
              }}>
                Selected Bot: {getCurrentBotName()}
              </label>
              <select
                value={selectedBot || ''}
                onChange={(e) => {
                  const newBotId = e.target.value;
                  setSelectedBot(newBotId);
                  localStorage.setItem('selectedBotId', newBotId);
                  // Clear selected user and reload users for new bot
                  setSelectedUser(null);
                  setMessages([]);
                  revalidator.revalidate();
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #d1d7db',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  outline: 'none',
                }}
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
            {users.length} kontak • {totalUnread} pesan belum dibaca
          </div>
        </div>
        
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Cari kontak..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="user-list">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className={`user-item ${selectedUser?.id === user.id ? "active" : ""}`}
              onClick={() => handleUserSelect(user)}
            >
              <div className="user-avatar">
                {getInitials(user.firstName, user.lastName)}
              </div>
              <div className="user-content">
                <div className="user-info">
                  <div className="user-name">
                    {user.firstName} {user.lastName || ""}
                  </div>
                  <div className="user-time">
                    {user.lastMessage && formatTime(user.lastMessage.createdAt)}
                  </div>
                </div>
                <div className="last-message">
                  <span className="last-message-text">
                    {user.lastMessage
                      ? user.lastMessage.sender === "admin"
                        ? `Anda: ${user.lastMessage.content}`
                        : user.lastMessage.content
                      : "Tidak ada pesan"}
                  </span>
                  {user.unreadCount > 0 && (
                    <span className="unread-badge">{user.unreadCount}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#8696a0" }}>
              {searchQuery ? "Tidak ada hasil pencarian" : "Belum ada kontak"}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        {selectedUser ? (
          <>
            <div className="chat-header">
              <button className="back-button" onClick={handleBackToList}>
                ←
              </button>
              <div className="chat-header-avatar">
                {getInitials(selectedUser.firstName, selectedUser.lastName)}
              </div>
              <div className="chat-header-info">
                <div className="chat-user-name">
                  {selectedUser.firstName} {selectedUser.lastName || ""}
                </div>
                <div className="chat-user-info">
                  @{selectedUser.username || "N/A"} • ID: {selectedUser.telegramId}
                  {totalMessages > 0 && (
                    <span> • {messages.length}/{totalMessages}</span>
                  )}
                </div>
              </div>
              {!isMobile && (
                <div style={{ 
                  marginLeft: 'auto', 
                  display: 'flex', 
                  gap: '8px', 
                  alignItems: 'center'
                }}>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={messageSearchQuery}
                    onChange={(e) => setMessageSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleMessageSearch()}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #d1d7db',
                      borderRadius: '18px',
                      fontSize: '14px',
                      width: '180px'
                    }}
                  />
                  <button
                    onClick={handleMessageSearch}
                    style={{
                      padding: '6px 12px',
                      background: '#00a884',
                      color: 'white',
                      border: 'none',
                      borderRadius: '18px',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    🔍
                  </button>
                </div>
              )}
            </div>
            
            {isMobile && (
              <div style={{ 
                padding: '8px 12px', 
                background: '#f0f2f5', 
                borderBottom: '1px solid #d1d7db',
                display: 'flex',
                gap: '8px'
              }}>
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={messageSearchQuery}
                  onChange={(e) => setMessageSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleMessageSearch()}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #d1d7db',
                    borderRadius: '18px',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={handleMessageSearch}
                  style={{
                    padding: '8px 16px',
                    background: '#00a884',
                    color: 'white',
                    border: 'none',
                    borderRadius: '18px',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  🔍
                </button>
              </div>
            )}

            <div 
              className="messages-container" 
              ref={messagesContainerRef}
              onScroll={handleScroll}
            >
              {isLoadingMore && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '10px', 
                  color: '#667781',
                  fontSize: '14px' 
                }}>
                  Loading older messages...
                </div>
              )}
              {!isLoadingMore && hasMore && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '10px' 
                }}>
                  <button
                    onClick={handleLoadMore}
                    style={{
                      padding: '6px 16px',
                      background: '#f0f2f5',
                      border: '1px solid #d1d7db',
                      borderRadius: '18px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#3b4a54'
                    }}
                  >
                    Load older messages
                  </button>
                </div>
              )}
              {messages.map((message) => (
                <div key={message.id} className={`message ${message.sender}`}>
                  <div className="message-bubble">
                    {message.photoUrl && (
                      <div className="message-photo">
                        <img 
                          src={message.photoUrl.startsWith('http') ? message.photoUrl : `${API_URL}${message.photoUrl}`}
                          alt="Photo" 
                        />
                      </div>
                    )}
                    <div className="message-content">{message.content}</div>
                    <div className="message-time">
                      {(() => {
                        const date = new Date(message.createdAt);
                        const hours = date.getHours();
                        const mins = date.getMinutes();
                        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
                      })()}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="message-input-container">
              {photoPreview && (
                <div className="photo-preview-container">
                  <div className="photo-preview-wrapper">
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="photo-preview-img"
                    />
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="photo-preview-remove"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="message-input-form">
                <input
                  type="text"
                  className="message-input"
                  placeholder="Ketik pesan..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={isSending}
                />
                <label className="upload-button">
                  📎
                  <input
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
                  {isSending ? "⏳" : "➤"}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <div className="empty-state-text">Pilih kontak untuk mulai chat</div>
          </div>
        )}
      </div>
    </div>
  );
}
