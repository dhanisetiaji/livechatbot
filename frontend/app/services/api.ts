import { API_URL } from '~/config';
import type { User, Message, MessagesResponse, Stats } from '~/types';

function getAuthHeaders(includeContentType = true): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    ...(includeContentType && { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  if (response.status === 401) {
    // Token expired / invalid — redirect to login
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${response.status}`);
  }

  return response.json();
}

// ─── Users ────────────────────────────────────────────────────
export function fetchUsers(botId?: string): Promise<User[]> {
  const url = botId
    ? `${API_URL}/api/chats/users?botId=${botId}`
    : `${API_URL}/api/chats/users`;

  return apiFetch<User[]>(url, { headers: getAuthHeaders() });
}

// ─── Messages ─────────────────────────────────────────────────
export function fetchMessages(
  userId: string,
  limit = 20,
  offset = 0,
  search?: string,
): Promise<MessagesResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  if (search) params.append('search', search);

  return apiFetch<MessagesResponse>(
    `${API_URL}/api/chats/users/${userId}/messages?${params}`,
    { headers: getAuthHeaders() },
  );
}

// Fetch ALL messages for a user (for client-side search / scroll-to)
export async function fetchAllMessages(
  userId: string,
  search?: string,
): Promise<MessagesResponse> {
  // First get the total count
  const initial = await fetchMessages(userId, 1, 0, search);
  if (initial.total <= 0) return { messages: [], total: 0, hasMore: false };

  // Now fetch everything in one go
  return fetchMessages(userId, initial.total, 0, search);
}

// ─── Send message ─────────────────────────────────────────────
export function sendMessage(
  userId: string,
  content: string,
  photoUrl?: string,
): Promise<Message> {
  return apiFetch<Message>(`${API_URL}/api/chats/users/${userId}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ content, photoUrl }),
  });
}

// ─── Upload photo ─────────────────────────────────────────────
export async function uploadPhoto(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('photo', file);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const response = await fetch(`${API_URL}/api/upload/photo`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) throw new Error('Failed to upload photo');
  return response.json();
}

// ─── Mark read ────────────────────────────────────────────────
export function markUserAsRead(userId: string): Promise<{ success: boolean }> {
  return apiFetch(`${API_URL}/api/chats/users/${userId}/read`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
}

export function markMessageAsRead(messageId: string): Promise<{ success: boolean }> {
  return apiFetch(`${API_URL}/api/chats/messages/${messageId}/read`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
}

// ─── Stats ────────────────────────────────────────────────────
export function fetchStats(botId?: string): Promise<Stats> {
  const url = botId
    ? `${API_URL}/api/chats/stats?botId=${botId}`
    : `${API_URL}/api/chats/stats`;

  return apiFetch<Stats>(url, { headers: getAuthHeaders() });
}

// Legacy aliases (backward compat)
export { fetchUsers as getUsers, fetchMessages as getUserMessages, fetchStats as getStats };

