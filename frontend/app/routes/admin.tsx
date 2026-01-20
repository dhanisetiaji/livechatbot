import { useEffect, useState } from 'react';
import { useNavigate } from '@remix-run/react';
import { API_URL } from '~/config';

interface AuthUser {
  id: string;
  username: string;
  role: 'super_admin' | 'admin';
  bots?: Bot[];
}

interface Bot {
  id: string;
  botName: string;
  botToken: string;
  isActive: boolean;
  createdAt: string;
}

interface BotUser {
  id: string;
  username: string;
  role: string;
  bots: Bot[];
  botUsers?: Array<{
    id: string;
    botId: string;
    telegramNotificationId?: string;
    bot?: Bot;
  }>;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<'bots' | 'users' | 'password'>('bots');
  
  // Bot management state
  const [bots, setBots] = useState<Bot[]>([]);
  const [showBotForm, setShowBotForm] = useState(false);
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [botForm, setBotForm] = useState({ botName: '', botToken: '', isActive: true });
  
  // User management state
  const [users, setUsers] = useState<BotUser[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<BotUser | null>(null);
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'admin', telegramNotificationId: '' });
  
  // Assignment state
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]);
  const [assignTelegramId, setAssignTelegramId] = useState<string>('');
  
  // Password change state
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Check authentication and admin role
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userStr || !token) {
      navigate('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      
      // Only super_admin can access admin panel
      if (user.role !== 'super_admin') {
        navigate('/');
        return;
      }
      
      setCurrentUser(user);
    } catch (error) {
      console.error('Invalid user data:', error);
      navigate('/login');
    }
  }, [navigate]);

  // Load bots
  useEffect(() => {
    if (currentUser && activeTab === 'bots') {
      loadBots();
    }
  }, [currentUser, activeTab]);

  // Load users
  useEffect(() => {
    if (currentUser && activeTab === 'users') {
      loadUsers();
    }
  }, [currentUser, activeTab]);

  const loadBots = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/bots`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBots(data);
      }
    } catch (error) {
      console.error('Failed to load bots:', error);
    }
  };

  const loadUsers = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Transform botUsers to bots array
        const transformedUsers = data.map((user: any) => ({
          ...user,
          bots: user.botUsers?.map((bu: any) => bu.bot) || []
        }));
        setUsers(transformedUsers);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${API_URL}/api/bots`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(botForm)
      });
      
      if (res.ok) {
        setBotForm({ botName: '', botToken: '', isActive: true });
        setShowBotForm(false);
        loadBots();
      }
    } catch (error) {
      console.error('Failed to create bot:', error);
    }
  };

  const handleUpdateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBot) return;
    
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${API_URL}/api/bots/${editingBot.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(botForm)
      });
      
      if (res.ok) {
        setBotForm({ botName: '', botToken: '', isActive: true });
        setEditingBot(null);
        setShowBotForm(false);
        loadBots();
      }
    } catch (error) {
      console.error('Failed to update bot:', error);
    }
  };

  const handleDeleteBot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bot?')) return;
    
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${API_URL}/api/bots/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        loadBots();
      }
    } catch (error) {
      console.error('Failed to delete bot:', error);
    }
  };

  const handleToggleBotActive = async (bot: Bot) => {
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${API_URL}/api/bots/${bot.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...bot, isActive: !bot.isActive })
      });
      
      if (res.ok) {
        loadBots();
      }
    } catch (error) {
      console.error('Failed to toggle bot:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userForm)
      });
      
      if (res.ok) {
        setUserForm({ username: '', password: '', role: 'admin', telegramNotificationId: '' });
        setShowUserForm(false);
        loadUsers();
      }
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    const token = localStorage.getItem('token');
    const updateData: any = { username: userForm.username, role: userForm.role };
    
    // Only include password if it's provided
    if (userForm.password) {
      updateData.password = userForm.password;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (res.ok) {
        setUserForm({ username: '', password: '', role: 'admin', telegramNotificationId: '' });
        setEditingUser(null);
        setShowUserForm(false);
        loadUsers();
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${API_URL}/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        loadUsers();
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleAssignBots = async () => {
    if (!selectedUserId || selectedBotIds.length === 0) {
      alert('Please select a user and at least one bot');
      return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${API_URL}/api/users/${selectedUserId}/bots`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          botIds: selectedBotIds,
          telegramNotificationId: assignTelegramId || undefined
        })
      });
      
      if (res.ok) {
        alert('Bots assigned successfully');
        setSelectedUserId('');
        setSelectedBotIds([]);
        setAssignTelegramId('');
        loadUsers();
      }
    } catch (error) {
      console.error('Failed to assign bots:', error);
    }
  };

  const handleUnassignBot = async (userId: string, botId: string) => {
    if (!confirm('Are you sure you want to unassign this bot?')) return;
    
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}/bots/${botId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        loadUsers();
      }
    } catch (error) {
      console.error('Failed to unassign bot:', error);
    }
  };

  const handleUpdateTelegramId = async (userId: string, botId: string) => {
    const telegramId = prompt('Enter Telegram Notification ID (get it from @userinfobot):');
    if (!telegramId) return;

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_URL}/api/users/${userId}/bots/${botId}/telegram-id`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ telegramNotificationId: telegramId })
      });

      if (res.ok) {
        alert('Telegram Notification ID updated successfully!');
        loadUsers();
      } else {
        alert('Failed to update Telegram Notification ID');
      }
    } catch (error) {
      console.error('Failed to update telegram notification ID:', error);
      alert('Error updating Telegram Notification ID');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      
      if (res.ok) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await res.json();
        setPasswordMessage({ type: 'error', text: data.message || 'Failed to change password' });
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: 'Failed to change password' });
      console.error('Failed to change password:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedBotId');
    navigate('/login');
  };

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #00a884 0%, #128C7E 100%)' }}>
      {/* Header */}
      <div style={{ 
        background: 'white', 
        padding: '1rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <h1 style={{ margin: 0, color: '#00a884', fontSize: 'clamp(1.2rem, 4vw, 1.5rem)' }}>Admin Panel</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#666', fontSize: '0.9rem', display: 'none' }} className="desktop-only">Welcome, {currentUser.username}</span>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '0.5rem 1rem',
              background: '#00a884',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            💬 Chat
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        background: 'white', 
        padding: '0 1rem',
        display: 'flex',
        gap: '1rem',
        borderBottom: '1px solid #e0e0e0',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        <button
          onClick={() => setActiveTab('bots')}
          style={{
            padding: '1rem 0',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'bots' ? '3px solid #00a884' : '3px solid transparent',
            color: activeTab === 'bots' ? '#00a884' : '#666',
            fontWeight: activeTab === 'bots' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: 'clamp(0.85rem, 2vw, 1rem)',
            whiteSpace: 'nowrap'
          }}
        >
          🤖 Bots
        </button>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '1rem 0',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'users' ? '3px solid #00a884' : '3px solid transparent',
            color: activeTab === 'users' ? '#00a884' : '#666',
            fontWeight: activeTab === 'users' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: 'clamp(0.85rem, 2vw, 1rem)',
            whiteSpace: 'nowrap'
          }}
        >
          👥 Users
        </button>
        <button
          onClick={() => setActiveTab('password')}
          style={{
            padding: '1rem 0',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'password' ? '3px solid #00a884' : '3px solid transparent',
            color: activeTab === 'password' ? '#00a884' : '#666',
            fontWeight: activeTab === 'password' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: 'clamp(0.85rem, 2vw, 1rem)',
            whiteSpace: 'nowrap'
          }}
        >
          🔐 Password
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: 'clamp(1rem, 3vw, 2rem)' }}>
        {activeTab === 'bots' && (
          <div style={{ background: 'white', borderRadius: '12px', padding: 'clamp(1rem, 3vw, 2rem)', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Bots</h2>
              <button
                onClick={() => {
                  setBotForm({ botName: '', botToken: '', isActive: true });
                  setEditingBot(null);
                  setShowBotForm(true);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#00a884',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
              >
                + Add Bot
              </button>
            </div>

            {showBotForm && (
              <div style={{ 
                background: '#f5f5f5', 
                padding: 'clamp(1rem, 3vw, 1.5rem)', 
                borderRadius: '8px', 
                marginBottom: 'clamp(1rem, 3vw, 1.5rem)' 
              }}>
                <h3 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.3rem)', marginBottom: 'clamp(0.75rem, 2vw, 1rem)' }}>
                  {editingBot ? 'Edit Bot' : 'Add New Bot'}
                </h3>
                <form onSubmit={editingBot ? handleUpdateBot : handleCreateBot}>
                  <div style={{ marginBottom: 'clamp(0.75rem, 2vw, 1rem)' }}>
                    <label style={{ display: 'block', marginBottom: 'clamp(0.25rem, 1vw, 0.5rem)', fontWeight: '500', fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
                      Bot Name
                    </label>
                    <input
                      type="text"
                      value={botForm.botName}
                      onChange={(e) => setBotForm({ ...botForm, botName: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: 'clamp(0.6rem, 2vw, 0.75rem)',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 'clamp(0.75rem, 2vw, 1rem)' }}>
                    <label style={{ display: 'block', marginBottom: 'clamp(0.25rem, 1vw, 0.5rem)', fontWeight: '500', fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
                      Bot Token
                    </label>
                    <input
                      type="text"
                      value={botForm.botToken}
                      onChange={(e) => setBotForm({ ...botForm, botToken: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: 'clamp(0.6rem, 2vw, 0.75rem)',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                        fontFamily: 'monospace',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 'clamp(0.75rem, 2vw, 1rem)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.35rem, 1vw, 0.5rem)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={botForm.isActive}
                        onChange={(e) => setBotForm({ ...botForm, isActive: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>Active</span>
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 'clamp(0.5rem, 2vw, 1rem)', flexWrap: 'wrap' }}>
                    <button
                      type="submit"
                      style={{
                        padding: 'clamp(0.6rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)',
                        background: '#00a884',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: 'clamp(0.9rem, 2vw, 1rem)'
                      }}
                    >
                      {editingBot ? 'Update' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBotForm(false);
                        setEditingBot(null);
                        setBotForm({ botName: '', botToken: '', isActive: true });
                      }}
                      style={{
                        padding: 'clamp(0.6rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: 'clamp(0.9rem, 2vw, 1rem)'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginTop: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', textAlign: 'left', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>Name</th>
                    <th style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', textAlign: 'left', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>Token</th>
                    <th style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', textAlign: 'center', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>Status</th>
                    <th style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', textAlign: 'center', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>Created</th>
                    <th style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', textAlign: 'center', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bots.map((bot) => (
                    <tr key={bot.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>{bot.botName}</td>
                      <td style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', fontFamily: 'monospace', fontSize: 'clamp(0.75rem, 2vw, 0.9rem)' }}>
                        {bot.botToken.substring(0, 20)}...
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          background: bot.isActive ? '#d4edda' : '#f8d7da',
                          color: bot.isActive ? '#155724' : '#721c24',
                          fontSize: '0.85rem',
                          fontWeight: '500'
                        }}>
                          {bot.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
                        {new Date(bot.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleToggleBotActive(bot)}
                            style={{
                              padding: '0.5rem 1rem',
                              background: bot.isActive ? '#ffc107' : '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            {bot.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingBot(bot);
                              setBotForm({ 
                                botName: bot.botName, 
                                botToken: bot.botToken, 
                                isActive: bot.isActive 
                              });
                              setShowBotForm(true);
                            }}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteBot(bot.id)}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bots.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                  No bots found. Click "Add Bot" to create one.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Users</h2>
              <button
                onClick={() => {
                  setUserForm({ username: '', password: '', role: 'admin', telegramNotificationId: '' });
                  setEditingUser(null);
                  setShowUserForm(true);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#00a884',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
              >
                + Add User
              </button>
            </div>

            {showUserForm && (
              <div style={{ 
                background: '#f5f5f5', 
                padding: 'clamp(1rem, 3vw, 1.5rem)', 
                borderRadius: '8px', 
                marginBottom: 'clamp(1rem, 3vw, 1.5rem)' 
              }}>
                <h3 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.3rem)', marginBottom: 'clamp(0.75rem, 2vw, 1rem)' }}>
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h3>
                <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
                  <div style={{ marginBottom: 'clamp(0.75rem, 2vw, 1rem)' }}>
                    <label style={{ display: 'block', marginBottom: 'clamp(0.25rem, 1vw, 0.5rem)', fontWeight: '500', fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
                      Username
                    </label>
                    <input
                      type="text"
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: 'clamp(0.6rem, 2vw, 0.75rem)',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 'clamp(0.75rem, 2vw, 1rem)' }}>
                    <label style={{ display: 'block', marginBottom: 'clamp(0.25rem, 1vw, 0.5rem)', fontWeight: '500', fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
                      Password {editingUser && '(leave empty to keep current)'}
                    </label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      required={!editingUser}
                      style={{
                        width: '100%',
                        padding: 'clamp(0.6rem, 2vw, 0.75rem)',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 'clamp(0.75rem, 2vw, 1rem)' }}>
                    <label style={{ display: 'block', marginBottom: 'clamp(0.25rem, 1vw, 0.5rem)', fontWeight: '500', fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
                      Role
                    </label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                      style={{
                        width: '100%',
                        padding: 'clamp(0.6rem, 2vw, 0.75rem)',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: 'clamp(0.75rem, 2vw, 1rem)' }}>
                    <label style={{ display: 'block', marginBottom: 'clamp(0.25rem, 1vw, 0.5rem)', fontWeight: '500', fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
                      Telegram ID for Notifications (Optional)
                    </label>
                    <input
                      type="text"
                      value={userForm.telegramNotificationId}
                      onChange={(e) => setUserForm({ ...userForm, telegramNotificationId: e.target.value })}
                      placeholder="Enter Telegram ID to receive notifications"
                      style={{
                        width: '100%',
                        padding: 'clamp(0.6rem, 2vw, 0.75rem)',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                        boxSizing: 'border-box'
                      }}
                    />
                    <small style={{ color: '#666', fontSize: 'clamp(0.75rem, 1.5vw, 0.85rem)', display: 'block', marginTop: 'clamp(0.25rem, 1vw, 0.5rem)' }}>
                      To get your Telegram ID, message @userinfobot on Telegram
                    </small>
                  </div>
                  <div style={{ display: 'flex', gap: 'clamp(0.5rem, 2vw, 1rem)', flexWrap: 'wrap' }}>
                    <button
                      type="submit"
                      style={{
                        padding: 'clamp(0.6rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)',
                        background: '#00a884',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: 'clamp(0.9rem, 2vw, 1rem)'
                      }}
                    >
                      {editingUser ? 'Update' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserForm(false);
                        setEditingUser(null);
                        setUserForm({ username: '', password: '', role: 'admin', telegramNotificationId: '' });
                      }}
                      style={{
                        padding: 'clamp(0.6rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: 'clamp(0.9rem, 2vw, 1rem)'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Bot Assignment Section */}
            <div style={{ 
              background: '#e8f5e9', 
              padding: 'clamp(1rem, 3vw, 1.5rem)', 
              borderRadius: '8px', 
              marginBottom: 'clamp(1rem, 3vw, 1.5rem)' 
            }}>
              <h3 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.3rem)', marginBottom: 'clamp(0.75rem, 2vw, 1rem)' }}>
                Assign Bots to User
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'clamp(0.75rem, 2vw, 1rem)', alignItems: 'start' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 'clamp(0.25rem, 1vw, 0.5rem)', fontWeight: '500', fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
                    Select User
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 'clamp(0.6rem, 2vw, 0.75rem)',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">Choose user...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 'clamp(0.25rem, 1vw, 0.5rem)', fontWeight: '500', fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
                    Select Bots (hold Ctrl/Cmd to select multiple)
                  </label>
                  <select
                    multiple
                    value={selectedBotIds}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setSelectedBotIds(selected);
                    }}
                    style={{
                      width: '100%',
                      padding: 'clamp(0.6rem, 2vw, 0.75rem)',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                      minHeight: 'clamp(80px, 15vw, 100px)',
                      boxSizing: 'border-box'
                    }}
                  >
                    {bots.map((bot) => (
                      <option key={bot.id} value={bot.id}>
                        {bot.botName} ({bot.isActive ? 'Active' : 'Inactive'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 'clamp(0.25rem, 1vw, 0.5rem)', fontWeight: '500', fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
                    Telegram ID for Notifications
                  </label>
                  <input
                    type="text"
                    value={assignTelegramId}
                    onChange={(e) => setAssignTelegramId(e.target.value)}
                    placeholder="Optional Telegram ID"
                    style={{
                      width: '100%',
                      padding: 'clamp(0.6rem, 2vw, 0.75rem)',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                      boxSizing: 'border-box'
                    }}
                  />
                  <small style={{ color: '#666', fontSize: 'clamp(0.75rem, 1.5vw, 0.8rem)', display: 'block', marginTop: 'clamp(0.25rem, 1vw, 0.5rem)' }}>
                    Message @userinfobot
                  </small>
                </div>
                <button
                  onClick={handleAssignBots}
                  style={{
                    padding: 'clamp(0.6rem, 2vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)',
                    background: '#00a884',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                    whiteSpace: 'nowrap',
                    width: '100%'
                  }}
                >
                  Assign Bots
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', textAlign: 'left', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>Username</th>
                    <th style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', textAlign: 'left', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>Role</th>
                    <th style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', textAlign: 'left', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>Assigned Bots</th>
                    <th style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', textAlign: 'center', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>{user.username}</td>
                      <td style={{ padding: 'clamp(0.5rem, 2vw, 1rem)' }}>
                        <span style={{
                          padding: 'clamp(0.2rem, 1vw, 0.25rem) clamp(0.5rem, 2vw, 0.75rem)',
                          borderRadius: '12px',
                          background: user.role === 'super_admin' ? '#d1ecf1' : '#fff3cd',
                          color: user.role === 'super_admin' ? '#0c5460' : '#856404',
                          fontSize: 'clamp(0.75rem, 1.5vw, 0.85rem)',
                          fontWeight: '500'
                        }}>
                          {user.role === 'super_admin' ? 'SUPER_ADMIN' : 'ADMIN'}
                        </span>
                      </td>
                      <td style={{ padding: 'clamp(0.5rem, 2vw, 1rem)' }}>
                        {user.bots && user.bots.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.25rem, 1vw, 0.5rem)' }}>
                            {user.bots.map((bot) => {
                              const botUserAssignment = user.botUsers?.find(bu => bu.botId === bot.id);
                              const hasNotificationId = botUserAssignment?.telegramNotificationId;
                              
                              return (
                                <div key={bot.id} style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.25rem, 1vw, 0.5rem)' }}>
                                  <span
                                    style={{
                                      padding: 'clamp(0.2rem, 1vw, 0.25rem) clamp(0.5rem, 2vw, 0.75rem)',
                                      background: '#e0e0e0',
                                      borderRadius: '12px',
                                      fontSize: 'clamp(0.75rem, 1.5vw, 0.85rem)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 'clamp(0.25rem, 1vw, 0.5rem)'
                                    }}
                                  >
                                    {bot.botName}
                                    <button
                                      onClick={() => handleUnassignBot(user.id, bot.id)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#dc3545',
                                        cursor: 'pointer',
                                        padding: '0',
                                        fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                                        lineHeight: '1'
                                      }}
                                      title="Unassign bot"
                                    >
                                      ×
                                    </button>
                                  </span>
                                  {hasNotificationId ? (
                                    <span style={{ 
                                      fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)', 
                                      color: '#28a745',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 'clamp(0.15rem, 1vw, 0.25rem)'
                                    }}>
                                      🔔 ID: {hasNotificationId}
                                      <button
                                        onClick={() => handleUpdateTelegramId(user.id, bot.id)}
                                        style={{
                                          padding: 'clamp(0.1rem, 1vw, 0.15rem) clamp(0.3rem, 1vw, 0.4rem)',
                                          background: '#007bff',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          fontSize: 'clamp(0.65rem, 1.5vw, 0.7rem)'
                                        }}
                                        title="Update Telegram ID"
                                      >
                                        Update
                                      </button>
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleUpdateTelegramId(user.id, bot.id)}
                                      style={{
                                        padding: 'clamp(0.2rem, 1vw, 0.25rem) clamp(0.4rem, 1.5vw, 0.5rem)',
                                        background: '#ffc107',
                                        color: '#000',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)',
                                        fontWeight: '500'
                                      }}
                                      title="Set Telegram Notification ID"
                                    >
                                      Set Telegram ID
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ color: '#999', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>No bots assigned</span>
                        )}
                      </td>
                      <td style={{ padding: 'clamp(0.5rem, 2vw, 1rem)', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 'clamp(0.25rem, 1vw, 0.5rem)', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setUserForm({ 
                                username: user.username, 
                                password: '', 
                                role: user.role,
                                telegramNotificationId: user.botUsers?.[0]?.telegramNotificationId || ''
                              });
                              setShowUserForm(true);
                            }}
                            style={{
                              padding: 'clamp(0.4rem, 1.5vw, 0.5rem) clamp(0.75rem, 2vw, 1rem)',
                              background: '#007bff',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: 'clamp(0.75rem, 1.5vw, 0.85rem)'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={user.id === currentUser?.id}
                            style={{
                              padding: 'clamp(0.4rem, 1.5vw, 0.5rem) clamp(0.75rem, 2vw, 1rem)',
                              background: user.id === currentUser?.id ? '#ccc' : '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: user.id === currentUser?.id ? 'not-allowed' : 'pointer',
                              fontSize: 'clamp(0.75rem, 1.5vw, 0.85rem)'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                  No users found. Click "Add User" to create one.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'password' && (
          <div style={{ 
            background: 'white', 
            borderRadius: '12px', 
            padding: 'clamp(1.5rem, 4vw, 2rem)', 
            maxWidth: '500px', 
            margin: '0 auto' 
          }}>
            <h2 style={{ marginTop: 0, fontSize: 'clamp(1.3rem, 4vw, 1.5rem)' }}>Change Password</h2>
            
            {passwordMessage && (
              <div style={{
                padding: 'clamp(0.75rem, 2vw, 1rem)',
                borderRadius: '8px',
                marginBottom: 'clamp(0.75rem, 2vw, 1rem)',
                background: passwordMessage?.type === 'success' ? '#d4edda' : '#f8d7da',
                color: passwordMessage?.type === 'success' ? '#155724' : '#721c24',
                border: `1px solid ${passwordMessage?.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
                fontSize: 'clamp(0.9rem, 2vw, 1rem)'
              }}>
                {passwordMessage?.text}
              </div>
            )}
            
            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: 'clamp(0.75rem, 2vw, 1rem)' }}>
                <label style={{ display: 'block', marginBottom: 'clamp(0.25rem, 1vw, 0.5rem)', fontWeight: '500', fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: 'clamp(0.6rem, 2vw, 0.75rem)',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ marginBottom: 'clamp(0.75rem, 2vw, 1rem)' }}>
                <label style={{ display: 'block', marginBottom: 'clamp(0.25rem, 1vw, 0.5rem)', fontWeight: '500', fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: 'clamp(0.6rem, 2vw, 0.75rem)',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                    boxSizing: 'border-box'
                  }}
                />
                <small style={{ color: '#666', fontSize: 'clamp(0.75rem, 1.5vw, 0.85rem)', display: 'block', marginTop: 'clamp(0.25rem, 1vw, 0.5rem)' }}>
                  Minimum 6 characters
                </small>
              </div>
              <div style={{ marginBottom: 'clamp(1rem, 3vw, 1.5rem)' }}>
                <label style={{ display: 'block', marginBottom: 'clamp(0.25rem, 1vw, 0.5rem)', fontWeight: '500', fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: 'clamp(0.6rem, 2vw, 0.75rem)',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: 'clamp(0.6rem, 2vw, 0.75rem)',
                  background: '#00a884',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                  fontWeight: '500'
                }}
              >
                Change Password
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
