import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from '@remix-run/react';
import type { AuthUser } from '~/types';

export function useAuth() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      navigate('/login');
      return;
    }

    try {
      const user: AuthUser = JSON.parse(userStr);
      setCurrentUser(user);

      if (user.bots && user.bots.length > 1) {
        const savedBotId = localStorage.getItem('selectedBotId');
        if (!savedBotId) {
          navigate('/select-bot');
          return;
        }
        setSelectedBot(savedBotId);
      } else if (user.bots?.length === 1) {
        setSelectedBot(user.bots[0].id);
      }

      setIsReady(true);
    } catch {
      navigate('/login');
    }
  }, [navigate]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedBotId');
    navigate('/login');
  }, [navigate]);

  const switchBot = useCallback(
    (botId: string) => {
      setSelectedBot(botId);
      localStorage.setItem('selectedBotId', botId);
    },
    [],
  );

  const goToSelectBot = useCallback(() => {
    localStorage.removeItem('selectedBotId');
    navigate('/select-bot');
  }, [navigate]);

  const getCurrentBotName = useCallback(() => {
    if (!currentUser?.bots || !selectedBot) return 'No Bot';
    return currentUser.bots.find((b) => b.id === selectedBot)?.name || 'Unknown Bot';
  }, [currentUser, selectedBot]);

  return {
    currentUser,
    selectedBot,
    isReady,
    logout,
    switchBot,
    goToSelectBot,
    getCurrentBotName,
  };
}
