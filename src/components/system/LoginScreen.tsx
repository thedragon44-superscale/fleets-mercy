// src/components/system/LoginScreen.tsx
import React, { useState } from 'react';
import { API_BASE_URL } from '../../config';
import {
  PlayerSession,
  loginPlayer,
  registerPlayer,
} from '../../services/walletService';

interface LoginScreenProps {
  onLoginSuccess: (player: PlayerSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim();
    if (trimmedUser.length < 3 || password.length < 4) {
      setError('Username must be at least 3 characters and password at least 4 characters.');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const data =
        mode === 'register'
          ? await registerPlayer(trimmedUser, password)
          : await loginPlayer(trimmedUser, password);

      if (data.success && data.playerId && data.username) {
        const playerSession: PlayerSession = {
          id: data.playerId,
          username: data.username,
          role: data.role === 'house_admin' ? 'house_admin' : 'player',
          walletId: data.walletId,
          balanceCents: data.balanceCents ?? 0,
        };
        localStorage.setItem('spacetactics_user', JSON.stringify(playerSession));
        onLoginSuccess(playerSession);
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch {
      setError(`Unable to reach auth server at ${API_BASE_URL}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen bg-[#050811] flex justify-center items-center font-mono text-slate-100 select-none">
      <form
        onSubmit={handleSubmit}
        className="w-[400px] p-7 bg-slate-900/95 border border-cyan-400/70 rounded-xl shadow-[0_0_30px_rgba(0,243,255,0.14)] flex flex-col gap-5"
      >
        <div className="text-center">
          <h2 className="m-0 text-cyan-300 text-2xl font-black tracking-wider drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]">
            FLEET&apos;S MERCY
          </h2>
          <span className="text-slate-400 text-[11px] uppercase tracking-widest">
            Command &amp; Casino Terminal Auth
          </span>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="grid grid-cols-2 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`py-1.5 rounded text-xs font-black uppercase tracking-wider cursor-pointer transition ${
              mode === 'login'
                ? 'bg-cyan-400 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`py-1.5 rounded text-xs font-black uppercase tracking-wider cursor-pointer transition ${
              mode === 'register'
                ? 'bg-emerald-400 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="px-3 py-2 rounded bg-rose-500/15 border border-rose-500/60 text-rose-300 text-xs text-center">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block mb-1.5">
              Commander Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              placeholder="Enter username"
              className="w-full px-3 py-2.5 rounded bg-[#051120] border border-slate-700 focus:border-cyan-400 focus:outline-none text-cyan-300 text-sm"
            />
          </div>

          <div>
            <label className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              placeholder="Enter password"
              className="w-full px-3 py-2.5 rounded bg-[#051120] border border-slate-700 focus:border-cyan-400 focus:outline-none text-cyan-300 text-sm"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Re-enter password"
                className="w-full px-3 py-2.5 rounded bg-[#051120] border border-slate-700 focus:border-emerald-400 focus:outline-none text-emerald-300 text-sm"
              />
              <p className="text-[10px] text-slate-500 mt-1.5">
                New accounts start at $0.00. A House Admin can fund your wallet from the Casino Hub.
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-lg font-black text-sm uppercase tracking-wider transition cursor-pointer disabled:opacity-50 ${
            mode === 'register'
              ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
              : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
          }`}
        >
          {loading
            ? mode === 'register'
              ? 'CREATING ACCOUNT...'
              : 'AUTHENTICATING...'
            : mode === 'register'
            ? 'REGISTER & ENTER TERMINAL'
            : 'ACCESS COMMAND TERMINAL'}
        </button>
      </form>
    </div>
  );
};
