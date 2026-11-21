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
  updateOwnerUsername,
  updateOwnerPassword,
  updateOwnerPin,
  isValidUsernameFormat,
  checkLoginAllowed,
  recordFailedLogin,
  resetLoginFailures,
} from '../server/services/ownerAuthService';
import {
  isHoneypotTriggered,
  isQuestionRateLimited,
  recordQuestionRateLimitHit,
  recordAbuseRateLimitHit,
} from '../server/middleware/rateLimit';
import { SubmitQuestionSchema, PublishAnswerSchema } from '../server/validation/questionSchema';

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
    const mode = getAuthMode(ENV_OWNER_PASSWORD);
    sendJson(res, 200, {
      configured: mode !== 'unconfigured',
      mode,
      pinConfigured: isPinConfigured(),
    });
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
      pinConfigured: isPinConfigured(),
    });
    return;
  }

  // POST /api/admin/login — username + password login
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
      sendJson(res, 409, {
        error: 'Owner Portal setup has not been completed yet. Please create the owner account first.',
      });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const parseResult = LoginSchema.safeParse(body);
    if (!parseResult.success) {
      sendJson(res, 400, { error: 'Please provide both username and password.' });
      return;
    }
    const { username, password } = parseResult.data;
    const verified = verifyOwnerPasswordLogin(username, password, ENV_OWNER_USERNAME, ENV_OWNER_PASSWORD);
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
    sendJson(res, 200, {
      success: true,
      token,
      username: verified.effectiveUsername,
      expiresAt: Date.now() + SESSION_DURATION_MS,
      pinConfigured: isPinConfigured(),
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
    const verified = verifyOwnerPinLogin(parseResult.data.pin, ENV_OWNER_USERNAME);
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
    sendJson(res, 200, {
      success: true,
      message: 'Settings acknowledged. Note: settings persistence requires the Express server deployment or a Supabase settings table.',
    });
    return;
  }

  // PATCH /api/admin/security/username
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
    try {
      const { updatedUsername } = updateOwnerUsername(
        parsed.data.newUsername,
        ENV_OWNER_USERNAME,
        ENV_OWNER_PASSWORD
      );
      sendJson(res, 200, {
        success: true,
        username: updatedUsername,
        message: 'Owner username updated successfully. You can use the new username on your next sign-in.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to update owner username.';
      sendJson(res, 400, { error: msg });
    }
    return;
  }

  // PATCH /api/admin/security/password
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
    try {
      const result = updateOwnerPassword(
        parsed.data.currentPassword,
        parsed.data.newPassword,
        ENV_OWNER_USERNAME,
        ENV_OWNER_PASSWORD
      );
      if (!result.ok) {
        sendJson(res, 400, { error: result.error || 'Could not update password.' });
        return;
      }
      sendJson(res, 200, { success: true, message: 'Owner password updated securely.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to update password.';
      sendJson(res, 400, { error: msg });
    }
    return;
  }

  // PATCH /api/admin/security/pin
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
    try {
      const result = updateOwnerPin(
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to update Owner PIN.';
      sendJson(res, 400, { error: msg });
    }
    return;
  }

  // ======================================================================
  // 404 fallback
  // ======================================================================
  sendJson(res, 404, { error: `API route not found: ${method} ${rawPath}` });
}
