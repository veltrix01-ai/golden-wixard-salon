import React, { useState } from 'react';
import { Shield, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

interface OwnerSecuritySettingsPanelProps {
  authToken: string;
  currentUsername: string;
  onUsernameUpdated?: (newUsername: string) => void;
  onToast?: (message: string) => void;
  onAuthError?: () => void;
}

export const OwnerSecuritySettingsPanel: React.FC<OwnerSecuritySettingsPanelProps> = ({
  authToken,
  onToast,
  onAuthError,
}) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPins, setShowPins] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!currentPin) {
      setStatus({ type: 'error', text: 'Please enter your current PIN.' });
      return;
    }
    if (!/^\d{6,12}$/.test(newPin)) {
      setStatus({ type: 'error', text: 'New PIN must be 6 to 12 numeric digits.' });
      return;
    }
    if (newPin !== confirmPin) {
      setStatus({ type: 'error', text: 'New PIN and confirmation do not match.' });
      return;
    }
    if (currentPin === newPin) {
      setStatus({ type: 'error', text: 'New PIN must be different from your current PIN.' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/security/pin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ currentPin, newPin, confirmPin }),
      });

      if (res.status === 401) {
        onAuthError?.();
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update PIN.');
      }

      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      const msg = data.message || 'Owner PIN updated successfully.';
      setStatus({ type: 'success', text: msg });
      onToast?.(msg);
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || 'Could not update PIN.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 border border-[#C6A15B]/30 rounded-xl bg-[#161616] text-[#F5F1E8] shadow-sm">

      {/* Header */}
      <div className="flex items-center gap-2 pb-4 border-b border-white/10 mb-6">
        <Shield className="w-4 h-4 text-[#C9A45C]" />
        <h3 className="font-serif-elegant font-bold text-base text-white">
          Owner Security — Change PIN
        </h3>
      </div>

      <form onSubmit={handleUpdatePin} className="space-y-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] text-white/60">
            Enter your current PIN to verify identity, then set a new 6–12 digit PIN.
            Your new PIN takes effect immediately and is saved securely to the database.
          </p>
          <button
            type="button"
            onClick={() => setShowPins(!showPins)}
            className="ml-4 shrink-0 text-[11px] text-white/60 hover:text-[#C9A45C] flex items-center gap-1 cursor-pointer"
          >
            {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showPins ? 'Hide' : 'Show'}</span>
          </button>
        </div>

        {status && (
          <div
            className={`p-3 rounded border text-xs flex items-center gap-2 ${
              status.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}
          >
            {status.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{status.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] uppercase text-white/60 mb-1.5">Current PIN</label>
            <div className="relative">
              <KeyRound className="w-3.5 h-3.5 text-[#C9A45C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPins ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={12}
                autoComplete="off"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Current PIN"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border bg-[#181818] border-white/15 text-sm font-mono text-white focus:border-[#C9A45C] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase text-white/60 mb-1.5">New PIN (6–12 digits)</label>
            <div className="relative">
              <KeyRound className="w-3.5 h-3.5 text-[#C9A45C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPins ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={12}
                autoComplete="off"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="New PIN"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border bg-[#181818] border-white/15 text-sm font-mono text-white focus:border-[#C9A45C] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase text-white/60 mb-1.5">Confirm New PIN</label>
            <div className="relative">
              <KeyRound className="w-3.5 h-3.5 text-[#C9A45C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPins ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={12}
                autoComplete="off"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Confirm PIN"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border bg-[#181818] border-white/15 text-sm font-mono text-white focus:border-[#C9A45C] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isSaving || !currentPin || !newPin || !confirmPin}
            className="px-6 py-2.5 bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-40"
          >
            {isSaving ? 'Saving...' : 'Update PIN'}
          </button>
        </div>
      </form>
    </div>
  );
};
