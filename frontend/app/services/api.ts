import { API_URL } from '~/config';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

export async function getUsers(botId?: string) {
  const url = botId 
    ? `${API_URL}/api/chats/users?botId=${botId}`
    : `${API_URL}/api/chats/users`;
    
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.status}`);
  }
  return response.json();
}

export async function getUserMessages(userId: string, limit: number = 20, offset: number = 0, search?: string) {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  
  if (search) {
    params.append('search', search);
  }
  
  const response = await fetch(`${API_URL}/api/chats/users/${userId}/messages?${params}`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.status}`);
  }
  return response.json();
}

export async function sendMessage(userId: string, content: string, photoUrl?: string) {
  const response = await fetch(`${API_URL}/api/chats/users/${userId}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ content, photoUrl }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.status}`);
  }
  return response.json();
}

export async function getStats(botId?: string) {
  const url = botId 
    ? `${API_URL}/api/chats/stats?botId=${botId}`
    : `${API_URL}/api/chats/stats`;
    
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function markAsRead(messageId: string) {
  const response = await fetch(`${API_URL}/api/chats/messages/${messageId}/read`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return response.json();
}

