import { useEffect, useRef } from 'react';
import { getSocket, disconnectSocket } from '~/services/socket';
import type { Message } from '~/types';

interface UseSocketOptions {
  /** Called for every incoming newMessage event */
  onNewMessage?: (msg: Message) => void;
  /** Whether the socket should be connected */
  enabled?: boolean;
}

/**
 * Manages the Socket.IO lifecycle and dispatches incoming messages.
 * Memoises the callback ref so the socket listener doesn't re-subscribe.
 */
export function useSocket({ onNewMessage, enabled = true }: UseSocketOptions) {
  const callbackRef = useRef(onNewMessage);
  callbackRef.current = onNewMessage;

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();

    const handler = (msg: Message) => {
      callbackRef.current?.(msg);
    };

    socket.on('newMessage', handler);

    return () => {
      socket.off('newMessage', handler);
    };
  }, [enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);
}
