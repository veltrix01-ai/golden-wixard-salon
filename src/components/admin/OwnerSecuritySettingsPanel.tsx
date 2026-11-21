import React, { useState, useEffect } from 'react';
import {
  Shield,
  User,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface OwnerSecuritySettingsPanelProps {
  authToken: string;
  currentUsername: string;
  onUsernameUpdated?: (newUsername: string) => void;
  onToast?: (message: string) => void;
  onAuthError?: () => void;
}

export const OwnerSecuritySettingsPanel: React.FC<OwnerSecuritySettingsPanelProps> = ({
  authToken,
  currentUsername,
  onUsernameUpdated,
  onToast,
  onAuthError,
}) => {
  const [pinConfigured, setPinConfigured] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
  const [activeUsername, setActiveUsername] = useState<string>(currentUsername);

  // Username form state
  const [newUsername, setNewUsername] = useState('');
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // PIN form state
  const [pinCurrentSecret, setPinCurrentSecret] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPins, setShowPins] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [pinStatus, setPinStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setActiveUsername(currentUsername);
  }, [currentUsername]);

  useEffect(() => {
    let active = true;
    setLoadingStatus(true);
    fetch('/api/admin/me', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          onAuthError?.();
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data) => {
        if (!active || !data) return;
        if (data.username) setActiveUsername(data.username);
        setPinConfigured(Boolean(data.pinConfigured));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingStatus(false);
      });

    return () => {
      active = false;
    };
  }, [authToken]);

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameStatus(null);
    const cleaned = newUsername.trim();
    if (!/^[a-zA-Z0-9._@-]{3,60}$/.test(cleaned)) {
      setUsernameStatus({
        type: 'error',
        text: 'Username must be 3–60 characters and use only letters, numbers, dots, underscores, @, or hyphens.',
      });
      return;
    }

    setIsSavingUsername(true);
    try {
      const res = await fetch('/api/admin/security/username', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ newUsername: cleaned }),
      });

      if (res.status === 401) {
        onAuthError?.();
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update owner username.');
      }

      setActiveUsername(data.username || cleaned);
      setNewUsername('');
      onUsernameUpdated?.(data.username || cleaned);
      const msg = data.message || 'Owner username updated successfully.';
      setUsernameStatus({ type: 'success', text: msg });
      onToast?.(msg);
    } catch (err: any) {
      setUsernameStatus({ type: 'error', text: err.message || 'Could not update username.' });
    } finally {
      setIsSavingUsername(false);
    }
  };

  const getPasswordStrength = (pw: string): { label: string; colorClass: string } => {
    if (!pw) return { label: '', colorClass: '' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    if (score >= 4) return { label: 'Strong', colorClass: 'text-emerald-400' };
    if (score >= 2) return { label: 'Moderate', colorClass: 'text-amber-400' };
    return { label: 'Weak (use 8+ chars with letters & numbers)', colorClass: 'text-rose-400' };
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (!currentPassword) {
      setPasswordStatus({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordStatus({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await fetch('/api/admin/security/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      if (res.status === 401) {
        onAuthError?.();
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      const msg = data.message || 'Owner password updated securely.';
      setPasswordStatus({ type: 'success', text: msg });
      onToast?.(msg);
    } catch (err: any) {
      setPasswordStatus({ type: 'error', text: err.message || 'Could not update password.' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinStatus(null);

    if (!pinCurrentSecret) {
      setPinStatus({
        type: 'error',
        text: pinConfigured
          ? 'Please enter your current Owner PIN.'
          : 'Please enter your current owner password to confirm setting a PIN.',
      });
      return;
    }

    if (!/^\d{6,12}$/.test(newPin)) {
      setPinStatus({ type: 'error', text: 'New Owner PIN must be 6 to 12 numeric digits.' });
      return;
    }

    if (newPin !== confirmPin) {
      setPinStatus({ type: 'error', text: 'New PIN and confirmation PIN do not match.' });
      return;
    }

    setIsSavingPin(true);
    try {
      const payload = pinConfigured
        ? { currentPin: pinCurrentSecret, newPin, confirmPin }
        : { currentPassword: pinCurrentSecret, newPin, confirmPin };

      const res = await fetch('/api/admin/security/pin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        onAuthError?.();
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update Owner PIN.');
      }

      setPinConfigured(true);
      setPinCurrentSecret('');
      setNewPin('');
      setConfirmPin('');
      const msg = data.message || 'Owner PIN updated securely.';
      setPinStatus({ type: 'success', text: msg });
      onToast?.(msg);
    } catch (err: any) {
      setPinStatus({ type: 'error', text: err.message || 'Could not update Owner PIN.' });
    } finally {
      setIsSavingPin(false);
    }
  };

  const pwStrength = getPasswordStrength(newPassword);

  return (
    <div className="p-6 border border-[#C6A15B]/30 rounded-xl space-y-6 bg-[#161616] text-[#F5F1E8] shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2 text-[#C9A45C]">
          <Shield className="w-4 h-4" />
          <h3 className="font-serif-elegant font-bold text-base text-white">
            Owner Security &amp; Login Credentials
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/75">
            Username: <strong className="text-[#D6B979]">{activeUsername || 'Owner'}</strong>
          </span>
          <span
            className={`px-2 py-0.5 rounded border font-semibold ${
              loadingStatus
                ? 'bg-white/5 border-white/10 text-white/50'
                : pinConfigured
                ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/60 border-amber-500/30 text-amber-300'
            }`}
          >
            {loadingStatus ? 'Checking PIN...' : pinConfigured ? 'PIN Active' : 'PIN Not Set'}
          </span>
        </div>
      </div>

      {/* A. Change Owner Username */}
      <form onSubmit={handleUpdateUsername} className="p-4 bg-[#121212] border border-white/10 rounded-lg space-y-3">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-[#C6A15B]" />
          <h4 className="font-semibold text-xs uppercase tracking-wider text-[#E3C78D]">
            A. Change Owner Username
          </h4>
        </div>
        <p className="text-[11px] text-white/60">
          Updates the login username immediately without logging you out of your current session.
        </p>

        {usernameStatus && (
          <div
            className={`p-2.5 rounded border text-xs flex items-center gap-2 ${
              usernameStatus.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}
          >
            {usernameStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{usernameStatus.text}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder={`Current: ${activeUsername || 'owner'} — enter new username`}
            minLength={3}
            maxLength={60}
            className="flex-1 p-2.5 rounded-lg border bg-[#181818] border-white/15 text-xs text-white focus:border-[#C9A45C] focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSavingUsername || !newUsername.trim()}
            className="px-4 py-2.5 bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-40"
          >
            {isSavingUsername ? 'Updating...' : 'Update Username'}
          </button>
        </div>
      </form>

      {/* B. Change Owner Password */}
      <form onSubmit={handleUpdatePassword} className="p-4 bg-[#121212] border border-white/10 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#C6A15B]" />
            <h4 className="font-semibold text-xs uppercase tracking-wider text-[#E3C78D]">
              B. Change Owner Password
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className="text-[11px] text-white/60 hover:text-[#C9A45C] flex items-center gap-1 cursor-pointer"
          >
            {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showPasswords ? 'Hide' : 'Show'}</span>
          </button>
        </div>

        {passwordStatus && (
          <div
            className={`p-2.5 rounded border text-xs flex items-center gap-2 ${
              passwordStatus.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}
          >
            {passwordStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{passwordStatus.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[10px] uppercase text-white/60 mb-1">Current Password</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="w-full p-2.5 rounded-lg border bg-[#181818] border-white/15 text-white focus:border-[#C9A45C] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase text-white/60 mb-1">New Password (8+ chars)</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full p-2.5 rounded-lg border bg-[#181818] border-white/15 text-white focus:border-[#C9A45C] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase text-white/60 mb-1">Confirm Password</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full p-2.5 rounded-lg border bg-[#181818] border-white/15 text-white focus:border-[#C9A45C] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <span className={`text-[11px] ${pwStrength.colorClass || 'text-white/40'}`}>
            {pwStrength.label ? `Strength: ${pwStrength.label}` : 'Stored securely with cryptographic scrypt hashing.'}
          </span>
          <button
            type="submit"
            disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="px-4 py-2 bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-40"
          >
            {isSavingPassword ? 'Saving Password...' : 'Update Password'}
          </button>
        </div>
      </form>

      {/* C. Owner PIN Management */}
      <form onSubmit={handleUpdatePin} className="p-4 bg-[#121212] border border-white/10 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#C6A15B]" />
            <h4 className="font-semibold text-xs uppercase tracking-wider text-[#E3C78D]">
              C. {loadingStatus ? 'Owner PIN Security' : pinConfigured ? 'Change Owner PIN' : 'Set up Owner PIN'}
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setShowPins(!showPins)}
            className="text-[11px] text-white/60 hover:text-[#C9A45C] flex items-center gap-1 cursor-pointer"
          >
            {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showPins ? 'Hide' : 'Show'}</span>
          </button>
        </div>

        {loadingStatus ? (
          <div className="py-4 text-xs text-white/60">
            Checking current Owner PIN status with the server...
          </div>
        ) : (
          <>
            <p className="text-[11px] text-white/60">
              {pinConfigured
                ? 'Update your existing 6–12 digit Owner PIN. Your previous PIN is immediately invalidated once saved.'
                : 'No Owner PIN is configured yet. Confirm your current owner password to set up your 6–12 digit PIN for quick dashboard login.'}
            </p>

            {pinStatus && (
              <div
                className={`p-2.5 rounded border text-xs flex items-center gap-2 ${
                  pinStatus.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                }`}
              >
                {pinStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{pinStatus.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[10px] uppercase text-white/60 mb-1">
                  {pinConfigured ? 'Current Owner PIN' : 'Confirm Current Password'}
                </label>
                <input
                  name={pinConfigured ? 'current-owner-pin' : 'owner-pin-current-password'}
                  type={showPins ? 'text' : 'password'}
                  autoComplete={pinConfigured ? 'off' : 'current-password'}
                  inputMode={pinConfigured ? 'numeric' : undefined}
                  value={pinCurrentSecret}
                  onChange={(e) => {
                    setPinStatus(null);
                    setPinCurrentSecret(pinConfigured ? e.target.value.replace(/\D/g, '') : e.target.value);
                  }}
                  placeholder={pinConfigured ? 'Enter current PIN' : 'Enter current owner password'}
                  className="w-full p-2.5 rounded-lg border bg-[#181818] border-white/15 text-white focus:border-[#C9A45C] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-white/60 mb-1">New Owner PIN (6–12 digits)</label>
                <input
                  name="new-owner-pin"
                  type={showPins ? 'text' : 'password'}
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={12}
                  value={newPin}
                  onChange={(e) => {
                    setPinStatus(null);
                    setNewPin(e.target.value.replace(/\D/g, ''));
                  }}
                  placeholder="Enter 6–12 digit PIN"
                  className="w-full p-2.5 rounded-lg border bg-[#181818] border-white/15 text-white font-mono tracking-widest focus:border-[#C9A45C] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-white/60 mb-1">Confirm New PIN</label>
                <input
                  name="confirm-owner-pin"
                  type={showPins ? 'text' : 'password'}
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={12}
                  value={confirmPin}
                  onChange={(e) => {
                    setPinStatus(null);
                    setConfirmPin(e.target.value.replace(/\D/g, ''));
                  }}
                  placeholder="Re-enter new PIN"
                  className="w-full p-2.5 rounded-lg border bg-[#181818] border-white/15 text-white font-mono tracking-widest focus:border-[#C9A45C] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-white/40">
                PIN is hashed on the server and never visible after saving.
              </span>
              <button
                type="submit"
                disabled={isSavingPin || !pinCurrentSecret || !newPin || !confirmPin}
                className="px-4 py-2 bg-[#C9A45C] hover:bg-[#D6B979] text-[#0D0D0D] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-40"
              >
                {isSavingPin ? 'Saving PIN...' : pinConfigured ? 'Update Owner PIN' : 'Set up Owner PIN'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};
