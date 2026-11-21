import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface OwnerCredentialsRecord {
  username?: string;
  passwordSalt?: string;
  passwordHash?: string;
  pinSalt?: string;
  pinHash?: string;
  claimedAt?: string;
  updatedAt: string;
}

interface LegacyClaimedAdminRecord {
  username?: string;
  salt?: string;
  hash?: string;
  passwordSalt?: string;
  passwordHash?: string;
  pinSalt?: string;
  pinHash?: string;
  claimedAt?: string;
  updatedAt?: string;
}

const ADMIN_AUTH_FILE_PATH = path.resolve(process.cwd(), '.data-admin-auth.json');

function hasPersistedPassword(
  record: OwnerCredentialsRecord | null
): record is OwnerCredentialsRecord & {
  username: string;
  passwordSalt: string;
  passwordHash: string;
} {
  return Boolean(record?.username && record?.passwordSalt && record?.passwordHash);
}

function loadOwnerCredentials(): OwnerCredentialsRecord | null {
  try {
    if (!fs.existsSync(ADMIN_AUTH_FILE_PATH)) {
      return null;
    }
    const raw = JSON.parse(fs.readFileSync(ADMIN_AUTH_FILE_PATH, 'utf-8')) as LegacyClaimedAdminRecord;
    const passwordSalt = raw.passwordSalt || raw.salt || undefined;
    const passwordHash = raw.passwordHash || raw.hash || undefined;
    const hasPassword = Boolean(raw?.username && passwordSalt && passwordHash);
    const hasPin = Boolean(raw?.pinSalt && raw?.pinHash);
    if (hasPassword || hasPin) {
      const normalized: OwnerCredentialsRecord = {
        ...(raw.username ? { username: raw.username } : {}),
        ...(passwordSalt && passwordHash ? { passwordSalt, passwordHash } : {}),
        ...(raw.pinSalt && raw.pinHash ? { pinSalt: raw.pinSalt, pinHash: raw.pinHash } : {}),
        ...(raw.claimedAt ? { claimedAt: raw.claimedAt } : {}),
        updatedAt: raw.updatedAt || raw.claimedAt || new Date().toISOString(),
      };
      return normalized;
    }
  } catch (err) {
    console.error('Error loading owner credential store:', err);
  }
  return null;
}

let persistedOwner: OwnerCredentialsRecord | null = loadOwnerCredentials();

function saveOwnerCredentials(record: OwnerCredentialsRecord): void {
  persistedOwner = record;
  fs.writeFileSync(ADMIN_AUTH_FILE_PATH, JSON.stringify(record, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });
}

