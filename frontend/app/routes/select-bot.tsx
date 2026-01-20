import { useEffect, useState } from 'react';
import { useNavigate } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';

export const meta: MetaFunction = () => {
  return [
    { title: 'Select Bot - Telegram Live Chat' },
  ];
};

export default function SelectBot() {
  const navigate = useNavigate();
  const [bots, setBots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      
      // If user has only one bot, auto-select and go to dashboard
      if (user.bots && user.bots.length === 1) {
        localStorage.setItem('selectedBotId', user.bots[0].id);
        navigate('/');
        return;
      }
      
      // If user has multiple bots, show selector
      if (user.bots && user.bots.length > 0) {
        setBots(user.bots);
      } else {
        // No bots assigned
        setBots([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Invalid user data:', error);
      navigate('/login');
    }
  }, [navigate]);

  const handleSelectBot = (botId: string) => {
    localStorage.setItem('selectedBotId', botId);
    navigate('/');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #00a884 0%, #008069 100%)',
      }}>
        <div style={{ fontSize: '18px', color: 'white' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #00a884 0%, #008069 100%)',
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        padding: '40px',
        width: '100%',
        maxWidth: '500px',
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#111b21',
          marginBottom: '8px',
          textAlign: 'center',
        }}>
          Select Bot
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#667781',
          marginBottom: '32px',
          textAlign: 'center',
        }}>
          Choose a bot to manage
        </p>

        {bots.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#667781',
          }}>
            <p>No bots assigned to your account.</p>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>
              Contact super admin to get bot access.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bots.map((bot) => (
              <button
                key={bot.id}
                onClick={() => handleSelectBot(bot.id)}
                style={{
                  padding: '16px 20px',
                  background: '#f0f2f5',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  fontSize: '15px',
                  fontWeight: '500',
                  color: '#111b21',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e7eb';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f0f2f5';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {bot.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
