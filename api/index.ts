/**
 * Golden Wizard Professional Salon — Vercel Serverless API Handler
 *
 * COMPLETELY SELF-CONTAINED — zero imports from server/ services.
 * This eliminates all module-load crashes on Vercel.
 *
 * Authentication: PIN-only (stored in Supabase owner_credentials table).
 * Sessions: HMAC-signed stateless tokens using SESSION_SECRET.
 *
 * Required Vercel environment variables:
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *   SESSION_SECRET (32+ char random string)
 *   OWNER_PIN (fallback 8-digit PIN if Supabase has no record)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

// ============================================================================
// ENVIRONMENT
// ============================================================================
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-dev-secret-change-in-prod';
const FALLBACK_PIN = process.env.OWNER_PIN || '63095278';

// ============================================================================
// CRYPTO HELPERS
// ============================================================================
function hashPin(pin: string, salt?: string): { salt: string; hash: string } {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pin, s, 64).toString('hex');
  return { salt: s, hash };
}

function verifyPin(pin: string, salt: string, expectedHash: string): boolean {
  try {
    const derived = crypto.scryptSync(pin, salt, 64);
    const expected = Buffer.from(expectedHash, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  const dA = crypto.createHash('sha256').update(a).digest();
  const dB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(dA, dB);
}

// ============================================================================
// HMAC SESSION TOKENS
// ============================================================================
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function signSession(username: string): string {
  const payload = JSON.stringify({ username, expiresAt: Date.now() + SESSION_DURATION_MS });
  const p64 = Buffer.from(payload).toString('base64url');
  const mac = crypto.createHmac('sha256', SESSION_SECRET).update(p64).digest('hex');
  return `${p64}.${mac}`;
}

function verifySession(token: string): { username: string } | null {
  if (!token || !token.includes('.')) return null;
  const dotIdx = token.lastIndexOf('.');
  const p64 = token.slice(0, dotIdx);
  const mac = token.slice(dotIdx + 1);
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(p64).digest('hex');
  const macBuf = Buffer.from(mac, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (macBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(macBuf, expBuf)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(p64, 'base64url').toString()) as {
      username: string; expiresAt: number;
    };
    if (!decoded.username || decoded.expiresAt < Date.now()) return null;
    return { username: decoded.username };
  } catch { return null; }
}

// ============================================================================
// SUPABASE HELPERS (service-role key — bypasses RLS)
// ============================================================================
function hasSupabase(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY && SUPABASE_SERVICE_KEY.startsWith('eyJ'));
}

async function supabaseFetch(path: string, opts: { method?: string; body?: unknown } = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method: opts.method || 'GET',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
}

interface OwnerRecord {
  id: number;
  pin_salt: string;
  pin_hash: string;
  updated_at: string;
}

async function loadOwnerRecord(): Promise<OwnerRecord | null> {
  if (!hasSupabase()) return null;
  try {
    const res = await supabaseFetch('/owner_credentials?id=eq.1&select=*&limit=1');
    if (!res.ok) return null;
    const rows = await res.json() as OwnerRecord[];
    return rows[0] || null;
  } catch { return null; }
}

async function saveOwnerPin(pinSalt: string, pinHash: string): Promise<boolean> {
  if (!hasSupabase()) return false;
  try {
    // Try PATCH first (update existing row)
    const patch = await supabaseFetch('/owner_credentials?id=eq.1', {
      method: 'PATCH',
      body: { pin_salt: pinSalt, pin_hash: pinHash, updated_at: new Date().toISOString() },
    });
    if (patch.ok) return true;
    // Row doesn't exist — INSERT
    const insert = await supabaseFetch('/owner_credentials', {
      method: 'POST',
      body: { id: 1, pin_salt: pinSalt, pin_hash: pinHash, updated_at: new Date().toISOString() },
    });
    return insert.ok;
  } catch { return false; }
}

// ============================================================================
// PIN VERIFICATION
// Checks Supabase-stored PIN first, falls back to FALLBACK_PIN env var
// ============================================================================
async function verifyOwnerPin(pin: string): Promise<boolean> {
  const record = await loadOwnerRecord();
  if (record?.pin_salt && record?.pin_hash) {
    return verifyPin(pin, record.pin_salt, record.pin_hash);
  }
  // Fall back to plain comparison with FALLBACK_PIN env var
  return timingSafeEqual(pin, FALLBACK_PIN);
}

// ============================================================================
// RATE LIMITING (in-memory, resets on cold start)
// ============================================================================
const loginFailures = new Map<string, { attempts: number; lockedUntil: number }>();

function checkLoginAllowed(ip: string): { allowed: boolean; minutes?: number } {
  const entry = loginFailures.get(ip);
  if (!entry) return { allowed: true };
  if (entry.lockedUntil > Date.now()) {
    return { allowed: false, minutes: Math.ceil((entry.lockedUntil - Date.now()) / 60000) };
  }
  return { allowed: true };
}

function recordFailedLogin(ip: string): void {
  const entry = loginFailures.get(ip) || { attempts: 0, lockedUntil: 0 };
  entry.attempts++;
  if (entry.attempts >= 5) entry.lockedUntil = Date.now() + 15 * 60 * 1000;
  loginFailures.set(ip, entry);
}

function resetFailures(ip: string): void {
  loginFailures.delete(ip);
}

const questionRateLimit = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (questionRateLimit.get(ip) || []).filter(t => now - t < 3600000);
  return hits.length >= 5;
}

function recordRateHit(ip: string): void {
  const now = Date.now();
  const hits = (questionRateLimit.get(ip) || []).filter(t => now - t < 3600000);
  hits.push(now);
  questionRateLimit.set(ip, hits);
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================
const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

function sendJson(res: VercelResponse, status: number, body: unknown): void {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  res.status(status).json(body);
}

function getIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string') return fwd.split(',')[0].trim();
  return '127.0.0.1';
}

function getToken(req: VercelRequest): string | null {
  const h = (req.headers.authorization as string) || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
}

function requireAuth(req: VercelRequest): { username: string } | null {
  const t = getToken(req);
  return t ? verifySession(t) : null;
}

// ============================================================================
// STATIC DATA — menu categories/services summary and certificates
// ============================================================================
const MENU_SUMMARY = {
  categories: [
    { id: 'cat-waxing', name: 'Waxing', group: 'skin', displayOrder: 0, visible: true },
    { id: 'cat-facial', name: 'Facial', group: 'skin', displayOrder: 1, visible: true },
    { id: 'cat-pedicure', name: 'Pedicure', group: 'nails-bridal', displayOrder: 3, visible: true },
    { id: 'cat-manicure', name: 'Manicure', group: 'nails-bridal', displayOrder: 4, visible: true },
    { id: 'cat-threading', name: 'Threading', group: 'skin', displayOrder: 5, visible: true },
    { id: 'cat-makeup', name: 'Makeup', group: 'nails-bridal', displayOrder: 6, visible: true },
    { id: 'cat-hair', name: 'Hair Services', group: 'hair', displayOrder: 9, visible: true },
    { id: 'cat-colour', name: 'Hair Colour', group: 'hair', displayOrder: 10, visible: true },
    { id: 'cat-bridal', name: 'Bridal Package', group: 'nails-bridal', displayOrder: 11, visible: true },
  ],
  services: [] as unknown[],
  pdfUrl: '/assets/golden-wizard-menu.pdf',
  pdfFilename: 'Golden-Wizard-Salon-Menu.pdf',
  versionNumber: 1,
  publishedAt: new Date().toISOString(),
};

const CERTIFICATES = [
  {
    id: 'GW-CERT-JH-2016',
    title: 'Certificate of Participation — One Day Advanced Workshop in Hair Fashion',
    recipient: 'Ravi Kanth. M',
    issuingOrganization: 'Jawed Habib Academy (Mumbai)',
    issueDate: '20-Sep-2016',
    category: 'Hair Fashion Workshop',
    fileUrl: '/assets/certificates/cert-page-3.jpg',
    fileType: 'image',
    displayOrder: 0,
    published: true,
  },
  {
    id: 'GW-CERT-MSME-JH',
    title: 'Certificate of Appreciation — Workshop on Beauty & Wellness by Jawed Habib',
    recipient: 'M. Ravikanth',
    issuingOrganization: 'ni-msme (Ministry of MSME, Govt. of India) & Jawed Habib Hair & Beauty Ltd.',
    category: 'Beauty & Wellness',
    fileUrl: '/assets/certificates/cert-page-1.jpg',
    fileType: 'image',
    displayOrder: 1,
    published: true,
  },
  {
    id: 'GW-CERT-BKSC',
    title: 'Certificate — Beautician Course',
    recipient: 'M. Ravikanth',
    issuingOrganization: 'Bharat Kala Sangam Cultural Institution',
    category: 'Beautician Training',
    fileUrl: '/assets/certificates/cert-page-2.jpg',
    fileType: 'image',
    displayOrder: 2,
    published: true,
  },
  {
    id: 'GW-CERT-SCAN-4',
    title: 'Professional Certification — Page 4',
    issuingOrganization: 'Golden Wizard Professional Salon',
    category: 'Professional Certification',
    fileUrl: '/assets/certificates/cert-page-4.jpg',
    fileType: 'image',
    displayOrder: 3,
    published: true,
  },
  {
    id: 'GW-CERT-SCAN-5',
    title: 'Professional Certification — Page 5',
    issuingOrganization: 'Golden Wizard Professional Salon',
    category: 'Professional Certification',
    fileUrl: '/assets/certificates/cert-page-5.jpg',
    fileType: 'image',
    displayOrder: 4,
    published: true,
  },
];

const SETTINGS_DEFAULT = {
  businessName: 'Golden Wizard Professional Salon',
  tagline: 'Where Style Meets Elegance',
  phone: '+91 86863 85552',
  whatsappNumber: '918686385552',
  address: '4, Gandi Maisamma X Rd, Opposite Indian Oil Petrol Pump, Gandi Maisamma, Hyderabad, Telangana 500043',
  googleMapsLink: 'https://www.google.com/maps/dir/?api=1&destination=Golden+Wizard+Professional+Salon+Gandi+Maisamma+Hyderabad+500043',
  hours: 'Monday to Sunday: 9:00 AM - 9:00 PM (Open daily until 9:00 PM)',
  announcement: 'Welcome to Golden Wizard Professional Salon. Experience world-class hair & beauty care in Gandi Maisamma.',
  showAnnouncement: true,
  brandColor: '#C9A45C',
};

// ============================================================================
// SUPABASE QUESTIONS HELPERS
// ============================================================================
interface QuestionRecord {
  id: string;
  question: string;
  asker_name?: string | null;
  answer?: string | null;
  status: 'pending' | 'answered';
  created_at: string;
  answered_at?: string | null;
}

async function sbFetchQuestions(path: string, opts: { method?: string; body?: unknown } = {}): Promise<Response> {
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method: opts.method || 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const rawUrl = (req.url || '/').split('?')[0];
  const rawPath = rawUrl.replace(/^\/api/, '') || '/';
  const method = (req.method || 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
    res.status(204).end();
    return;
  }

  // ── PUBLIC: GET /api/menu ──────────────────────────────────────────────────
  if (method === 'GET' && rawPath === '/menu') {
    sendJson(res, 200, MENU_SUMMARY);
    return;
  }

  // ── PUBLIC: GET /api/certificates ─────────────────────────────────────────
  if (method === 'GET' && rawPath === '/certificates') {
    sendJson(res, 200, { certificates: CERTIFICATES });
    return;
  }

  // ── PUBLIC: GET /api/settings ─────────────────────────────────────────────
  if (method === 'GET' && rawPath === '/settings') {
    sendJson(res, 200, SETTINGS_DEFAULT);
    return;
  }

  // ── PUBLIC: POST /api/bookings ────────────────────────────────────────────
  if (method === 'POST' && rawPath === '/bookings') {
    sendJson(res, 201, { success: true, message: 'Booking enquiry received. We will contact you on WhatsApp.' });
    return;
  }

  // ── PUBLIC: GET /api/questions ────────────────────────────────────────────
  if (method === 'GET' && rawPath === '/questions') {
    if (!hasSupabase()) {
      sendJson(res, 200, { questions: [], total: 0, page: 1, totalPages: 0 });
      return;
    }
    try {
      const qs = req.query as Record<string, string>;
      const q = (qs.q || '').trim();
      const page = Math.max(1, parseInt(qs.page || '1', 10));
      const limit = Math.min(50, parseInt(qs.limit || '10', 10));
      const offset = (page - 1) * limit;
      let path = `/questions?status=eq.answered&order=answered_at.desc&limit=${limit}&offset=${offset}`;
      if (q) path += `&question=ilike.*${encodeURIComponent(q)}*`;
      const r = await sbFetchQuestions(path);
      const data = r.ok ? await r.json() as QuestionRecord[] : [];
      sendJson(res, 200, { questions: data, total: data.length, page, totalPages: 1 });
    } catch {
      sendJson(res, 200, { questions: [], total: 0, page: 1, totalPages: 0 });
    }
    return;
  }

  // ── PUBLIC: POST /api/questions ───────────────────────────────────────────
  if (method === 'POST' && rawPath === '/questions') {
    const ip = getIp(req);
    if (isRateLimited(ip)) {
      sendJson(res, 429, { error: 'Rate limit: max 5 questions per hour.', errorType: 'rate_limit' });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const question = (body.question as string || '').trim();
    if (!question || question.length < 10 || question.length > 500) {
      sendJson(res, 400, { error: 'Question must be between 10 and 500 characters.', errorType: 'validation' });
      return;
    }
    if (!hasSupabase()) {
      sendJson(res, 503, { error: 'Database not configured. Please contact the salon directly on WhatsApp.' });
      return;
    }
    try {
      const r = await sbFetchQuestions('/questions', {
        method: 'POST',
        body: {
          question,
          asker_name: (body.asker_name as string) || null,
          status: 'pending',
          answer: null,
          answered_at: null,
          created_at: new Date().toISOString(),
        },
      });
      if (!r.ok) throw new Error('DB error');
      recordRateHit(ip);
      sendJson(res, 201, { success: true, message: 'Question submitted! The salon owner will review and answer it soon.' });
    } catch {
      sendJson(res, 500, { error: 'Could not save your question. Please try again.' });
    }
    return;
  }

  // ── AUTH: GET /api/admin/auth/status ──────────────────────────────────────
  if (method === 'GET' && rawPath === '/admin/auth/status') {
    // Check if Supabase has a PIN record
    const record = await loadOwnerRecord();
    sendJson(res, 200, {
      configured: true,
      mode: 'pin-only',
      pinConfigured: Boolean(record?.pin_hash) || Boolean(FALLBACK_PIN),
    });
    return;
  }

  // ── AUTH: POST /api/admin/login-pin ───────────────────────────────────────
  if (method === 'POST' && rawPath === '/admin/login-pin') {
    const ip = getIp(req);
    const lock = checkLoginAllowed(ip);
    if (!lock.allowed) {
      sendJson(res, 429, { error: `Too many failed attempts. Wait ${lock.minutes} minute(s).` });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const pin = ((body.pin as string) || '').trim();
    if (!/^\d{6,12}$/.test(pin)) {
      sendJson(res, 400, { error: 'PIN must be 6 to 12 digits.' });
      return;
    }
    const ok = await verifyOwnerPin(pin);
    if (!ok) {
      recordFailedLogin(ip);
      sendJson(res, 401, { error: 'Incorrect Owner PIN. Please try again.' });
      return;
    }
    resetFailures(ip);
    const token = signSession('owner');
    sendJson(res, 200, {
      success: true,
      token,
      username: 'owner',
      expiresAt: Date.now() + SESSION_DURATION_MS,
      pinConfigured: true,
    });
    return;
  }

  // ── AUTH: POST /api/admin/login (username+password — redirect to PIN) ─────
  if (method === 'POST' && rawPath === '/admin/login') {
    sendJson(res, 400, {
      error: 'Username/password login is disabled. Please use the Owner PIN tab.',
    });
    return;
  }

  // ── AUTH: POST /api/admin/setup ───────────────────────────────────────────
  if (method === 'POST' && rawPath === '/admin/setup') {
    sendJson(res, 409, { error: 'Owner is already configured. Please sign in with your Owner PIN.' });
    return;
  }

  // ── AUTH: POST /api/admin/logout ──────────────────────────────────────────
  if (method === 'POST' && rawPath === '/admin/logout') {
    sendJson(res, 200, { success: true, message: 'Logged out successfully.' });
    return;
  }

  // ── PROTECTED: GET /api/admin/me ──────────────────────────────────────────
  if (method === 'GET' && rawPath === '/admin/me') {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    sendJson(res, 200, { authenticated: true, username: session.username, pinConfigured: true });
    return;
  }

  // ── PROTECTED: GET /api/admin/stats ───────────────────────────────────────
  if (method === 'GET' && rawPath === '/admin/stats') {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    let pending = 0, answered = 0;
    if (hasSupabase()) {
      try {
        const r = await sbFetchQuestions('/questions?select=status');
        if (r.ok) {
          const rows = await r.json() as { status: string }[];
          pending = rows.filter(q => q.status === 'pending').length;
          answered = rows.filter(q => q.status === 'answered').length;
        }
      } catch { /* ignore */ }
    }
    sendJson(res, 200, {
      totalQuestions: pending + answered,
      pendingQuestions: pending,
      answeredQuestions: answered,
      totalBookings: 0,
      pendingBookings: 0,
      confirmedBookings: 0,
      recentQuestions: [],
      recentBookings: [],
    });
    return;
  }

  // ── PROTECTED: GET /api/admin/questions ───────────────────────────────────
  if (method === 'GET' && rawPath === '/admin/questions') {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    if (!hasSupabase()) { sendJson(res, 200, { questions: [], count: 0 }); return; }
    try {
      const qs = req.query as Record<string, string>;
      const statusFilter = qs.status;
      let path = '/questions?order=created_at.desc';
      if (statusFilter) path += `&status=eq.${statusFilter}`;
      const r = await sbFetchQuestions(path);
      const rows = r.ok ? await r.json() as QuestionRecord[] : [];
      sendJson(res, 200, { questions: rows, count: rows.length });
    } catch {
      sendJson(res, 500, { error: 'Failed to load questions.' });
    }
    return;
  }

  // ── PROTECTED: POST /api/admin/questions/:id/publish ──────────────────────
  const publishMatch = rawPath.match(/^\/admin\/questions\/([^/]+)\/publish$/);
  if (method === 'POST' && publishMatch) {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    const id = publishMatch[1];
    const body = req.body as Record<string, unknown>;
    const answer = ((body.answer as string) || '').trim();
    if (!answer || answer.length < 5) {
      sendJson(res, 400, { error: 'Answer must be at least 5 characters.' });
      return;
    }
    try {
      const r = await sbFetchQuestions(`/questions?id=eq.${id}`, {
        method: 'PATCH',
        body: { answer, status: 'answered', answered_at: new Date().toISOString() },
      });
      const rows = r.ok ? await r.json() as QuestionRecord[] : [];
      if (!rows[0]) { sendJson(res, 404, { error: 'Question not found.' }); return; }
      sendJson(res, 200, { success: true, message: 'Answer published! Now visible on the public website.', question: rows[0] });
    } catch {
      sendJson(res, 500, { error: 'Failed to publish answer.' });
    }
    return;
  }

  // ── PROTECTED: PATCH /api/admin/questions/:id ─────────────────────────────
  const qPatch = rawPath.match(/^\/admin\/questions\/([^/]+)$/);
  if (method === 'PATCH' && qPatch) {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    const id = qPatch[1];
    const body = req.body as Record<string, unknown>;
    try {
      let patch: Record<string, unknown>;
      if (body.unpublish === true) {
        patch = { status: 'pending', answer: null, answered_at: null };
      } else {
        const answer = ((body.answer as string) || '').trim();
        if (!answer || answer.length < 5) { sendJson(res, 400, { error: 'Answer must be at least 5 characters.' }); return; }
        patch = { answer, status: 'answered', answered_at: new Date().toISOString() };
      }
      const r = await sbFetchQuestions(`/questions?id=eq.${id}`, { method: 'PATCH', body: patch });
      const rows = r.ok ? await r.json() as QuestionRecord[] : [];
      if (!rows[0]) { sendJson(res, 404, { error: 'Question not found.' }); return; }
      sendJson(res, 200, { success: true, question: rows[0] });
    } catch {
      sendJson(res, 500, { error: 'Failed to update question.' });
    }
    return;
  }

  // ── PROTECTED: DELETE /api/admin/questions/:id ────────────────────────────
  const qDelete = rawPath.match(/^\/admin\/questions\/([^/]+)$/);
  if (method === 'DELETE' && qDelete) {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    const id = qDelete[1];
    try {
      await sbFetchQuestions(`/questions?id=eq.${id}`, { method: 'DELETE' });
      sendJson(res, 200, { success: true, message: 'Question deleted.', id });
    } catch {
      sendJson(res, 500, { error: 'Failed to delete question.' });
    }
    return;
  }

  // ── PROTECTED: GET /api/admin/bookings ────────────────────────────────────
  if (method === 'GET' && rawPath === '/admin/bookings') {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    sendJson(res, 200, { bookings: [], count: 0 });
    return;
  }

  // ── PROTECTED: GET /api/admin/settings ────────────────────────────────────
  if (method === 'GET' && rawPath === '/admin/settings') {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    sendJson(res, 200, SETTINGS_DEFAULT);
    return;
  }

  // ── PROTECTED: PATCH /api/admin/settings ──────────────────────────────────
  if (method === 'PATCH' && rawPath === '/admin/settings') {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    const body = req.body as Record<string, unknown>;
    sendJson(res, 200, { success: true, ...SETTINGS_DEFAULT, ...body, message: 'Settings updated for this session.' });
    return;
  }

  // ── PROTECTED: GET /api/admin/menu ────────────────────────────────────────
  if (method === 'GET' && rawPath === '/admin/menu') {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    sendJson(res, 200, { published: MENU_SUMMARY, draft: MENU_SUMMARY, versions: [], currentVersionNumber: 1, lastPublishedAt: new Date().toISOString() });
    return;
  }

  // ── PROTECTED: POST /api/admin/menu/* ─────────────────────────────────────
  if (method === 'POST' && (rawPath === '/admin/menu/publish' || rawPath === '/admin/menu/discard-draft')) {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    sendJson(res, 200, { success: true, message: 'Acknowledged.' });
    return;
  }

  // ── PROTECTED: GET /api/admin/certificates ────────────────────────────────
  if (method === 'GET' && rawPath === '/admin/certificates') {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    sendJson(res, 200, { certificates: CERTIFICATES });
    return;
  }

  // ── PROTECTED: PATCH /api/admin/security/pin — CHANGE PIN ────────────────
  if (method === 'PATCH' && rawPath === '/admin/security/pin') {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    const body = req.body as Record<string, unknown>;
    const currentPin = ((body.currentPin as string) || (body.currentPassword as string) || '').trim();
    const newPin = ((body.newPin as string) || '').trim();
    const confirmPin = ((body.confirmPin as string) || '').trim();

    if (!newPin || !/^\d{6,12}$/.test(newPin)) {
      sendJson(res, 400, { error: 'New PIN must be 6 to 12 numeric digits.' });
      return;
    }
    if (newPin !== confirmPin) {
      sendJson(res, 400, { error: 'New PIN and confirmation do not match.' });
      return;
    }

    // Verify current PIN before allowing change
    const currentOk = await verifyOwnerPin(currentPin);
    if (!currentOk) {
      sendJson(res, 401, { error: 'Current PIN is incorrect.' });
      return;
    }

    const { salt, hash } = hashPin(newPin);
    const saved = await saveOwnerPin(salt, hash);
    if (!saved) {
      sendJson(res, 503, { error: 'Could not save new PIN to database. Check your Supabase configuration.' });
      return;
    }
    sendJson(res, 200, { success: true, pinConfigured: true, message: 'Owner PIN updated successfully. Use your new PIN on the next login.' });
    return;
  }

  // ── PROTECTED: PATCH /api/admin/security/username ─────────────────────────
  if (method === 'PATCH' && rawPath === '/admin/security/username') {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    sendJson(res, 200, { success: true, username: 'owner', message: 'This deployment uses PIN-only login. Username changes are not applicable.' });
    return;
  }

  // ── PROTECTED: PATCH /api/admin/security/password ─────────────────────────
  if (method === 'PATCH' && rawPath === '/admin/security/password') {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    sendJson(res, 200, { success: true, message: 'This deployment uses PIN-only login. Use the PIN change section to update your credentials.' });
    return;
  }

  // ── CATCH-ALL: 404 ────────────────────────────────────────────────────────
  sendJson(res, 404, { error: `Route not found: ${method} ${rawPath}` });
}