export function timingSafeTextEqual(a: string, b: string): boolean {
  const digestA = crypto.createHash('sha256').update(a).digest();
  const digestB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

export function hashScryptSecret(secret: string, salt?: string): { salt: string; hash: string } {
  const effectiveSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(secret, effectiveSalt, 64).toString('hex');
  return { salt: effectiveSalt, hash };
}

export function verifyScryptSecret(secret: string, salt: string, expectedHex: string): boolean {
  try {
    const derived = crypto.scryptSync(secret, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function isValidUsernameFormat(username: string): boolean {
  return /^[a-zA-Z0-9._@-]{3,60}$/.test(username.trim());
}

export function isWeakPin(pin: string): boolean {
  if (!/^\d{6,12}$/.test(pin)) return true;

  // Block repeated single digits like 000000, 111111, 99999999
  if (/^(\d)\1+$/.test(pin)) return true;

  // Block trivial repeating pairs or triples like 121212, 123123, 112233
  if (/^(\d{2})\1+$/.test(pin) || /^(\d{3})\1+$/.test(pin)) return true;
  if (pin.length === 6 && pin[0] === pin[1] && pin[2] === pin[3] && pin[4] === pin[5]) return true;

  // Block simple ascending or descending step-1 sequences (e.g. 123456, 654321, 012345, 543210)
  let ascending = true;
  let descending = true;
  for (let i = 1; i < pin.length; i++) {
    const prev = Number(pin[i - 1]);
    const curr = Number(pin[i]);
    if ((prev + 1) % 10 !== curr) ascending = false;
    if ((prev + 9) % 10 !== curr) descending = false;
  }
  if (ascending || descending) return true;

  const blockedExact = new Set([
    '123456',
    '654321',
    '000000',
    '111111',
    '222222',
    '333333',
    '444444',
    '555555',
    '666666',
    '777777',
    '888888',
    '999999',
    '12345678',
    '87654321',
    '112233',
    '121212',
    '123123',
    '012345',
    '543210',
  ]);
  return blockedExact.has(pin);
}

export function isOwnerConfigured(envPassword: string): boolean {
  return Boolean(hasPersistedPassword(persistedOwner) || envPassword);
}

export function getAuthMode(envPassword: string): 'claimed' | 'env' | 'unconfigured' {
  if (hasPersistedPassword(persistedOwner)) return 'claimed';
  if (envPassword) return 'env';
  return 'unconfigured';
}

export function isPinConfigured(): boolean {
  return Boolean(persistedOwner?.pinHash && persistedOwner?.pinSalt);
}

export function getEffectiveOwnerLabel(envUsername: string): string {
  return persistedOwner?.username || envUsername || 'goldenwizard_admin';
}

export function claimInitialOwner(username: string, password: string): OwnerCredentialsRecord & {
  username: string;
  passwordSalt: string;
  passwordHash: string;
} {
  const cleanUsername = username.trim();
  const { salt, hash } = hashScryptSecret(password);
  const nowIso = new Date().toISOString();
  const record: OwnerCredentialsRecord & {
    username: string;
    passwordSalt: string;
    passwordHash: string;
  } = {
    username: cleanUsername,
    passwordSalt: salt,
    passwordHash: hash,
    ...(persistedOwner?.pinSalt && persistedOwner?.pinHash
      ? { pinSalt: persistedOwner.pinSalt, pinHash: persistedOwner.pinHash }
      : {}),
    claimedAt: nowIso,
    updatedAt: nowIso,
  };
  saveOwnerCredentials(record);
  return record;
}

export function verifyOwnerPasswordLogin(
  username: string,
  password: string,
  envUsername: string,
  envPassword: string
): { ok: boolean; effectiveUsername: string } {
  const cleanUsername = username.trim().toLowerCase();

  if (hasPersistedPassword(persistedOwner)) {
    const userOk = timingSafeTextEqual(cleanUsername, persistedOwner.username.toLowerCase());
    const passOk = verifyScryptSecret(password, persistedOwner.passwordSalt, persistedOwner.passwordHash);
    return {
      ok: userOk && passOk,
      effectiveUsername: persistedOwner.username,
    };
  }

  if (envPassword) {
    const expectedUser = (envUsername || 'goldenwizard_admin').toLowerCase();
    const userOk = timingSafeTextEqual(cleanUsername, expectedUser);
    const passOk = timingSafeTextEqual(password, envPassword);
    return {
      ok: userOk && passOk,
      effectiveUsername: envUsername || 'goldenwizard_admin',
    };
  }

  return { ok: false, effectiveUsername: 'goldenwizard_admin' };
}

export function verifyCurrentOwnerPassword(
  password: string,
  envPassword: string
): boolean {
  if (!password) return false;
  if (hasPersistedPassword(persistedOwner)) {
    return verifyScryptSecret(password, persistedOwner.passwordSalt, persistedOwner.passwordHash);
  }
  if (envPassword) {
    return timingSafeTextEqual(password, envPassword);
  }
  return false;
}

export function verifyOwnerPinLogin(
  pin: string,
  envUsername = ''
): { ok: boolean; effectiveUsername: string } {
  const effectiveUsername = persistedOwner?.username || envUsername || 'goldenwizard_admin';
  if (!persistedOwner?.pinHash || !persistedOwner?.pinSalt) {
    return { ok: false, effectiveUsername };
  }
  const ok = verifyScryptSecret(pin, persistedOwner.pinSalt, persistedOwner.pinHash);
  return {
    ok,
    effectiveUsername,
  };
}

function ensurePersistedRecord(envUsername: string, envPassword: string): OwnerCredentialsRecord & {
  username: string;
  passwordSalt: string;
  passwordHash: string;
} {
  if (hasPersistedPassword(persistedOwner)) return persistedOwner;
  if (!envPassword) {
    throw new Error('Owner account has not been initialized yet.');
  }
  const { salt, hash } = hashScryptSecret(envPassword);
  const nowIso = new Date().toISOString();
  const initial: OwnerCredentialsRecord & {
    username: string;
    passwordSalt: string;
    passwordHash: string;
  } = {
    username: persistedOwner?.username || envUsername || 'goldenwizard_admin',
    passwordSalt: salt,
    passwordHash: hash,
    ...(persistedOwner?.pinSalt && persistedOwner?.pinHash
      ? { pinSalt: persistedOwner.pinSalt, pinHash: persistedOwner.pinHash }
      : {}),
    claimedAt: persistedOwner?.claimedAt || nowIso,
    updatedAt: nowIso,
  };
  saveOwnerCredentials(initial);
  return initial;
}

export function updateOwnerUsername(
  newUsername: string,
  envUsername: string,
  envPassword: string
): { previousUsername: string; updatedUsername: string } {
  const cleanNew = newUsername.trim();
  const base = ensurePersistedRecord(envUsername, envPassword);
  const previousUsername = base.username;
  const updated: OwnerCredentialsRecord = {
    ...base,
    username: cleanNew,
    updatedAt: new Date().toISOString(),
  };
  saveOwnerCredentials(updated);
  return {
    previousUsername,
    updatedUsername: cleanNew,
  };
}

export function updateOwnerPassword(
  currentPassword: string,
  newPassword: string,
  envUsername: string,
  envPassword: string
): { ok: boolean; error?: string } {
  if (!verifyCurrentOwnerPassword(currentPassword, envPassword)) {
    return { ok: false, error: 'Current password is incorrect.' };
  }
  if (timingSafeTextEqual(currentPassword, newPassword)) {
    return { ok: false, error: 'New password must be different from your current password.' };
  }
  const base = ensurePersistedRecord(envUsername, envPassword);
  const { salt, hash } = hashScryptSecret(newPassword);
  saveOwnerCredentials({
    ...base,
    passwordSalt: salt,
    passwordHash: hash,
    updatedAt: new Date().toISOString(),
  });
  return { ok: true };
}

export function initializeFirstTimePin(newPin: string): { ok: boolean; error?: string } {
  if (isPinConfigured()) {
    return { ok: false, error: 'Owner PIN is already configured and cannot be overwritten here.' };
  }
  if (isWeakPin(newPin)) {
    return {
      ok: false,
      error:
        'Please choose a stronger 6+ digit PIN (avoid repeating digits like 111111 or sequential patterns like 123456).',
    };
  }
  const { salt, hash } = hashScryptSecret(newPin);
  saveOwnerCredentials({
    ...(persistedOwner || {}),
    pinSalt: salt,
    pinHash: hash,
    updatedAt: new Date().toISOString(),
  });
  return { ok: true };
}

export function updateOwnerPin(
  params: {
    currentPin?: string;
    currentPassword?: string;
    newPin: string;
  },
  envUsername: string,
  envPassword: string
): { ok: boolean; error?: string } {
  const pinExists = isPinConfigured();

  if (pinExists) {
    if (!params.currentPin) {
      return { ok: false, error: 'Please enter your current Owner PIN to change it.' };
    }
    if (!verifyOwnerPinLogin(params.currentPin, envUsername).ok) {
      return { ok: false, error: 'Current Owner PIN is incorrect.' };
    }
    if (params.currentPin === params.newPin) {
      return { ok: false, error: 'New PIN must be different from your current PIN.' };
    }
  } else {
    if (!params.currentPassword) {
      return {
        ok: false,
        error: 'Please enter your current owner password to confirm setting a new Owner PIN.',
      };
    }
    if (!verifyCurrentOwnerPassword(params.currentPassword, envPassword)) {
      return { ok: false, error: 'Current owner password is incorrect.' };
    }
  }

  if (isWeakPin(params.newPin)) {
    return {
      ok: false,
      error:
        'Please choose a stronger 6+ digit PIN (avoid repeating digits like 111111 or sequential patterns like 123456).',
    };
  }

  const base = hasPersistedPassword(persistedOwner)
    ? persistedOwner
    : envPassword
    ? ensurePersistedRecord(envUsername, envPassword)
    : persistedOwner || { updatedAt: new Date().toISOString() };

  const { salt, hash } = hashScryptSecret(params.newPin);
  saveOwnerCredentials({
    ...base,
    pinSalt: salt,
    pinHash: hash,
    updatedAt: new Date().toISOString(),
  });
  return { ok: true };
}

// ============================================================================
// LOGIN FAILURE RATE LIMITER & LOCKOUT (Protects Password & PIN Login)
// ============================================================================
interface FailureWindow {
  attempts: number[];
  lockedUntil: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const loginFailuresByIp = new Map<string, FailureWindow>();

export function checkLoginAllowed(ip: string): { allowed: boolean; retryAfterMinutes?: number } {
  const now = Date.now();
  const entry = loginFailuresByIp.get(ip);
  if (!entry) return { allowed: true };

  if (entry.lockedUntil > now) {
    const mins = Math.max(1, Math.ceil((entry.lockedUntil - now) / 60000));
    return { allowed: false, retryAfterMinutes: mins };
  }

  entry.attempts = entry.attempts.filter((t) => now - t < WINDOW_MS);
  if (entry.attempts.length === 0) {
    loginFailuresByIp.delete(ip);
  }
  return { allowed: true };
}

export function recordFailedLogin(ip: string): { locked: boolean; attemptsRemaining: number } {
  const now = Date.now();
  const entry = loginFailuresByIp.get(ip) || { attempts: [], lockedUntil: 0 };
  entry.attempts = entry.attempts.filter((t) => now - t < WINDOW_MS);
  entry.attempts.push(now);

  let locked = false;
  if (entry.attempts.length >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
    locked = true;
  }

  loginFailuresByIp.set(ip, entry);
  return {
    locked,
    attemptsRemaining: Math.max(0, MAX_FAILED_ATTEMPTS - entry.attempts.length),
  };
}

export function resetLoginFailures(ip: string): void {
  loginFailuresByIp.delete(ip);
}

export function clearRateLimiterForTests(): void {
  loginFailuresByIp.clear();
}
