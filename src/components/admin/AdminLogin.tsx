import React, { useState } from 'react';
import { CrownIcon } from '../CrownIcon';
import { Lock, Shield, Eye, EyeOff, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackToPublicSite: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToPublicSite }) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPin = pin.trim();
    if (!/^\d{6,12}$/.test(cleanPin)) {
      setError('Please enter your configured 6+ digit Owner PIN.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/login-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: cleanPin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) {
        throw new Error(data.error || 'Incorrect Owner PIN.');
      }
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#C6A15B]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-md w-full bg-[#181818] border border-[#C6A15B]/40 rounded-sm p-8 shadow-2xl relative z-10">
        <button
          onClick={onBackToPublicSite}
          className="inline-flex items-center gap-1.5 text-xs text-[#EAE2D5]/70 hover:text-[#C6A15B] transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Public Website</span>
        </button>

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-[#111111] border border-[#C6A15B] flex items-center justify-center text-[#C6A15B] mx-auto mb-3 shadow-[0_0_20px_rgba(198,161,91,0.25)]">
            <CrownIcon className="w-7 h-7 text-[#C6A15B]" />
          </div>
          <h1 className="font-serif-elegant text-2xl font-bold text-[#F8F5EF] uppercase tracking-wider">
            Golden Wizard
          </h1>
          <p className="text-[10px] tracking-[0.25em] text-[#C6A15B] uppercase font-semibold">
            Private Salon Owner Portal
          </p>
        </div>

        <div className="p-3 bg-[#111111] rounded border border-white/10 mb-6 flex items-start gap-2.5 text-xs text-[#EAE2D5]/80">
          <Shield className="w-4 h-4 text-[#C6A15B] shrink-0 mt-0.5" />
          <span>Restricted Management Access. Enter your Owner PIN verified securely on the server.</span>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/50 border border-rose-500/50 rounded text-xs text-rose-300 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#EAE2D5] uppercase tracking-wider mb-2">
              Owner PIN
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#C6A15B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''));
                  if (error) setError('');
                }}
                placeholder="Enter 6+ digit Owner PIN"
                autoFocus
                className="w-full pl-10 pr-10 py-3 bg-[#111111] border border-white/15 focus:border-[#C6A15B] rounded-sm text-sm text-[#F8F5EF] placeholder-white/30 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                aria-label="Toggle PIN visibility"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#D6B979] via-[#C6A15B] to-[#B38D43] text-[#111111] font-bold text-xs uppercase tracking-wider rounded-sm hover:brightness-110 active:scale-[0.99] transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            <span>{isSubmitting ? 'Authenticating...' : 'Authenticate & Enter Dashboard'}</span>
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-[11px] text-white/40">
            Golden Wizard Professional Salon • Gandi Maisamma, Hyderabad
          </p>
        </div>
      </div>
    </div>
  );
};
