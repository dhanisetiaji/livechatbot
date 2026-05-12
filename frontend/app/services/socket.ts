import { io, Socket } from 'socket.io-client';
import { WS_URL } from '~/config';

let socket: Socket | null = null;
let currentToken: string | null = null;

/**
 * Returns a singleton, auth'd Socket.IO connection.
 * Reconnects automatically when the JWT token changes.
 */
export function getSocket(token?: string | null): Socket {
  const t =
    token ??
    (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  if (socket && currentToken === t) return socket;

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(WS_URL, {
    auth: { token: t },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  currentToken = t;

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}
