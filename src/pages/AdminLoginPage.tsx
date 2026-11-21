import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  KeyRound,
  Shield,
} from 'lucide-react';

interface AdminLoginPageProps {
  onLoginSuccess: (token: string, username: string) => void;
  onNavigateHome: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess, onNavigateHome }) => {
  const [authMode, setAuthMode] = useState<'loading' | 'login' | 'setup'>('loading');
  const [loginMethod, setLoginMethod] = useState<'password' | 'pin'>('password');
  const [pinConfigured, setPinConfigured] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/auth/status')
      .then((res) => (res.ok ? res.json() : { configured: true, pinConfigured: false }))
      .then((data) => {
        if (!active) return;
        setAuthMode(data?.configured === false ? 'setup' : 'login');
        setPinConfigured(Boolean(data?.pinConfigured));
      })
      .catch(() => {
        if (active) setAuthMode('login');
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (authMode === 'login' && loginMethod === 'pin') {
      const cleanPin = pin.trim();
      if (!/^\d{6,12}$/.test(cleanPin)) {
        setErrorMessage('Please enter your 6 to 12 digit Owner PIN.');
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch('/api/admin/login-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: cleanPin }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.token) {
          throw new Error(data.error || 'PIN authentication failed. Please verify your Owner PIN.');
        }
        onLoginSuccess(data.token, data.username || 'Owner');
      } catch (err: any) {
        setErrorMessage(err.message || 'PIN authentication failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    if (authMode === 'setup') {
      if (username.trim().length < 3) {
        setErrorMessage('Owner username must be at least 3 characters.');
        return;
      }
      if (password.length < 8) {
        setErrorMessage('Owner password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Password confirmation does not match.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const endpoint = authMode === 'setup' ? '/api/admin/setup' : '/api/admin/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) {
        if (res.status === 409 && authMode === 'setup') {
          setAuthMode('login');
        } else if (res.status === 409 && authMode === 'login') {
          setAuthMode('setup');
        }
        throw new Error(data.error || 'Authentication failed. Please verify your credentials.');
      }

      onLoginSuccess(data.token, data.username || username.trim());
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0D0D0D] text-[#F5F1E8]">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#C9A45C]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-md w-full border border-[#C9A45C]/35 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 bg-[#181818] text-[#F5F1E8]">
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 text-xs text-[#A5A5A5] hover:text-[#C9A45C] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Website</span>
          </button>
        </div>

        <div className="text-center mb-6">
          <h1 className="font-serif-elegant text-2xl font-bold uppercase tracking-wider text-[#F5F1E8]">
            Golden Wizard
          </h1>
          <p className="text-[10px] tracking-[0.25em] text-[#C9A45C] uppercase font-semibold">
            {authMode === 'setup' ? 'First-Run Owner Portal Setup' : 'Salon Owner & Manager Portal'}
          </p>
        </div>

        <div className="p-3 rounded-xl border border-white/10 mb-5 text-xs space-y-1 bg-[#121212]">
          <div className="flex items-center gap-1.5 text-[#C9A45C] font-semibold text-[11px] uppercase tracking-wide">
            <Shield className="w-3.5 h-3.5" />
            <span>
              {authMode === 'setup' ? 'Claim Owner Administration Account' : 'Authorized Owner Access'}
            </span>
          </div>
          <p className="text-[11px] text-[#A5A5A5] leading-relaxed">
            {authMode === 'setup'
              ? 'No owner password is set yet. Create your private username and strong password (min 8 characters) to lock this portal.'
              : 'Sign in with either your Owner Username & Password or your configured Owner PIN to manage your salon dashboard.'}
          </p>
        </div>

        {authMode === 'login' && (
          <div
            role="tablist"
            aria-label="Owner Login Method"
            className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#111111] border border-white/10 mb-5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={loginMethod === 'password'}
              onClick={() => {
                setLoginMethod('password');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                loginMethod === 'password'
                  ? 'bg-[#C9A45C] text-[#0D0D0D] shadow-sm'
                  : 'text-[#A5A5A5] hover:text-[#F5F1E8]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Username &amp; Password</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={loginMethod === 'pin'}
              onClick={() => {
                setLoginMethod('pin');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                loginMethod === 'pin'
                  ? 'bg-[#C9A45C] text-[#0D0D0D] shadow-sm'
                  : 'text-[#A5A5A5] hover:text-[#F5F1E8]'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Owner PIN</span>
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 mb-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="flex-1">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'login' && loginMethod === 'pin' ? (
            <div>
              {!pinConfigured && (
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-300 mb-4 leading-relaxed">
                  Owner PIN login has not been set up yet. Sign in using <strong>Username &amp; Password</strong> first, then configure your PIN in <strong>Settings → Owner Security &amp; Login Credentials</strong>.
                </div>
              )}
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[#A5A5A5]">
                Owner Security PIN
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#C9A45C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  required
                  maxLength={12}
                  autoComplete="one-time-code"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter your 6+ digit Owner PIN"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm font-mono tracking-widest border bg-[#111111] border-white/15 text-[#F5F1E8] focus:border-[#C9A45C] focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A5A5A5] hover:text-[#F5F1E8] cursor-pointer"
                  aria-label="Toggle PIN visibility"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-[#7A7A7A] mt-2">
                Provides full owner access to the exact same Golden Wizard Owner Dashboard.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[#A5A5A5]">
                  Owner Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#C9A45C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter owner username"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border bg-[#111111] border-white/15 text-[#F5F1E8] focus:border-[#C9A45C] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[#A5A5A5]">
                  Owner Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#C9A45C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={authMode === 'setup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={authMode === 'setup' ? 'Choose a strong password (min 8 chars)' : 'Enter password'}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border bg-[#111111] border-white/15 text-[#F5F1E8] focus:border-[#C9A45C] focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A5A5A5] hover:text-[#F5F1E8] cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authMode === 'setup' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[#A5A5A5]">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#C9A45C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border bg-[#111111] border-white/15 text-[#F5F1E8] focus:border-[#C9A45C] focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={isLoading || authMode === 'loading'}
            className="w-full mt-4 py-3.5 px-4 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D]"
          >
            <Lock className="w-4 h-4" />
            <span>
              {isLoading
                ? 'Authenticating...'
                : authMode === 'setup'
                ? 'Create Owner Account & Sign In'
                : loginMethod === 'pin'
                ? 'Unlock with Owner PIN'
                : 'Sign In to Owner Board'}
            </span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <p className="text-[11px] text-[#7A7A7A]">
            Protected Salon Owner &amp; Manager Administration
          </p>
        </div>
      </div>
    </div>
  );
};
