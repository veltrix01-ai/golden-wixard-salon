/**
 * Golden Wizard Professional Salon — Vercel Serverless API Handler
 *
 * This function is the Vercel-deployed equivalent of server.ts.
 * It shares the exact same service layer (questionService, ownerAuthService,
 * supabaseService, rateLimit, questionSchema) so business logic, validation,
 * and Supabase integration are identical between local Express and Vercel.
 *
 * Session strategy: stateless HMAC-signed tokens.
 * Because Vercel functions are ephemeral (no persistent memory or filesystem),
 * sessions are encoded as a JSON payload signed with SESSION_SECRET via HMAC-SHA256.
 * No session store is needed — the signature is verified on every request.
 *
 * Required environment variables on Vercel:
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *   OWNER_USERNAME, OWNER_PASSWORD (or rely on first-run setup)
 *   SESSION_SECRET  (32+ char random string for HMAC signing)
 *   OWNER_EMAIL, RESEND_API_KEY (optional, for email notifications)
 *   APP_URL (for email links)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { z } from 'zod';
import {
  DatabaseStorageError,
} from '../server/services/supabaseService';
import {
  listPublicQuestions,
  createPendingQuestion,
  listAllAdminQuestions,
  publishAdminQuestionAnswer,
  updateAdminQuestion,
  deleteAdminQuestion,
  type QuestionRecord,
} from '../server/services/questionService';
import {
  isOwnerConfigured,
  getAuthMode,
  isPinConfigured,
  getEffectiveOwnerLabel,
  claimInitialOwner,
  verifyOwnerPasswordLogin,
  verifyOwnerPinLogin,
  isValidUsernameFormat,
  checkLoginAllowed,
  recordFailedLogin,
  resetLoginFailures,
} from '../server/services/ownerAuthService';
import {
  loadOwnerFromSupabase,
  verifyOwnerPasswordFromSupabase,
  updateOwnerUsernameInSupabase,
  updateOwnerPasswordInSupabase,
  updateOwnerPinInSupabase,
  isPinConfiguredInSupabase,
  verifyOwnerPinFromSupabase,
} from '../server/services/ownerCredentialsSupabase';
import {
  isHoneypotTriggered,
  isQuestionRateLimited,
  recordQuestionRateLimitHit,
  recordAbuseRateLimitHit,
} from '../server/middleware/rateLimit';
import { SubmitQuestionSchema, PublishAnswerSchema } from '../server/validation/questionSchema';
import {
  INITIAL_MENU_SNAPSHOT,
  INITIAL_REAL_CERTIFICATES,
  formatRsPrice,
} from '../src/data/menuData';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const ENV_OWNER_USERNAME = (process.env.OWNER_USERNAME || '').trim();
const ENV_OWNER_PASSWORD = process.env.OWNER_PASSWORD || '';
const OWNER_EMAIL = process.env.OWNER_EMAIL || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
const SESSION_SECRET = process.env.SESSION_SECRET || '';

// ---------------------------------------------------------------------------
// HMAC stateless session tokens
//
// A session token is: base64url(JSON({ username, expiresAt })) + "." + hmac
// This lets the serverless function verify sessions without any persistent store.
// ---------------------------------------------------------------------------

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function signSession(username: string): string {
  if (!SESSION_SECRET) {
    return signSessionWithKey(username, getProcessSecret());
  }
  return signSessionWithKey(username, SESSION_SECRET);
}

let _processSecret: string | undefined;
function getProcessSecret(): string {
  if (!_processSecret) {
    _processSecret = crypto.randomBytes(32).toString('hex');
  }
  return _processSecret;
}

function signSessionWithKey(username: string, key: string): string {
  const payload = JSON.stringify({ username, expiresAt: Date.now() + SESSION_DURATION_MS });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const mac = crypto.createHmac('sha256', key).update(payloadB64).digest('hex');
  return `${payloadB64}.${mac}`;
}

function verifySession(token: string): { username: string; expiresAt: number } | null {
  if (!token || !token.includes('.')) return null;
  const key = SESSION_SECRET || getProcessSecret();
  const dotIdx = token.lastIndexOf('.');
  const payloadB64 = token.slice(0, dotIdx);
  const mac = token.slice(dotIdx + 1);
  const expectedMac = crypto.createHmac('sha256', key).update(payloadB64).digest('hex');
  const macBuf = Buffer.from(mac, 'hex');
  const expectedBuf = Buffer.from(expectedMac, 'hex');
  if (macBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(macBuf, expectedBuf)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as {
      username: string;
      expiresAt: number;
    };
    if (!decoded.username || !decoded.expiresAt || decoded.expiresAt < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// IP extraction from Vercel request headers
// ---------------------------------------------------------------------------

function getRequestIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

// ---------------------------------------------------------------------------
// Auth-rate limiter (in-memory per process — resets on cold start)
// ---------------------------------------------------------------------------

const authRateLimits = new Map<string, number[]>();

function checkAuthRateLimit(ip: string): boolean {
  const now = Date.now();
  const fifteenMinsAgo = now - 15 * 60 * 1000;
  const timestamps = (authRateLimits.get(ip) || []).filter((t) => t > fifteenMinsAgo);
  if (timestamps.length >= 15) return false;
  timestamps.push(now);
  authRateLimits.set(ip, timestamps);
  return true;
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const LoginSchema = z.object({
  username: z.string().trim().min(1, { message: 'Username is required.' }).max(80),
  password: z.string().min(1, { message: 'Password is required.' }).max(128),
});

const PinLoginSchema = z.object({
  pin: z
    .string()
    .trim()
    .regex(/^\d{6,12}$/, { message: 'Owner PIN must be 6 to 12 digits.' }),
});

const SetupOwnerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, { message: 'Username must be at least 3 characters.' })
    .max(60)
    .refine(isValidUsernameFormat, {
      message: 'Username can contain letters, numbers, dots, underscores, @, or hyphens.',
    }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }).max(128),
});

const ChangeUsernameSchema = z.object({
  newUsername: z
    .string()
    .trim()
    .min(3, { message: 'Username must be at least 3 characters.' })
    .max(60)
    .refine(isValidUsernameFormat, {
      message: 'Username can contain only letters, numbers, dots, underscores, @, or hyphens.',
    }),
});

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Current password is required.' }).max(128),
    newPassword: z.string().min(8, { message: 'New password must be at least 8 characters.' }).max(128),
    confirmPassword: z.string().min(1, { message: 'Please confirm your new password.' }).max(128),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'New password confirmation does not match.',
    path: ['confirmPassword'],
  });

const ChangePinSchema = z
  .object({
    currentPin: z.string().trim().optional(),
    currentPassword: z.string().optional(),
    newPin: z
      .string()
      .trim()
      .regex(/^\d{6,12}$/, { message: 'Owner PIN must be 6 to 12 numeric digits.' }),
    confirmPin: z.string().trim().min(1, { message: 'Please confirm your new Owner PIN.' }),
  })
  .refine((d) => d.newPin === d.confirmPin, {
    message: 'PIN confirmation does not match.',
    path: ['confirmPin'],
  });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

function sendJson(res: VercelResponse, statusCode: number, body: unknown): void {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.status(statusCode).json(body);
}

function getAuthToken(req: VercelRequest): string | null {
  const header = (req.headers.authorization as string) || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

function requireAuth(req: VercelRequest): { username: string } | null {
  const token = getAuthToken(req);
  if (!token) return null;
  return verifySession(token);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendOwnerEmailNotification(question: QuestionRecord): Promise<void> {
  if (!RESEND_API_KEY || !OWNER_EMAIL) return;
  try {
    const emailBody = `
<h2>New Question Submitted to Golden Wizard Salon</h2>
<p><strong>From:</strong> ${question.asker_name || 'Anonymous Visitor'}</p>
<p><strong>Submitted At:</strong> ${new Date(question.created_at).toLocaleString()}</p>
<p><strong>Question:</strong></p>
<blockquote style="background:#f4f4f4;padding:12px;border-left:4px solid #C6A15B;">
  ${escapeHtml(question.question)}
</blockquote>
<p>
  <a href="${APP_URL}/admin" style="background:#C6A15B;color:#111;padding:10px 18px;text-decoration:none;font-weight:bold;border-radius:3px;">
    Open Admin Dashboard to Answer
  </a>
</p>`;
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Golden Wizard Salon <notifications@goldenwizardsalon.com>',
        to: [OWNER_EMAIL],
        subject: `[New Question] From ${question.asker_name || 'Customer'}: "${question.question.slice(0, 50)}..."`,
        html: emailBody,
      }),
    });
  } catch {
    // Non-blocking — email failure must never cause the API to return an error
  }
}

function getEffectiveLabel(): string {
  return getEffectiveOwnerLabel(ENV_OWNER_USERNAME);
}

// ---------------------------------------------------------------------------
// Main Vercel handler
// ---------------------------------------------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Strip /api prefix to get a clean route path
  const rawUrl = (req.url || '/').split('?')[0];
  const rawPath = rawUrl.replace(/^\/api/, '') || '/';

  const method = (req.method || 'GET').toUpperCase();

  // OPTIONS preflight (CORS)
  if (method === 'OPTIONS') {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    res.status(204).end();
    return;
  }

  // ======================================================================
  // PUBLIC ROUTES (no authentication required)
  // ======================================================================

  // GET /api/menu — published salon menu (categories + services + PDF link)
  if (method === 'GET' && rawPath === '/menu') {
    try {
      const snapshot = INITIAL_MENU_SNAPSHOT;
      const visibleCategories = snapshot.categories
        .filter((c) => c.visible !== false)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((c) => ({ ...c }));

      const visibleCatIds = new Set(visibleCategories.map((c) => c.id));
      const activeServices = snapshot.services
        .filter((s) => s.active !== false && visibleCatIds.has(s.categoryId))
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((s) => ({ ...s, priceDisplay: formatRsPrice(s.price) }));

      sendJson(res, 200, {
        categories: visibleCategories,
        services: activeServices,
        pdfUrl: snapshot.pdfUrl || '/assets/golden-wizard-menu.pdf',
        pdfFilename: snapshot.pdfFilename || 'Golden-Wizard-Salon-Menu.pdf',
        versionNumber: 1,
        publishedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[GET /api/menu]', err);
      sendJson(res, 500, { error: 'Unable to load the salon menu at this time.' });
    }
    return;
  }

  // GET /api/certificates — published professional certificates
  if (method === 'GET' && rawPath === '/certificates') {
    try {
      const published = INITIAL_REAL_CERTIFICATES
        .filter((c) => c.published !== false)
        .sort((a, b) => a.displayOrder - b.displayOrder);
      sendJson(res, 200, { certificates: published });
    } catch (err) {
      console.error('[GET /api/certificates]', err);
      sendJson(res, 500, { error: 'Unable to load certificates at this time.' });
    }
    return;
  }

  // POST /api/bookings — booking enquiry (WhatsApp-based; just acknowledge)
  if (method === 'POST' && rawPath === '/bookings') {
    sendJson(res, 201, {
      success: true,
      message: 'Booking enquiry received. The salon will contact you on WhatsApp to confirm.',
    });
    return;
  }

  // GET /api/questions — paginated, searchable public FAQ (answered only)
  if (method === 'GET' && rawPath === '/questions') {
    try {
      const qs = req.query as Record<string, string | undefined>;
      const searchQuery = ((qs.q as string) || '').trim();
      const page = Math.max(1, parseInt((qs.page as string) || '1', 10) || 1);
      const limit = Math.max(1, Math.min(50, parseInt((qs.limit as string) || '10', 10) || 10));
      const result = await listPublicQuestions({ searchQuery, page, limit });
      sendJson(res, 200, result);
    } catch (err) {
      if (err instanceof DatabaseStorageError) {
        sendJson(res, err.statusCode, { error: err.message });
      } else {
        sendJson(res, 500, { error: 'Unable to load published questions at this time.' });
      }
    }
    return;
  }

  // POST /api/questions — customer submits a new question
  if (method === 'POST' && rawPath === '/questions') {
    const clientIp = getRequestIp(req);

    if (isQuestionRateLimited(clientIp)) {
      sendJson(res, 429, {
        error: 'Rate limit exceeded: You can only submit up to 5 questions per hour. Please try again later.',
        errorType: 'rate_limit',
      });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const parseResult = SubmitQuestionSchema.safeParse(body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      const isCheckboxIssue = issue?.path?.includes('human_verified');
      sendJson(res, 400, {
        error: issue ? issue.message : 'Invalid question input.',
        errorType: isCheckboxIssue ? 'verification' : 'validation',
      });
      return;
    }

    const { question, asker_name, website } = parseResult.data;

    if (isHoneypotTriggered(website)) {
      recordAbuseRateLimitHit(clientIp);
      sendJson(res, 400, {
        error: 'Unable to process your submission. Please try again.',
        errorType: 'verification',
      });
      return;
    }

    let newQuestion: QuestionRecord;
    try {
      newQuestion = await createPendingQuestion({
        question,
        asker_name: asker_name && asker_name.length > 0 ? asker_name : null,
      });
    } catch (err) {
      recordAbuseRateLimitHit(clientIp);
      if (err instanceof DatabaseStorageError) {
        sendJson(res, err.statusCode, {
          error: err.message,
          errorType: 'database',
          reasonCode: err.reasonCode,
        });
      } else {
        sendJson(res, 500, {
          error: 'Could not save your question right now. Please try again in a moment.',
          errorType: 'database',
        });
      }
      return;
    }

    recordQuestionRateLimitHit(clientIp);
    sendOwnerEmailNotification(newQuestion).catch(() => {});

    sendJson(res, 201, {
      success: true,
      message: 'Thank you! Your question has been submitted. The salon owner will review and answer it soon.',
      id: newQuestion.id,
    });
    return;
  }

  // GET /api/settings — public website settings
  if (method === 'GET' && rawPath === '/settings') {
    sendJson(res, 200, {
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
    });
    return;
  }

  // GET /api/admin/auth/status — reports whether owner credentials are configured
  if (method === 'GET' && rawPath === '/admin/auth/status') {
    // Check Supabase for a stored record first, then fall back to env vars
    const supabaseRecord = await loadOwnerFromSupabase();
    const pinCfg = supabaseRecord?.pin_enabled
      ? true
      : isPinConfigured();
    const configured = supabaseRecord
      ? true
      : getAuthMode(ENV_OWNER_PASSWORD) !== 'unconfigured';
    const mode = supabaseRecord
      ? 'claimed'
      : getAuthMode(ENV_OWNER_PASSWORD);
    sendJson(res, 200, { configured, mode, pinConfigured: pinCfg });
    return;
  }

  // POST /api/admin/setup — first-run owner account claim
  if (method === 'POST' && rawPath === '/admin/setup') {
    const clientIp = getRequestIp(req);
    if (!checkAuthRateLimit(clientIp)) {
      sendJson(res, 429, { error: 'Too many setup attempts. Please wait a few minutes and try again.' });
      return;
    }
    if (isOwnerConfigured(ENV_OWNER_PASSWORD)) {
      sendJson(res, 409, {
        error: 'Owner access is already configured. Please sign in with your owner credentials.',
      });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const parsed = SetupOwnerSchema.safeParse(body);
    if (!parsed.success) {
      sendJson(res, 400, { error: parsed.error.issues[0]?.message || 'Invalid setup details.' });
      return;
    }
    const record = claimInitialOwner(parsed.data.username, parsed.data.password);
    const token = signSession(record.username);
    sendJson(res, 201, {
      success: true,
      token,
      username: record.username,
      expiresAt: Date.now() + SESSION_DURATION_MS,
      pinConfigured: false,
    });
    return;
  }

  // POST /api/admin/login — username + password login
  // Tries Supabase-stored credentials first, falls back to env vars
  if (method === 'POST' && rawPath === '/admin/login') {
    const clientIp = getRequestIp(req);
    const lockCheck = checkLoginAllowed(clientIp);
    if (!lockCheck.allowed) {
      sendJson(res, 429, {
        error: `Too many failed sign-in attempts. Please wait about ${lockCheck.retryAfterMinutes} minute(s) before trying again.`,
      });
      return;
    }
    if (!checkAuthRateLimit(clientIp)) {
      sendJson(res, 429, { error: 'Too many sign-in attempts. Please wait a few minutes and try again.' });
      return;
    }
    if (!isOwnerConfigured(ENV_OWNER_PASSWORD)) {
      // Check if Supabase has credentials even when env isn't set
      const sbRecord = await loadOwnerFromSupabase();
      if (!sbRecord) {
        sendJson(res, 409, { error: 'Owner Portal setup has not been completed yet.' });
        return;
      }
    }
    const body = req.body as Record<string, unknown>;
    const parseResult = LoginSchema.safeParse(body);
    if (!parseResult.success) {
      sendJson(res, 400, { error: 'Please provide both username and password.' });
      return;
    }
    const { username, password } = parseResult.data;
    // Try Supabase-stored credentials first, then env var fallback
    const verified = await verifyOwnerPasswordFromSupabase(
      username, password, ENV_OWNER_USERNAME, ENV_OWNER_PASSWORD
    );
    if (!verified.ok) {
      const failure = recordFailedLogin(clientIp);
      const lockNotice = failure.locked
        ? ' Account login temporarily locked for 15 minutes due to repeated failed attempts.'
        : '';
      sendJson(res, failure.locked ? 429 : 401, {
        error: `Invalid owner username or password.${lockNotice}`,
      });
      return;
    }
    resetLoginFailures(clientIp);
    const token = signSession(verified.effectiveUsername);
    const pinCfg = await isPinConfiguredInSupabase();
    sendJson(res, 200, {
      success: true,
      token,
      username: verified.effectiveUsername,
      expiresAt: Date.now() + SESSION_DURATION_MS,
      pinConfigured: pinCfg,
    });
    return;
  }

  // POST /api/admin/login-pin — PIN-only login
  if (method === 'POST' && rawPath === '/admin/login-pin') {
    const clientIp = getRequestIp(req);
    const lockCheck = checkLoginAllowed(clientIp);
    if (!lockCheck.allowed) {
      sendJson(res, 429, {
        error: `Too many failed PIN attempts. Please wait about ${lockCheck.retryAfterMinutes} minute(s) before trying again.`,
      });
      return;
    }
    if (!checkAuthRateLimit(clientIp)) {
      sendJson(res, 429, { error: 'Too many sign-in attempts. Please wait a few minutes and try again.' });
      return;
    }
    if (!isOwnerConfigured(ENV_OWNER_PASSWORD)) {
      sendJson(res, 409, {
        error: 'Owner Portal setup has not been completed yet. Please create the owner account first.',
      });
      return;
    }
    if (!isPinConfigured()) {
      sendJson(res, 400, {
        error: 'Owner PIN login is not configured yet. Sign in with Username & Password and set a secure 6+ digit PIN in Settings.',
      });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const parseResult = PinLoginSchema.safeParse(body);
    if (!parseResult.success) {
      recordFailedLogin(clientIp);
      sendJson(res, 400, { error: 'Invalid PIN format. Please enter your 6+ digit Owner PIN.' });
      return;
    }
    // Try Supabase-stored PIN first, then local fallback
    const verified = await verifyOwnerPinFromSupabase(parseResult.data.pin, ENV_OWNER_USERNAME);
    if (!verified.ok) {
      const failure = recordFailedLogin(clientIp);
      const lockNotice = failure.locked
        ? ' PIN login temporarily locked for 15 minutes due to repeated failed attempts.'
        : '';
      sendJson(res, failure.locked ? 429 : 401, {
        error: `Incorrect Owner PIN.${lockNotice}`,
      });
      return;
    }
    resetLoginFailures(clientIp);
    const token = signSession(verified.effectiveUsername);
    sendJson(res, 200, {
      success: true,
      token,
      username: verified.effectiveUsername,
      expiresAt: Date.now() + SESSION_DURATION_MS,
      pinConfigured: true,
    });
    return;
  }

  // POST /api/admin/logout — invalidate session (client discards token)
  if (method === 'POST' && rawPath === '/admin/logout') {
    // HMAC tokens are stateless; the client simply discards its copy.
    sendJson(res, 200, { success: true, message: 'Logged out successfully.' });
    return;
  }

  // ======================================================================
  // PROTECTED ROUTES (require valid HMAC session token)
  // ======================================================================

  // GET /api/admin/me — verify session and return current username
  if (method === 'GET' && rawPath === '/admin/me') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { error: 'Unauthorized: Missing or expired session. Please sign in again.' });
      return;
    }
    sendJson(res, 200, {
      authenticated: true,
      username: session.username,
      pinConfigured: isPinConfigured(),
    });
    return;
  }

  // GET /api/admin/stats — dashboard overview numbers
  if (method === 'GET' && rawPath === '/admin/stats') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { error: 'Unauthorized: Session expired or invalid. Please sign in again.' });
      return;
    }
    try {
      const allQuestions = await listAllAdminQuestions();
      const pendingQuestions = allQuestions.filter((q) => q.status === 'pending').length;
      const answeredQuestions = allQuestions.filter((q) => q.status === 'answered').length;
      sendJson(res, 200, {
        totalQuestions: allQuestions.length,
        pendingQuestions,
        answeredQuestions,
        totalBookings: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        recentQuestions: allQuestions.slice(0, 5),
        recentBookings: [],
      });
    } catch (err) {
      const statusCode = err instanceof DatabaseStorageError ? err.statusCode : 500;
      const msg = err instanceof DatabaseStorageError ? err.message : 'Failed to load dashboard stats.';
      sendJson(res, statusCode, { error: msg });
    }
    return;
  }

  // GET /api/admin/questions — all questions (admin view)
  if (method === 'GET' && rawPath === '/admin/questions') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { error: 'Unauthorized: Session expired or invalid. Please sign in again.' });
      return;
    }
    try {
      const qs = req.query as Record<string, string | undefined>;
      const statusFilter = (qs.status as string | undefined);
      const list = await listAllAdminQuestions(statusFilter);
      sendJson(res, 200, { questions: list, count: list.length });
    } catch (err) {
      const statusCode = err instanceof DatabaseStorageError ? err.statusCode : 500;
      const msg = err instanceof DatabaseStorageError ? err.message : 'Failed to load questions.';
      sendJson(res, statusCode, { error: msg });
    }
    return;
  }

  // POST /api/admin/questions/:id/publish — publish answer
  const publishMatch = rawPath.match(/^\/admin\/questions\/([^/]+)\/publish$/);
  if (method === 'POST' && publishMatch) {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { error: 'Unauthorized: Session expired or invalid. Please sign in again.' });
      return;
    }
    const questionId = publishMatch[1];
    const body = req.body as Record<string, unknown>;
    const parseResult = PublishAnswerSchema.safeParse(body);
    if (!parseResult.success) {
      sendJson(res, 400, { error: parseResult.error.issues[0]?.message || 'Invalid answer.' });
      return;
    }
    try {
      const question = await publishAdminQuestionAnswer(questionId, parseResult.data.answer);
      if (!question) {
        sendJson(res, 404, { error: 'Question not found.' });
        return;
      }
      sendJson(res, 200, {
        success: true,
        message: 'Answer published successfully! The question is now visible on the public website.',
        question,
      });
    } catch (err) {
      const statusCode = err instanceof DatabaseStorageError ? err.statusCode : 500;
      const msg = err instanceof DatabaseStorageError ? err.message : 'Failed to publish answer.';
      sendJson(res, statusCode, { error: msg });
    }
    return;
  }

  // PATCH /api/admin/questions/:id — edit answer or unpublish
  const questionPatchMatch = rawPath.match(/^\/admin\/questions\/([^/]+)$/);
  if (method === 'PATCH' && questionPatchMatch) {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { error: 'Unauthorized: Session expired or invalid. Please sign in again.' });
      return;
    }
    const questionId = questionPatchMatch[1];
    const body = req.body as Record<string, unknown>;
    try {
      if (body.unpublish === true) {
        const question = await updateAdminQuestion(questionId, { unpublish: true });
        if (!question) {
          sendJson(res, 404, { error: 'Question not found.' });
          return;
        }
        sendJson(res, 200, {
          success: true,
          message: 'Question unpublished. It has been removed from the public website.',
          question,
        });
        return;
      }
      if (body.answer !== undefined) {
        const parseResult = PublishAnswerSchema.safeParse(body);
        if (!parseResult.success) {
          sendJson(res, 400, { error: parseResult.error.issues[0]?.message || 'Invalid answer.' });
          return;
        }
        const question = await updateAdminQuestion(questionId, { answer: parseResult.data.answer });
        if (!question) {
          sendJson(res, 404, { error: 'Question not found.' });
          return;
        }
        sendJson(res, 200, { success: true, message: 'Answer updated successfully.', question });
        return;
      }
      sendJson(res, 400, { error: 'No valid action provided.' });
    } catch (err) {
      const statusCode = err instanceof DatabaseStorageError ? err.statusCode : 500;
      const msg = err instanceof DatabaseStorageError ? err.message : 'Failed to update question.';
      sendJson(res, statusCode, { error: msg });
    }
    return;
  }

  // DELETE /api/admin/questions/:id — delete question
  const questionDeleteMatch = rawPath.match(/^\/admin\/questions\/([^/]+)$/);
  if (method === 'DELETE' && questionDeleteMatch) {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { error: 'Unauthorized: Session expired or invalid. Please sign in again.' });
      return;
    }
    const questionId = questionDeleteMatch[1];
    try {
      const deleted = await deleteAdminQuestion(questionId);
      if (!deleted) {
        sendJson(res, 404, { error: 'Question not found.' });
        return;
      }
      sendJson(res, 200, { success: true, message: 'Question deleted permanently.', id: questionId });
    } catch (err) {
      const statusCode = err instanceof DatabaseStorageError ? err.statusCode : 500;
      const msg = err instanceof DatabaseStorageError ? err.message : 'Failed to delete question.';
      sendJson(res, statusCode, { error: msg });
    }
    return;
  }

  // ======================================================================
  // ADMIN — BOOKINGS
  // ======================================================================

  // GET /api/admin/bookings — list booking enquiries
  if (method === 'GET' && rawPath === '/admin/bookings') {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    // On Vercel: no persistent booking store — bookings submitted via WhatsApp
    // so the in-memory store will always be empty after cold starts.
    sendJson(res, 200, { bookings: [], count: 0 });
    return;
  }

  // PATCH /api/admin/bookings/:id — update booking status
  const bookingPatchMatch = rawPath.match(/^\/admin\/bookings\/([^/]+)$/);
  if (method === 'PATCH' && bookingPatchMatch) {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    sendJson(res, 404, { error: 'Booking not found. Bookings submitted via WhatsApp are not stored server-side on this deployment.' });
    return;
  }

  // DELETE /api/admin/bookings/:id — delete booking
  const bookingDeleteMatch = rawPath.match(/^\/admin\/bookings\/([^/]+)$/);
  if (method === 'DELETE' && bookingDeleteMatch) {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    sendJson(res, 404, { error: 'Booking not found.' });
    return;
  }

  // ======================================================================
  // ADMIN — MENU MANAGEMENT
  // ======================================================================

  // GET /api/admin/menu — owner view of menu (draft + published + versions)
  if (method === 'GET' && rawPath === '/admin/menu') {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    const snapshot = INITIAL_MENU_SNAPSHOT;
    const normalized = {
      ...snapshot,
      categories: [...snapshot.categories].sort((a, b) => a.displayOrder - b.displayOrder),
      services: [...snapshot.services].sort((a, b) => a.displayOrder - b.displayOrder)
        .map((s) => ({ ...s, priceDisplay: formatRsPrice(s.price) })),
    };
    sendJson(res, 200, {
      published: normalized,
      draft: normalized,
      versions: [{
        id: 'ver-1',
        versionNumber: 1,
        publishedAt: new Date().toISOString(),
        publishedBy: ENV_OWNER_USERNAME || 'owner',
        changeSummary: 'Original Golden Wizard Salon Menu baseline',
        snapshot: normalized,
      }],
      currentVersionNumber: 1,
      lastPublishedAt: new Date().toISOString(),
      vercelNote: 'Menu changes cannot be persisted on Vercel serverless. Update src/data/menuData.ts and redeploy to publish menu changes.',
    });
    return;
  }

  // POST /api/admin/menu/publish — publish draft (Vercel: acknowledge only)
  if (method === 'POST' && rawPath === '/admin/menu/publish') {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    sendJson(res, 200, {
      success: true,
      message: 'Note: Menu changes cannot be persisted on Vercel serverless deployments. To update the live menu, edit src/data/menuData.ts and redeploy.',
    });
    return;
  }

  // POST /api/admin/menu/discard-draft — discard draft (Vercel: acknowledge)
  if (method === 'POST' && rawPath === '/admin/menu/discard-draft') {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    sendJson(res, 200, { success: true, message: 'Draft discarded.' });
    return;
  }

  // POST /api/admin/menu/versions/:versionId/restore — restore version
  const menuVersionMatch = rawPath.match(/^\/admin\/menu\/versions\/([^/]+)\/restore$/);
  if (method === 'POST' && menuVersionMatch) {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    sendJson(res, 200, { success: true, message: 'Version restore acknowledged. Redeploy to apply.' });
    return;
  }

  // POST /api/admin/menu/upload-pdf — upload menu PDF
  if (method === 'POST' && rawPath === '/admin/menu/upload-pdf') {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    sendJson(res, 503, { error: 'PDF uploads require the Express server deployment. File uploads are not supported on Vercel serverless.' });
    return;
  }

  // ======================================================================
  // ADMIN — CERTIFICATES MANAGEMENT
  // ======================================================================

  // GET /api/admin/certificates — owner view of all certificates
  if (method === 'GET' && rawPath === '/admin/certificates') {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    sendJson(res, 200, {
      certificates: INITIAL_REAL_CERTIFICATES,
      vercelNote: 'Certificate changes cannot be persisted on Vercel serverless. Update src/data/menuData.ts and redeploy.',
    });
    return;
  }

  // POST /api/admin/certificates — add certificate
  if (method === 'POST' && rawPath === '/admin/certificates') {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    sendJson(res, 503, { error: 'Certificate management requires the Express server deployment. Changes cannot be persisted on Vercel serverless.' });
    return;
  }

  // POST /api/admin/certificates/upload — upload certificate file
  if (method === 'POST' && rawPath === '/admin/certificates/upload') {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    sendJson(res, 503, { error: 'File uploads require the Express server deployment.' });
    return;
  }

  // POST /api/admin/certificates/reorder — reorder certificates
  if (method === 'POST' && rawPath === '/admin/certificates/reorder') {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    sendJson(res, 503, { error: 'Certificate reordering requires the Express server deployment.' });
    return;
  }

  // PATCH /api/admin/certificates/:id — update certificate
  const certPatchMatch = rawPath.match(/^\/admin\/certificates\/([^/]+)$/);
  if (method === 'PATCH' && certPatchMatch) {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    sendJson(res, 503, { error: 'Certificate management requires the Express server deployment.' });
    return;
  }

  // DELETE /api/admin/certificates/:id — delete certificate
  const certDeleteMatch = rawPath.match(/^\/admin\/certificates\/([^/]+)$/);
  if (method === 'DELETE' && certDeleteMatch) {
    const session = requireAuth(req);
    if (!session) { sendJson(res, 401, { error: 'Unauthorized.' }); return; }
    sendJson(res, 503, { error: 'Certificate management requires the Express server deployment.' });
    return;
  }

  // GET /api/admin/settings — owner view of settings
  if (method === 'GET' && rawPath === '/admin/settings') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { error: 'Unauthorized: Session expired or invalid. Please sign in again.' });
      return;
    }
    sendJson(res, 200, {
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
    });
    return;
  }

  // PATCH /api/admin/settings — update website settings (acknowledged, not persisted on Vercel serverless)
  if (method === 'PATCH' && rawPath === '/admin/settings') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { error: 'Unauthorized: Session expired or invalid. Please sign in again.' });
      return;
    }
    // On Vercel, settings changes are not persisted to disk.
    // Return the submitted values merged with defaults so the dashboard UI updates correctly,
    // even though changes will reset on the next cold start.
    const body = req.body as Record<string, unknown>;
    const merged = {
      businessName: (body.businessName as string) || 'Golden Wizard Professional Salon',
      tagline: (body.tagline as string) || 'Where Style Meets Elegance',
      phone: (body.phone as string) || '+91 86863 85552',
      whatsappNumber: (body.whatsappNumber as string) || '918686385552',
      address: (body.address as string) || '4, Gandi Maisamma X Rd, Opposite Indian Oil Petrol Pump, Gandi Maisamma, Hyderabad, Telangana 500043',
      googleMapsLink: (body.googleMapsLink as string) || 'https://www.google.com/maps/dir/?api=1&destination=Golden+Wizard+Professional+Salon+Gandi+Maisamma+Hyderabad+500043',
      hours: (body.hours as string) || 'Monday to Sunday: 9:00 AM - 9:00 PM (Open daily until 9:00 PM)',
      announcement: (body.announcement as string) ?? 'Welcome to Golden Wizard Professional Salon. Experience world-class hair & beauty care in Gandi Maisamma.',
      showAnnouncement: body.showAnnouncement !== undefined ? Boolean(body.showAnnouncement) : true,
      brandColor: (body.brandColor as string) || '#C9A45C',
      success: true,
      message: 'Settings updated for this session. Note: on Vercel serverless, settings reset on the next cold start. For permanent changes update server.ts and redeploy.',
    };
    sendJson(res, 200, merged);
    return;
  }

  // PATCH /api/admin/security/username — change owner username (saved to Supabase)
  if (method === 'PATCH' && rawPath === '/admin/security/username') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { error: 'Unauthorized: Session expired or invalid. Please sign in again.' });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const parsed = ChangeUsernameSchema.safeParse(body);
    if (!parsed.success) {
      sendJson(res, 400, { error: parsed.error.issues[0]?.message || 'Invalid username.' });
      return;
    }
    // Require current password to authorize username change
    const currentPassword = (body.currentPassword as string) || '';
    if (!currentPassword) {
      sendJson(res, 400, { error: 'Please enter your current password to confirm the username change.' });
      return;
    }
    const result = await updateOwnerUsernameInSupabase(
      parsed.data.newUsername,
      currentPassword,
      ENV_OWNER_USERNAME,
      ENV_OWNER_PASSWORD
    );
    if (!result.ok) {
      sendJson(res, 400, { error: result.error || 'Could not update username.' });
      return;
    }
    sendJson(res, 200, {
      success: true,
      username: parsed.data.newUsername,
      message: 'Username updated successfully. Use your new username on the next login.',
    });
    return;
  }

  // PATCH /api/admin/security/password — change owner password (saved to Supabase)
  if (method === 'PATCH' && rawPath === '/admin/security/password') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { error: 'Unauthorized: Session expired or invalid. Please sign in again.' });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const parsed = ChangePasswordSchema.safeParse(body);
    if (!parsed.success) {
      sendJson(res, 400, { error: parsed.error.issues[0]?.message || 'Invalid password input.' });
      return;
    }
    const result = await updateOwnerPasswordInSupabase(
      parsed.data.currentPassword,
      parsed.data.newPassword,
      ENV_OWNER_USERNAME,
      ENV_OWNER_PASSWORD
    );
    if (!result.ok) {
      sendJson(res, 400, { error: result.error || 'Could not update password.' });
      return;
    }
    sendJson(res, 200, {
      success: true,
      message: 'Password updated securely. Your new password is active immediately.',
    });
    return;
  }

  // PATCH /api/admin/security/pin — change owner PIN (saved to Supabase)
  if (method === 'PATCH' && rawPath === '/admin/security/pin') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { error: 'Unauthorized: Session expired or invalid. Please sign in again.' });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const parsed = ChangePinSchema.safeParse(body);
    if (!parsed.success) {
      sendJson(res, 400, { error: parsed.error.issues[0]?.message || 'Invalid PIN input.' });
      return;
    }
    const result = await updateOwnerPinInSupabase(
      {
        currentPin: parsed.data.currentPin,
        currentPassword: parsed.data.currentPassword,
        newPin: parsed.data.newPin,
      },
      ENV_OWNER_USERNAME,
      ENV_OWNER_PASSWORD
    );
    if (!result.ok) {
      sendJson(res, 400, { error: result.error || 'Could not update Owner PIN.' });
      return;
    }
    sendJson(res, 200, {
      success: true,
      pinConfigured: true,
      message: 'Owner PIN updated securely. Your previous PIN is now inactive.',
    });
    return;
  }
    }
    return;
  }

  // ======================================================================
  // 404 fallback
  // ======================================================================
  sendJson(res, 404, { error: `API route not found: ${method} ${rawPath}` });
}
