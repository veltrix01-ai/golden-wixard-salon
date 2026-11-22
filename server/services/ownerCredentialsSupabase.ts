/**
 * Owner Credentials — Supabase persistence layer
 *
 * This module reads and writes the salon owner's hashed credentials
 * to the Supabase `owner_credentials` table so changes persist across
 * Vercel serverless cold starts and redeployments.
 *
 * The service-role key is used exclusively — this table is never
 * accessible via the anon key or from browser code.
 *
 * Passwords and PINs are always scrypt-hashed BEFORE being passed
 * to these functions. Plaintext secrets are never stored.
 */

import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Inline crypto helpers (avoid importing ownerAuthService to prevent
// circular dependency issues in Vercel's module bundler)
// ---------------------------------------------------------------------------

function hashScryptSecret(secret: string, salt?: string): { salt: string; hash: string } {
  const effectiveSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(secret, effectiveSalt, 64).toString('hex');
  return { salt: effectiveSalt, hash };
}

function verifyScryptSecret(secret: string, salt: string, expectedHex: string): boolean {
  try {
    const derived = crypto.scryptSync(secret, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function timingSafeTextEqual(a: string, b: string): boolean {
  const digestA = crypto.createHash('sha256').update(a).digest();
  const digestB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SupabaseOwnerRecord {
  id: number;
  username: string;
  password_salt: string;
  password_hash: string;
  pin_salt: string | null;
  pin_hash: string | null;
  pin_enabled: boolean;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Supabase REST helpers (uses service-role key — bypasses RLS)
// ---------------------------------------------------------------------------

function getSupabaseConfig() {
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return { url, serviceKey };
}

function isConfigured(): boolean {
  const { url, serviceKey } = getSupabaseConfig();
  return Boolean(url && serviceKey && serviceKey.startsWith('eyJ'));
}

async function supabaseFetch(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<Response> {
  const { url, serviceKey } = getSupabaseConfig();
  return fetch(`${url}/rest/v1${path}`, {
    method: options.method || 'GET',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: options.method === 'POST' ? 'return=representation' : 'return=representation',
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load the owner record from Supabase.
 * Returns null if Supabase is not configured or the row doesn't exist yet.
 */
export async function loadOwnerFromSupabase(): Promise<SupabaseOwnerRecord | null> {
  if (!isConfigured()) return null;
  try {
    const res = await supabaseFetch('/owner_credentials?id=eq.1&select=*&limit=1');
    if (!res.ok) return null;
    const rows = await res.json() as SupabaseOwnerRecord[];
    return rows[0] || null;
  } catch {
    return null;
  }
}

/**
 * Save (upsert) the owner record to Supabase.
 * Uses id=1 always — single-row table.
 */
export async function saveOwnerToSupabase(record: Omit<SupabaseOwnerRecord, 'id'>): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const res = await supabaseFetch('/owner_credentials', {
      method: 'POST',
      body: {
        id: 1,
        ...record,
        updated_at: new Date().toISOString(),
      },
    });
    // Supabase upsert: if row exists, use PATCH instead
    if (res.status === 409 || res.status === 422) {
      // Row already exists — update it
      const patch = await supabaseFetch('/owner_credentials?id=eq.1', {
        method: 'PATCH',
        body: {
          ...record,
          updated_at: new Date().toISOString(),
        },
      });
      return patch.ok;
    }
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Upsert helper — always use this to create or update the owner record.
 */
export async function upsertOwnerToSupabase(record: Omit<SupabaseOwnerRecord, 'id'>): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    // Try PATCH first (update existing row)
    const patch = await supabaseFetch('/owner_credentials?id=eq.1', {
      method: 'PATCH',
      body: {
        ...record,
        updated_at: new Date().toISOString(),
      },
    });
    if (patch.ok) return true;

    // Row doesn't exist — INSERT
    const insert = await supabaseFetch('/owner_credentials', {
      method: 'POST',
      body: {
        id: 1,
        ...record,
        updated_at: new Date().toISOString(),
      },
    });
    return insert.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Credential verification helpers (used in api/index.ts)
// ---------------------------------------------------------------------------

/**
 * Verify a password against the Supabase-stored scrypt hash.
 * Falls back to env var comparison if no Supabase record exists.
 */
export async function verifyOwnerPasswordFromSupabase(
  username: string,
  password: string,
  envUsername: string,
  envPassword: string
): Promise<{ ok: boolean; effectiveUsername: string; source: 'supabase' | 'env' }> {
  const record = await loadOwnerFromSupabase();

  if (record) {
    const userOk = timingSafeTextEqual(
      username.trim().toLowerCase(),
      record.username.toLowerCase()
    );
    const passOk = verifyScryptSecret(password, record.password_salt, record.password_hash);
    return {
      ok: userOk && passOk,
      effectiveUsername: record.username,
      source: 'supabase',
    };
  }

  // Fall back to env vars
  const expectedUser = (envUsername || 'goldenwizard_admin').toLowerCase();
  const userOk = timingSafeTextEqual(username.trim().toLowerCase(), expectedUser);
  const passOk = timingSafeTextEqual(password, envPassword);
  return {
    ok: userOk && passOk,
    effectiveUsername: envUsername || 'goldenwizard_admin',
    source: 'env',
  };
}

/**
 * Update the owner's username in Supabase.
 * Requires the current password for verification.
 */
export async function updateOwnerUsernameInSupabase(
  newUsername: string,
  currentPassword: string,
  envUsername: string,
  envPassword: string
): Promise<{ ok: boolean; error?: string }> {
  const record = await loadOwnerFromSupabase();

  if (record) {
    // Verify current password before allowing username change
    const passOk = verifyScryptSecret(currentPassword, record.password_salt, record.password_hash);
    if (!passOk) return { ok: false, error: 'Current password is incorrect.' };

    const saved = await upsertOwnerToSupabase({
      ...record,
      username: newUsername.trim(),
    });
    return saved ? { ok: true } : { ok: false, error: 'Failed to save username to database.' };
  }

  // No Supabase record yet — create one from env vars
  if (!envPassword) return { ok: false, error: 'Owner credentials are not yet configured in Supabase.' };
  const passOk = timingSafeTextEqual(currentPassword, envPassword);
  if (!passOk) return { ok: false, error: 'Current password is incorrect.' };

  const { salt, hash } = hashScryptSecret(envPassword);
  const saved = await upsertOwnerToSupabase({
    username: newUsername.trim(),
    password_salt: salt,
    password_hash: hash,
    pin_salt: null,
    pin_hash: null,
    pin_enabled: false,
  });
  return saved ? { ok: true } : { ok: false, error: 'Failed to save credentials to database.' };
}

/**
 * Update the owner's password in Supabase.
 */
export async function updateOwnerPasswordInSupabase(
  currentPassword: string,
  newPassword: string,
  envUsername: string,
  envPassword: string
): Promise<{ ok: boolean; error?: string }> {
  const record = await loadOwnerFromSupabase();

  if (record) {
    const passOk = verifyScryptSecret(currentPassword, record.password_salt, record.password_hash);
    if (!passOk) return { ok: false, error: 'Current password is incorrect.' };
    if (timingSafeTextEqual(currentPassword, newPassword)) {
      return { ok: false, error: 'New password must be different from your current password.' };
    }

    const { salt, hash } = hashScryptSecret(newPassword);
    const saved = await upsertOwnerToSupabase({
      ...record,
      password_salt: salt,
      password_hash: hash,
    });
    return saved ? { ok: true } : { ok: false, error: 'Failed to save new password to database.' };
  }

  // No Supabase record yet — create from env vars
  if (!envPassword) return { ok: false, error: 'Owner credentials are not yet configured in Supabase.' };
  const passOk = timingSafeTextEqual(currentPassword, envPassword);
  if (!passOk) return { ok: false, error: 'Current password is incorrect.' };

  const { salt, hash } = hashScryptSecret(newPassword);
  const saved = await upsertOwnerToSupabase({
    username: envUsername || 'goldenwizard_admin',
    password_salt: salt,
    password_hash: hash,
    pin_salt: null,
    pin_hash: null,
    pin_enabled: false,
  });
  return saved ? { ok: true } : { ok: false, error: 'Failed to save credentials to database.' };
}

/**
 * Update the owner's PIN in Supabase.
 */
export async function updateOwnerPinInSupabase(
  params: { currentPin?: string; currentPassword?: string; newPin: string },
  envUsername: string,
  envPassword: string
): Promise<{ ok: boolean; error?: string }> {
  const record = await loadOwnerFromSupabase();

  const pinExists = record?.pin_hash && record?.pin_salt && record?.pin_enabled;

  if (record) {
    if (pinExists) {
      if (!params.currentPin) return { ok: false, error: 'Please enter your current Owner PIN.' };
      const pinOk = verifyScryptSecret(params.currentPin, record.pin_salt!, record.pin_hash!);
      if (!pinOk) return { ok: false, error: 'Current Owner PIN is incorrect.' };
    } else {
      if (!params.currentPassword) return { ok: false, error: 'Please enter your current password to set a PIN.' };
      const passOk = verifyScryptSecret(params.currentPassword, record.password_salt, record.password_hash);
      if (!passOk) return { ok: false, error: 'Current password is incorrect.' };
    }

    const { salt, hash } = hashScryptSecret(params.newPin);
    const saved = await upsertOwnerToSupabase({
      ...record,
      pin_salt: salt,
      pin_hash: hash,
      pin_enabled: true,
    });
    return saved ? { ok: true } : { ok: false, error: 'Failed to save PIN to database.' };
  }

  // No record — create from env
  if (!params.currentPassword) return { ok: false, error: 'Please enter your current password to set a PIN.' };
  const passOk = timingSafeTextEqual(params.currentPassword, envPassword);
  if (!passOk) return { ok: false, error: 'Current password is incorrect.' };

  const { salt: pSalt, hash: pHash } = hashScryptSecret(envPassword);
  const { salt: pinSalt, hash: pinHash } = hashScryptSecret(params.newPin);
  const saved = await upsertOwnerToSupabase({
    username: envUsername || 'goldenwizard_admin',
    password_salt: pSalt,
    password_hash: pHash,
    pin_salt: pinSalt,
    pin_hash: pinHash,
    pin_enabled: true,
  });
  return saved ? { ok: true } : { ok: false, error: 'Failed to save PIN to database.' };
}

/**
 * Check if a Supabase-stored record exists and has a PIN configured.
 */
export async function isPinConfiguredInSupabase(): Promise<boolean> {
  const record = await loadOwnerFromSupabase();
  return Boolean(record?.pin_hash && record?.pin_salt && record?.pin_enabled);
}

/**
 * Verify a PIN login against Supabase.
 */
export async function verifyOwnerPinFromSupabase(
  pin: string,
  envUsername: string
): Promise<{ ok: boolean; effectiveUsername: string }> {
  const record = await loadOwnerFromSupabase();
  const effectiveUsername = record?.username || envUsername || 'goldenwizard_admin';

  if (!record?.pin_hash || !record?.pin_salt || !record?.pin_enabled) {
    return { ok: false, effectiveUsername };
  }

  const ok = verifyScryptSecret(pin, record.pin_salt, record.pin_hash);
  return { ok, effectiveUsername };
}
