export interface User {
  id: string;
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  botId?: string;
  botName?: string;
  unreadCount: number;
  lastMessage?: {
    content: string;
    createdAt: string;
    sender: 'user' | 'admin';
  };
  updatedAt: string;
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'admin';
  isRead: boolean;
  createdAt: string;
  photoUrl?: string | null;
  botId?: string;
  userId?: string;
  user?: {
    id: string;
    telegramId?: number;
    firstName: string;
    lastName?: string;
    username?: string;
  };
}

export interface MessagesResponse {
  messages: Message[];
  total: number;
  hasMore: boolean;
}

export interface Stats {
  totalUsers: number;
  totalMessages: number;
  unreadMessages: number;
}

export interface AuthUser {
  id: string;
  username: string;
  role: 'super_admin' | 'admin';
  bots: Array<{
    id: string;
    name: string;
    telegramNotificationId?: string;
  }>;
}

export interface SearchMatch {
  messageId: string;
  index: number;
}
