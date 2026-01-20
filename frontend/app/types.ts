export interface User {
  id: string;
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
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
  user?: {
    id: string;
    firstName: string;
    lastName?: string;
    username?: string;
  };
}

export interface Stats {
  totalUsers: number;
  totalMessages: number;
  unreadMessages: number;
}
