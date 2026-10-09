import React, { useState } from 'react';
import { API_BASE_URL } from '../config';

interface LoginScreenProps {
  onLoginSuccess: (player: { id: number; username: string }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin01');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (data.success) {
        const playerSession = { id: data.playerId, username: data.username };
        localStorage.setItem('spacetactics_user', JSON.stringify(playerSession));
        onLoginSuccess(playerSession);
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch (err) {
      setError(`Unable to reach auth server at ${API_BASE_URL}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050811', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'monospace' }}>
      <form onSubmit={handleLogin} style={{ width: '380px', padding: '30px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #00f3ff', boxShadow: '0 0 25px rgba(0, 243, 255, 0.15)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, color: '#00f3ff', fontSize: '1.8rem', textShadow: '0 0 10px #00f3ff' }}>SPACE TACTICS</h2>
          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>COMMAND TERMINAL AUTHENTICATION</span>
        </div>

        {error && (
          <div style={{ padding: '8px', background: 'rgba(255, 42, 109, 0.15)', border: '1px solid #ff2a6d', color: '#ff2a6d', fontSize: '0.85rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div>
          <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>COMMANDER USERNAME</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required
            style={{ width: '100%', padding: '10px', background: '#051120', border: '1px solid #334155', color: '#00f3ff', fontFamily: 'monospace', boxSizing: 'border-box' }} 
          />
        </div>

        <div>
          <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>PASSWORD</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required
            style={{ width: '100%', padding: '10px', background: '#051120', border: '1px solid #334155', color: '#00f3ff', fontFamily: 'monospace', boxSizing: 'border-box' }} 
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ width: '100%', padding: '12px', background: '#00f3ff', color: '#050811', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: loading ? 'wait' : 'pointer', fontFamily: 'monospace', marginTop: '10px' }}
        >
          {loading ? 'AUTHENTICATING...' : 'ACCESS GARAGE'}
        </button>
      </form>
    </div>
  );
};
