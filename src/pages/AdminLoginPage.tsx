import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, ArrowLeft, KeyRound, Shield } from 'lucide-react';

interface AdminLoginPageProps {
  onLoginSuccess: (token: string, username: string) => void;
  onNavigateHome: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess, onNavigateHome }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // Just verify the API is reachable
    fetch('/api/admin/auth/status')
      .then(() => setAuthReady(true))
      .catch(() => setAuthReady(true));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

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
        throw new Error(data.error || 'Incorrect PIN. Please try again.');
      }
      onLoginSuccess(data.token, data.username || 'owner');
    } catch (err: any) {
      setErrorMessage(err.message || 'Incorrect PIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0D0D0D] text-[#F5F1E8]">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#C9A45C]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-sm w-full border border-[#C9A45C]/35 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 bg-[#181818] text-[#F5F1E8]">

        {/* Back link */}
        <div className="mb-6">
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 text-xs text-[#A5A5A5] hover:text-[#C9A45C] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Website</span>
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="font-serif-elegant text-2xl font-bold uppercase tracking-wider text-[#F5F1E8]">
            Golden Wizard
          </h1>
          <p className="text-[10px] tracking-[0.25em] text-[#C9A45C] uppercase font-semibold mt-1">
            Salon Owner Portal
          </p>
        </div>

        {/* Info box */}
        <div className="p-3 rounded-xl border border-white/10 mb-5 bg-[#121212]">
          <div className="flex items-center gap-1.5 text-[#C9A45C] font-semibold text-[11px] uppercase tracking-wide mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Authorized Owner Access</span>
          </div>
          <p className="text-[11px] text-[#A5A5A5] leading-relaxed">
            Enter your Owner PIN to access the Golden Wizard dashboard.
          </p>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 mb-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="flex-1">{errorMessage}</p>
          </div>
        )}

        {/* PIN form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-[#A5A5A5]">
              Owner PIN
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#C9A45C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                required
                maxLength={12}
                autoComplete="one-time-code"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter your 6–12 digit PIN"
                className="w-full pl-10 pr-10 py-3 rounded-xl text-base font-mono tracking-widest border bg-[#111111] border-white/15 text-[#F5F1E8] focus:border-[#C9A45C] focus:outline-none transition-colors"
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
          </div>

          <button
            type="submit"
            disabled={isLoading || !authReady}
            className="w-full py-3.5 px-4 font-bold text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D]"
          >
            <Lock className="w-4 h-4" />
            <span>{isLoading ? 'Verifying...' : 'Unlock Dashboard'}</span>
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
