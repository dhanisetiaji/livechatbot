import { useEffect, useRef, useState } from 'react';
import { getSocket, disconnectSocket } from '~/services/socket';
import type { Message } from '~/types';

interface UseSocketOptions {
  onNewMessage?: (msg: Message) => void;
  onUserRead?: (payload: { botId: string; userId: string }) => void;
  /** When set, the client joins the bot-specific room so it only
   *  receives events for messages of that bot. */
  botId?: string | null;
  enabled?: boolean;
}

/**
 * Manages the Socket.IO lifecycle.
 * - Connects once (token-aware singleton).
 * - Joins/leaves bot rooms when `botId` changes.
 * - Exposes connection status so the UI can render a "reconnecting…" badge.
 */
export function useSocket({
  onNewMessage,
  onUserRead,
  botId,
  enabled = true,
}: UseSocketOptions) {
  const newMsgRef = useRef(onNewMessage);
  const readRef = useRef(onUserRead);
  newMsgRef.current = onNewMessage;
  readRef.current = onUserRead;

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onNew = (msg: Message) => newMsgRef.current?.(msg);
    const onRead = (p: { botId: string; userId: string }) =>
      readRef.current?.(p);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('newMessage', onNew);
    socket.on('userRead', onRead);

    if (socket.connected) setIsConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('newMessage', onNew);
      socket.off('userRead', onRead);
    };
  }, [enabled]);

  // Join the bot-specific room when botId or connection changes.
  useEffect(() => {
    if (!enabled || !botId) return;
    const socket = getSocket();
    const join = () => socket.emit('joinBot', botId);

    if (socket.connected) join();
    socket.on('connect', join);

    return () => {
      socket.off('connect', join);
      if (socket.connected) socket.emit('leaveBot', botId);
    };
  }, [botId, enabled]);

  // Disconnect on unmount of the root consumer
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  return { isConnected };
}
