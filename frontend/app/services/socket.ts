import { io, Socket } from 'socket.io-client';
import { WS_URL } from '~/config';

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(WS_URL);
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
