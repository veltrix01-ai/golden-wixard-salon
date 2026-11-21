/**
 * Production-Ready Server for Golden Wizard Professional Salon
 * Features:
 * - Express + Vite SPA middleware on port 3000
 * - Modular Zod validation, IP rate limiting, honeypot, and Supabase question services
 * - Simple "I'm human" checkbox verification + server-side spam controls
 * - Resend email notification integration
 * - Protected Single-Owner authentication (username & password)
 * - RESTful public and admin APIs with strict authorization
 * - Dynamic XML Sitemap and robots.txt
 */

import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import { z } from 'zod';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  INITIAL_MENU_SNAPSHOT,
  INITIAL_REAL_CERTIFICATES,
  MenuSnapshot,
  MenuVersion,
  CertificateItem,
  formatRsPrice,
} from './src/data/menuData';
import { SubmitQuestionSchema, PublishAnswerSchema } from './server/validation/questionSchema';
import {
  getClientIp,
  isHoneypotTriggered,
  isQuestionRateLimited,
  recordQuestionRateLimitHit,
  recordAbuseRateLimitHit,
} from './server/middleware/rateLimit';
import {
  DatabaseStorageError,
  hasSupabaseQuestionsConfig,
  hasSupabaseAdminKey,
  checkSupabaseQuestionsHealth,
} from './server/services/supabaseService';
import {
  QuestionRecord,
  listPublicQuestions,
  createPendingQuestion,
  listAllAdminQuestions,
  publishAdminQuestionAnswer,
  updateAdminQuestion,
  deleteAdminQuestion,
} from './server/services/questionService';
import {
  isOwnerConfigured,
  getAuthMode,
  isPinConfigured,
  getEffectiveOwnerLabel as getEffectiveOwnerFromStore,
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
} from './server/services/ownerAuthService';
import {
  getSalonOpsSnapshot,
  syncClientSalonOpsIfServerEmpty,
  createCustomerAndInitialVisit,
  createVisitEntry,
  updateVisitEntry,
  deleteVisitEntry,
  deleteOrArchiveCustomerRecord,
  restoreSalonOpsBackup,
  CustomerOpsRecord,
  VisitOpsRecord,
} from './server/services/salonOpsService';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '25mb' }));

// Ensure upload directories exist and serve uploaded assets in both dev & production
const UPLOADS_ROOT = path.resolve(process.cwd(), 'public', 'uploads');
const MENU_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'menus');
const CERT_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'certificates');
fs.mkdirSync(MENU_UPLOADS_DIR, { recursive: true });
fs.mkdirSync(CERT_UPLOADS_DIR, { recursive: true });
app.use(
  '/uploads',
  express.static(UPLOADS_ROOT, {
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  })
);


// ============================================================================
// ENVIRONMENT & OWNER CREDENTIAL MANAGEMENT
// ============================================================================
const ENV_OWNER_USERNAME = (process.env.OWNER_USERNAME || '').trim();
const ENV_OWNER_PASSWORD = process.env.OWNER_PASSWORD || '';
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'owner@goldenwizardsalon.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const SESSIONS_FILE_PATH = path.resolve(process.cwd(), '.data-sessions.json');

function getEffectiveOwnerLabel(): string {
  return getEffectiveOwnerFromStore(ENV_OWNER_USERNAME);
}

function isSafePublicUrl(value: string, options: { allowRelativeAsset?: boolean } = {}): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (options.allowRelativeAsset && /^\/(uploads|assets)\/[^\s"'<>]+$/i.test(trimmed)) {
    return !trimmed.includes('..');
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

const LEGACY_MASTER_TOKENS = new Set([
  'gw_master_session_token_2026',
  'goldenwizard_secure_session_token',
]);

// Load active sessions from disk while purging expired or legacy static tokens
function loadStoredSessions(): Map<string, { username: string; expiresAt: number }> {
  const map = new Map<string, { username: string; expiresAt: number }>();
  let needsRewrite = false;
  try {
    if (fs.existsSync(SESSIONS_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(SESSIONS_FILE_PATH, 'utf-8'));
      const now = Date.now();
      for (const [token, session] of Object.entries(data)) {
        const rec = session as { username: string; expiresAt: number };
        if (LEGACY_MASTER_TOKENS.has(token) || !rec || rec.expiresAt <= now) {
          needsRewrite = true;
          continue;
        }
        map.set(token, rec);
      }
    }
  } catch (err) {
    console.error('Error loading stored sessions', err);
  }
  if (needsRewrite) {
    try {
      const cleanObj: Record<string, { username: string; expiresAt: number }> = {};
      for (const [token, session] of map.entries()) {
        cleanObj[token] = session;
      }
      fs.writeFileSync(SESSIONS_FILE_PATH, JSON.stringify(cleanObj, null, 2), 'utf-8');
    } catch {
      // ignore
    }
  }
  return map;
}

const activeSessions = loadStoredSessions();

function saveSessionsStore() {
  try {
    const obj: Record<string, { username: string; expiresAt: number }> = {};
    for (const [token, session] of activeSessions.entries()) {
      if (session.expiresAt > Date.now()) {
        obj[token] = session;
      }
    }
    fs.writeFileSync(SESSIONS_FILE_PATH, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving sessions store', err);
  }
}

// Periodically expire stale sessions from memory & disk
setInterval(() => {
  const now = Date.now();
  let removed = false;
  for (const [token, session] of activeSessions.entries()) {
    if (session.expiresAt <= now) {
      activeSessions.delete(token);
      removed = true;
    }
  }
  if (removed) saveSessionsStore();
}, 60 * 60 * 1000).unref();

// ============================================================================
// PERSISTENT FILE STORES FOR BOOKINGS & WEBSITE SETTINGS
// ============================================================================
export type { QuestionRecord };

export interface BookingRecord {
  id: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  preferred_date: string;
  preferred_time: string;
  notes?: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  assigned_staff?: string | null;
  created_at: string;
}

export interface WebsiteSettings {
  businessName?: string;
  tagline?: string;
  phone?: string;
  whatsappNumber?: string;
  address?: string;
  googleMapsLink?: string;
  hours?: string;
  instagramLink?: string;
  facebookLink?: string;
  announcement: string;
  showAnnouncement: boolean;
  brandColor: string;
}

const BOOKINGS_FILE_PATH = path.resolve(process.cwd(), '.data-bookings.json');
const SETTINGS_FILE_PATH = path.resolve(process.cwd(), '.data-settings.json');

// Question storage helpers are provided by ./server/services/questionService and ./server/services/supabaseService

function loadStoredBookings(): BookingRecord[] {
  try {
    if (fs.existsSync(BOOKINGS_FILE_PATH)) {
      const content = fs.readFileSync(BOOKINGS_FILE_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading bookings file', err);
  }
  return [];
}

let bookingsStore: BookingRecord[] = loadStoredBookings();

function saveBookingsStore() {
  try {
    fs.writeFileSync(BOOKINGS_FILE_PATH, JSON.stringify(bookingsStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist bookings to disk', err);
  }
}

function loadStoredSettings(): WebsiteSettings {
  const defaults: WebsiteSettings = {
    businessName: 'Golden Wizard Professional Salon',
    tagline: 'Where Style Meets Elegance',
    phone: '+91 86863 85552',
    whatsappNumber: '918686385552',
    address: '4, Gandi Maisamma X Rd, Opposite Indian Oil Petrol Pump, Gandi Maisamma, Hyderabad, Telangana 500043',
    googleMapsLink: 'https://www.google.com/maps/dir/?api=1&destination=Golden+Wizard+Professional+Salon+Gandi+Maisamma+Hyderabad+500043',
    hours: 'Monday to Sunday: 9:00 AM - 9:00 PM (Open daily until 9:00 PM)',
    announcement: 'Welcome to Golden Wizard Professional Salon. Experience world-class hair and beauty care in Gandi Maisamma.',
    showAnnouncement: true,
    brandColor: '#C9A45C',
  };
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      return { ...defaults, ...JSON.parse(fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8')) };
    }
  } catch (err) {
    console.error('Error reading settings file', err);
  }
  return defaults;
}

let settingsStore: WebsiteSettings = loadStoredSettings();

function saveSettingsStore() {
  try {
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settingsStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist settings', err);
  }
}

// ============================================================================
// MENU MANAGEMENT (DRAFT / PUBLISH / VERSION HISTORY) & CERTIFICATES STORES
// ============================================================================
export interface MenuStoreState {
  published: MenuSnapshot;
  draft: MenuSnapshot;
  versions: MenuVersion[];
  currentVersionNumber: number;
  lastPublishedAt: string;
}

const MENU_FILE_PATH = path.resolve(process.cwd(), '.data-menu.json');
const CERTS_FILE_PATH = path.resolve(process.cwd(), '.data-certificates.json');

function cloneMenuSnapshot(snapshot: MenuSnapshot): MenuSnapshot {
  return JSON.parse(JSON.stringify(snapshot));
}

function normalizeSnapshot(snapshot: MenuSnapshot): MenuSnapshot {
  const categories = [...snapshot.categories]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((c, idx) => ({ ...c, displayOrder: idx }));

  const services = [...snapshot.services]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((s) => ({
      ...s,
      priceDisplay: formatRsPrice(s.price),
    }));

  return {
    categories,
    services,
    pdfUrl: snapshot.pdfUrl || '/assets/golden-wizard-menu.pdf',
    pdfFilename: snapshot.pdfFilename || 'Golden-Wizard-Salon-Menu.pdf',
  };
}

function loadMenuStore(): MenuStoreState {
  const initialSnapshot = normalizeSnapshot(INITIAL_MENU_SNAPSHOT);
  const nowIso = new Date().toISOString();
  const initialVersion: MenuVersion = {
    id: 'ver-1',
    versionNumber: 1,
    publishedAt: nowIso,
    publishedBy: getEffectiveOwnerLabel(),
    changeSummary: 'Original Golden Wizard Salon Menu PDF baseline (14 categories, 87 services)',
    snapshot: cloneMenuSnapshot(initialSnapshot),
  };

  const defaults: MenuStoreState = {
    published: cloneMenuSnapshot(initialSnapshot),
    draft: cloneMenuSnapshot(initialSnapshot),
    versions: [initialVersion],
    currentVersionNumber: 1,
    lastPublishedAt: nowIso,
  };

  try {
    if (fs.existsSync(MENU_FILE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(MENU_FILE_PATH, 'utf-8')) as MenuStoreState;
      if (parsed && parsed.published && parsed.draft && Array.isArray(parsed.versions)) {
        return {
          published: normalizeSnapshot(parsed.published),
          draft: normalizeSnapshot(parsed.draft),
          versions: parsed.versions,
          currentVersionNumber: parsed.currentVersionNumber || parsed.versions.length || 1,
          lastPublishedAt: parsed.lastPublishedAt || nowIso,
        };
      }
    }
  } catch (err) {
    console.error('Error reading menu store:', err);
  }
  return defaults;
}

let menuStore: MenuStoreState = loadMenuStore();

function saveMenuStore() {
  try {
    fs.writeFileSync(MENU_FILE_PATH, JSON.stringify(menuStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist menu store:', err);
  }
}

function loadCertificatesStore(): CertificateItem[] {
  try {
    if (fs.existsSync(CERTS_FILE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(CERTS_FILE_PATH, 'utf-8')) as CertificateItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => a.displayOrder - b.displayOrder);
      }
    }
  } catch (err) {
    console.error('Error reading certificates store:', err);
  }
  return JSON.parse(JSON.stringify(INITIAL_REAL_CERTIFICATES));
}

let certificatesStore: CertificateItem[] = loadCertificatesStore();

function saveCertificatesStore() {
  try {
    fs.writeFileSync(CERTS_FILE_PATH, JSON.stringify(certificatesStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist certificates store:', err);
  }
}

function sanitizeSafeSlug(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'document'
  );
}

interface RateLimitEntry {
  timestamps: number[];
}

const authRateLimits = new Map<string, RateLimitEntry>();
function checkAuthRateLimit(ip: string): boolean {
  const now = Date.now();
  const fifteenMinsAgo = now - 15 * 60 * 1000;
  const entry = authRateLimits.get(ip) || { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => t > fifteenMinsAgo);
  if (entry.timestamps.length >= 15) {
    return false;
  }
  entry.timestamps.push(now);
  authRateLimits.set(ip, entry);
  return true;
}

// Question human verification uses SubmitQuestionSchema (human_verified checkbox) + rateLimit.ts (honeypot + 5/hr/IP limit)

// ============================================================================
// RESEND EMAIL DISPATCH HELPER
// ============================================================================
async function sendOwnerEmailNotification(question: QuestionRecord) {
  if (!RESEND_API_KEY) {
    return;
  }

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
</p>
`;

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
  } catch (err) {
    console.error('Resend notification failed (non-blocking):', err);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================
function requireOwnerAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  const session = activeSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) {
      activeSessions.delete(token);
      saveSessionsStore();
    }
    return res.status(401).json({ error: 'Unauthorized: Session expired or invalid. Please sign in again.' });
  }

  (req as Request & { ownerUsername?: string }).ownerUsername = session.username;
  // Extend session if active
  session.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  next();
}

// ============================================================================
// ZOD VALIDATION SCHEMAS (Question schemas imported from ./server/validation/questionSchema)
// ============================================================================

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
    .max(60, { message: 'Username cannot exceed 60 characters.' })
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
  .refine((data) => data.newPassword === data.confirmPassword, {
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
  .refine((data) => data.newPin === data.confirmPin, {
    message: 'PIN confirmation does not match.',
    path: ['confirmPin'],
  });

const SubmitBookingSchema = z.object({
  customer_name: z
    .string()
    .trim()
    .min(2, { message: 'Customer name must be at least 2 characters.' })
    .max(100, { message: 'Customer name cannot exceed 100 characters.' }),
  customer_phone: z
    .string()
    .trim()
    .min(10, { message: 'Please enter a valid 10-digit mobile number.' })
    .max(20, { message: 'Phone number cannot exceed 20 characters.' }),
  service_name: z.string().trim().min(2, { message: 'Service name is required.' }),
  preferred_date: z.string().min(1, { message: 'Preferred date is required.' }),
  preferred_time: z.string().min(1, { message: 'Preferred time slot is required.' }),
  notes: z.string().trim().max(500).optional().nullable(),
});

const UpdateBookingSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  assigned_staff: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

const safeHttpUrlSchema = z
  .string()
  .trim()
  .max(300)
  .refine((val) => val === '' || isSafePublicUrl(val, { allowRelativeAsset: false }), {
    message: 'Link must start with https:// or http://',
  });

const UpdateSettingsSchema = z.object({
  businessName: z.string().trim().max(100).optional(),
  tagline: z.string().trim().max(150).optional(),
  phone: z.string().trim().max(30).optional(),
  whatsappNumber: z.string().trim().max(30).optional(),
  address: z.string().trim().max(250).optional(),
  googleMapsLink: safeHttpUrlSchema.optional(),
  hours: z.string().trim().max(150).optional(),
  instagramLink: safeHttpUrlSchema.optional(),
  facebookLink: safeHttpUrlSchema.optional(),
  announcement: z.string().trim().max(300).optional(),
  showAnnouncement: z.boolean().optional(),
  brandColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Brand color must be a valid 6-digit hex code')
    .optional(),
});

// ============================================================================
// PUBLIC API ROUTES
// ============================================================================

/**
 * GET /api/questions
 * Returns ONLY answered (published) questions.
 * Supports search (?q=...) and pagination (?page=1&limit=10).
 */
app.get('/api/questions', async (req: Request, res: Response) => {
  try {
    const searchQuery = ((req.query.q as string) || '').trim();
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt((req.query.limit as string) || '10', 10) || 10));

    const result = await listPublicQuestions({ searchQuery, page, limit });
    res.json(result);
  } catch (err) {
    if (err instanceof DatabaseStorageError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error('[GET /api/questions Error]', err);
    res.status(500).json({ error: 'Unable to load published questions at this time.' });
  }
});

/**
 * POST /api/questions
 * Submit a new question.
 * - Enforces rate limit (5 / IP / hour)
 * - Validates input with Zod (including human_verified checkbox confirmation)
 * - Checks honeypot field
 * - Persists to Supabase public.questions (or local file store when Supabase is unconfigured) with status: 'pending'
 * - Dispatches Resend email notification
 */
app.post('/api/questions', async (req: Request, res: Response) => {
  const clientIp = getClientIp(req);

  // 1. Rate Limit Check (read-only first so typo validation errors don't exhaust hourly quota)
  if (isQuestionRateLimited(clientIp)) {
    return res.status(429).json({
      error: 'Rate limit exceeded: You can only submit up to 5 questions per hour. Please try again later.',
      errorType: 'rate_limit',
    });
  }

  // 2. Validate Body (Zod schema checks question, optional name, and human_verified === true)
  const parseResult = SubmitQuestionSchema.safeParse(req.body);
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0];
    const isCheckboxIssue = issue?.path?.includes('human_verified');
    return res.status(400).json({
      error: issue ? issue.message : 'Invalid question input.',
      errorType: isCheckboxIssue ? 'verification' : 'validation',
    });
  }

  const { question, asker_name, website } = parseResult.data;

  // 3. Honeypot check (silent hidden field must remain blank)
  if (isHoneypotTriggered(website)) {
    recordAbuseRateLimitHit(clientIp);
    return res.status(400).json({
      error: 'Unable to process your submission. Please try again.',
      errorType: 'verification',
    });
  }

  // 4. Persist new question with status: 'pending'
  let newQuestion: QuestionRecord;
  try {
    newQuestion = await createPendingQuestion({
      question,
      asker_name: asker_name && asker_name.length > 0 ? asker_name : null,
    });
  } catch (err) {
    recordAbuseRateLimitHit(clientIp);
    console.error('[POST /api/questions Database Error]', err);
    if (err instanceof DatabaseStorageError) {
      return res.status(err.statusCode).json({
        error: err.message,
        errorType: 'database',
        reasonCode: err.reasonCode,
      });
    }
    return res.status(500).json({
      error: 'Could not save your question right now. Please try again in a moment.',
      errorType: 'database',
    });
  }

  // Record 5/hour quota only once the question has actually persisted
  recordQuestionRateLimitHit(clientIp);

  // 5. Trigger Resend email notification (non-blocking)
  sendOwnerEmailNotification(newQuestion).catch(() => {});

  res.status(201).json({
    success: true,
    message: 'Thank you! Your question has been submitted. The salon owner will review and answer it soon.',
    id: newQuestion.id,
  });
});

/**
 * GET /api/settings
 * Publicly readable website configuration (welcome banner, brand).
 */
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json(settingsStore);
});

/**
 * POST /api/bookings
 * Submit an appointment booking enquiry.
 * Stored with status: 'pending'.
 */
app.post('/api/bookings', (req: Request, res: Response) => {
  const parseResult = SubmitBookingSchema.safeParse(req.body);
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    return res.status(400).json({ error: firstIssue ? firstIssue.message : 'Invalid booking details.' });
  }

  const { customer_name, customer_phone, service_name, preferred_date, preferred_time, notes } = parseResult.data;

  const newBooking: BookingRecord = {
    id: `bk-${crypto.randomUUID()}`,
    customer_name,
    customer_phone,
    service_name,
    preferred_date,
    preferred_time,
    notes: notes || null,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  bookingsStore.unshift(newBooking);
  saveBookingsStore();

  res.status(201).json({
    success: true,
    message: 'Your booking request has been submitted. Our team will verify stylist availability and confirm your slot shortly.',
    booking: newBooking,
  });
});

/**
 * GET /api/menu
 * Public endpoint returning ONLY the currently published salon menu & active PDF.
 * Draft edits are strictly excluded until explicitly published by the owner.
 */
app.get('/api/menu', (_req: Request, res: Response) => {
  const visibleCategories = menuStore.published.categories
    .filter((c) => c.visible !== false)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const visibleCatIds = new Set(visibleCategories.map((c) => c.id));
  const activeServices = menuStore.published.services
    .filter((s) => s.active !== false && visibleCatIds.has(s.categoryId))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  res.json({
    categories: visibleCategories,
    services: activeServices,
    pdfUrl: menuStore.published.pdfUrl,
    pdfFilename: menuStore.published.pdfFilename,
    versionNumber: menuStore.currentVersionNumber,
    publishedAt: menuStore.lastPublishedAt,
  });
});

/**
 * GET /api/certificates
 * Public endpoint returning ONLY published certificate credentials ordered by displayOrder.
 */
app.get('/api/certificates', (_req: Request, res: Response) => {
  const published = certificatesStore
    .filter((c) => c.published !== false)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  res.json({
    certificates: published,
  });
});

// ============================================================================
// OWNER AUTHENTICATION API
// ============================================================================

/**
 * GET /api/admin/auth/status
 * Reports whether owner credentials and Owner PIN are configured.
 */
app.get('/api/admin/auth/status', (_req: Request, res: Response) => {
  const mode = getAuthMode(ENV_OWNER_PASSWORD);
  res.json({
    configured: mode !== 'unconfigured',
    mode,
    pinConfigured: isPinConfigured(),
  });
});

/**
 * POST /api/admin/setup
 * One-time first-run owner claim route when owner account is unconfigured.
 */
app.post('/api/admin/setup', (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  if (!checkAuthRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many setup attempts. Please wait a few minutes and try again.' });
  }

  if (isOwnerConfigured(ENV_OWNER_PASSWORD)) {
    return res.status(409).json({
      error: 'Owner access is already configured. Please sign in with your owner credentials.',
    });
  }

  const parsed = SetupOwnerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid setup details.' });
  }

  const record = claimInitialOwner(parsed.data.username, parsed.data.password);

  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  activeSessions.set(sessionToken, { username: record.username, expiresAt });
  saveSessionsStore();

  res.status(201).json({
    success: true,
    token: sessionToken,
    username: record.username,
    expiresAt,
    pinConfigured: isPinConfigured(),
  });
});

/**
 * POST /api/admin/login
 * Method 1: Single owner Username + Password validation verified server-side.
 */
app.post('/api/admin/login', (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  const lockCheck = checkLoginAllowed(clientIp);
  if (!lockCheck.allowed) {
    return res.status(429).json({
      error: `Too many failed sign-in attempts. Please wait about ${lockCheck.retryAfterMinutes} minute(s) before trying again.`,
    });
  }
  if (!checkAuthRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many sign-in attempts. Please wait a few minutes and try again.' });
  }

  const parseResult = LoginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Please provide both username and password.' });
  }

  if (!isOwnerConfigured(ENV_OWNER_PASSWORD)) {
    return res.status(409).json({
      error: 'Owner Portal setup has not been completed yet. Please create the owner account first.',
    });
  }

  const { username, password } = parseResult.data;
  const verified = verifyOwnerPasswordLogin(username, password, ENV_OWNER_USERNAME, ENV_OWNER_PASSWORD);

  if (!verified.ok) {
    const failure = recordFailedLogin(clientIp);
    const lockNotice = failure.locked
      ? ' Account login temporarily locked for 15 minutes due to repeated failed attempts.'
      : '';
    return res.status(failure.locked ? 429 : 401).json({
      error: `Invalid owner username or password.${lockNotice}`,
    });
  }

  resetLoginFailures(clientIp);
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

  activeSessions.set(sessionToken, { username: verified.effectiveUsername, expiresAt });
  saveSessionsStore();

  res.json({
    success: true,
    token: sessionToken,
    username: verified.effectiveUsername,
    expiresAt,
    pinConfigured: isPinConfigured(),
  });
});

/**
 * POST /api/admin/login-pin
 * Method 2: Single owner PIN-only login verified server-side (same owner session).
 */
app.post('/api/admin/login-pin', (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  const lockCheck = checkLoginAllowed(clientIp);
  if (!lockCheck.allowed) {
    return res.status(429).json({
      error: `Too many failed PIN attempts. Please wait about ${lockCheck.retryAfterMinutes} minute(s) before trying again.`,
    });
  }
  if (!checkAuthRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many sign-in attempts. Please wait a few minutes and try again.' });
  }

  if (!isOwnerConfigured(ENV_OWNER_PASSWORD)) {
    return res.status(409).json({
      error: 'Owner Portal setup has not been completed yet. Please create the owner account first.',
    });
  }

  if (!isPinConfigured()) {
    return res.status(400).json({
      error: 'Owner PIN login is not configured yet. Sign in with Username & Password and set a secure 6+ digit PIN in Settings.',
    });
  }

  const parseResult = PinLoginSchema.safeParse(req.body);
  if (!parseResult.success) {
    recordFailedLogin(clientIp);
    return res.status(400).json({ error: 'Invalid PIN format. Please enter your 6+ digit Owner PIN.' });
  }

  const verified = verifyOwnerPinLogin(parseResult.data.pin, ENV_OWNER_USERNAME);
  if (!verified.ok) {
    const failure = recordFailedLogin(clientIp);
    const lockNotice = failure.locked
      ? ' PIN login temporarily locked for 15 minutes due to repeated failed attempts.'
      : '';
    return res.status(failure.locked ? 429 : 401).json({
      error: `Incorrect Owner PIN.${lockNotice}`,
    });
  }

  resetLoginFailures(clientIp);
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

  activeSessions.set(sessionToken, { username: verified.effectiveUsername, expiresAt });
  saveSessionsStore();

  res.json({
    success: true,
    token: sessionToken,
    username: verified.effectiveUsername,
    expiresAt,
    pinConfigured: true,
  });
});

/**
 * GET /api/admin/me
 * Check if current session token is valid & return non-secret security status.
 */
app.get('/api/admin/me', requireOwnerAuth, (req: Request, res: Response) => {
  const ownerUsername = (req as Request & { ownerUsername?: string }).ownerUsername || getEffectiveOwnerLabel();
  res.json({
    authenticated: true,
    username: ownerUsername,
    pinConfigured: isPinConfigured(),
  });
});

/**
 * PATCH /api/admin/security/username
 * Update Owner Username without unexpectedly logging out the authenticated owner.
 */
app.patch('/api/admin/security/username', requireOwnerAuth, (req: Request, res: Response) => {
  const parsed = ChangeUsernameSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid username.' });
  }

  try {
    const { updatedUsername } = updateOwnerUsername(
      parsed.data.newUsername,
      ENV_OWNER_USERNAME,
      ENV_OWNER_PASSWORD
    );

    // Keep current & active owner sessions coherent immediately without forcing logout
    for (const session of activeSessions.values()) {
      session.username = updatedUsername;
    }
    saveSessionsStore();

    res.json({
      success: true,
      username: updatedUsername,
      message: 'Owner username updated successfully. You can use the new username on your next sign-in.',
    });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Unable to update owner username.' });
  }
});

/**
 * PATCH /api/admin/security/password
 * Update Owner Password securely using scrypt hashing.
 */
app.patch('/api/admin/security/password', requireOwnerAuth, (req: Request, res: Response) => {
  const parsed = ChangePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid password input.' });
  }

  try {
    const result = updateOwnerPassword(
      parsed.data.currentPassword,
      parsed.data.newPassword,
      ENV_OWNER_USERNAME,
      ENV_OWNER_PASSWORD
    );
    if (!result.ok) {
      return res.status(400).json({ error: result.error || 'Could not update password.' });
    }

    res.json({
      success: true,
      message: 'Owner password updated securely.',
    });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Unable to update password.' });
  }
});

/**
 * PATCH /api/admin/security/pin
 * Set or change Owner PIN securely with weak-PIN validation & scrypt hashing.
 */
app.patch('/api/admin/security/pin', requireOwnerAuth, (req: Request, res: Response) => {
  const parsed = ChangePinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid PIN input.' });
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
      return res.status(400).json({ error: result.error || 'Could not update Owner PIN.' });
    }

    res.json({
      success: true,
      pinConfigured: true,
      message: 'Owner PIN updated securely. Your previous PIN is now inactive.',
    });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Unable to update Owner PIN.' });
  }
});

/**
 * POST /api/admin/logout
 */
app.post('/api/admin/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    activeSessions.delete(token);
    saveSessionsStore();
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// ============================================================================
// PROTECTED OWNER MANAGEMENT APIS
// ============================================================================

/**
 * GET /api/admin/stats
 * Overview dashboard numbers for questions and booking requests.
 */
app.get('/api/admin/stats', requireOwnerAuth, async (_req: Request, res: Response) => {
  try {
    const allQuestions = await listAllAdminQuestions();
    const totalQuestions = allQuestions.length;
    const pendingQuestions = allQuestions.filter((q) => q.status === 'pending').length;
    const answeredQuestions = allQuestions.filter((q) => q.status === 'answered').length;

    const totalBookings = bookingsStore.length;
    const pendingBookings = bookingsStore.filter((b) => b.status === 'pending').length;
    const confirmedBookings = bookingsStore.filter((b) => b.status === 'confirmed').length;

    res.json({
      totalQuestions,
      pendingQuestions,
      answeredQuestions,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      recentQuestions: allQuestions.slice(0, 5),
      recentBookings: bookingsStore.slice(0, 5),
    });
  } catch (err) {
    const statusCode = err instanceof DatabaseStorageError ? err.statusCode : 500;
    const msg = err instanceof DatabaseStorageError ? err.message : 'Failed to load dashboard stats.';
    res.status(statusCode).json({ error: msg });
  }
});

/**
 * GET /api/admin/questions
 * Returns questions for owner. Filterable by ?status=pending|answered.
 */
app.get('/api/admin/questions', requireOwnerAuth, async (req: Request, res: Response) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const list = await listAllAdminQuestions(statusFilter);
    res.json({
      questions: list,
      count: list.length,
    });
  } catch (err) {
    const statusCode = err instanceof DatabaseStorageError ? err.statusCode : 500;
    const msg = err instanceof DatabaseStorageError ? err.message : 'Failed to load questions.';
    res.status(statusCode).json({ error: msg });
  }
});

/**
 * POST /api/admin/questions/:id/publish
 * Publish an answer to a question.
 * Sets status: 'answered', answered_at: NOW().
 */
app.post('/api/admin/questions/:id/publish', requireOwnerAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const parseResult = PublishAnswerSchema.safeParse(req.body);

  if (!parseResult.success) {
    const issue = parseResult.error.issues[0];
    return res.status(400).json({ error: issue ? issue.message : 'Invalid answer.' });
  }

  try {
    const question = await publishAdminQuestionAnswer(id, parseResult.data.answer);
    if (!question) {
      return res.status(404).json({ error: 'Question not found.' });
    }
    res.json({
      success: true,
      message: 'Answer published successfully! The question is now visible on the public website.',
      question,
    });
  } catch (err) {
    const statusCode = err instanceof DatabaseStorageError ? err.statusCode : 500;
    const msg = err instanceof DatabaseStorageError ? err.message : 'Failed to publish answer.';
    res.status(statusCode).json({ error: msg });
  }
});

/**
 * PATCH /api/admin/questions/:id
 * Edit answer OR unpublish question.
 * If body contains `{ unpublish: true }`, reverts status to 'pending' and clears answered_at.
 */
app.patch('/api/admin/questions/:id', requireOwnerAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (req.body.unpublish === true) {
      const question = await updateAdminQuestion(id, { unpublish: true });
      if (!question) {
        return res.status(404).json({ error: 'Question not found.' });
      }
      return res.json({
        success: true,
        message: 'Question unpublished. It has been removed from the public website.',
        question,
      });
    }

    if (req.body.answer !== undefined) {
      const parseResult = PublishAnswerSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Invalid answer.' });
      }
      const question = await updateAdminQuestion(id, { answer: parseResult.data.answer });
      if (!question) {
        return res.status(404).json({ error: 'Question not found.' });
      }
      return res.json({
        success: true,
        message: 'Answer updated successfully.',
        question,
      });
    }

    res.status(400).json({ error: 'No valid action provided.' });
  } catch (err) {
    const statusCode = err instanceof DatabaseStorageError ? err.statusCode : 500;
    const msg = err instanceof DatabaseStorageError ? err.message : 'Failed to update question.';
    res.status(statusCode).json({ error: msg });
  }
});

/**
 * DELETE /api/admin/questions/:id
 * Delete a question.
 */
app.delete('/api/admin/questions/:id', requireOwnerAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const deleted = await deleteAdminQuestion(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Question not found.' });
    }
    res.json({
      success: true,
      message: 'Question deleted permanently.',
      id,
    });
  } catch (err) {
    const statusCode = err instanceof DatabaseStorageError ? err.statusCode : 500;
    const msg = err instanceof DatabaseStorageError ? err.message : 'Failed to delete question.';
    res.status(statusCode).json({ error: msg });
  }
});

/**
 * GET /api/admin/bookings
 * Returns booking enquiries. Filterable by ?status=pending|confirmed|completed|cancelled.
 */
app.get('/api/admin/bookings', requireOwnerAuth, (req: Request, res: Response) => {
  const statusFilter = req.query.status as string;

  let list = [...bookingsStore];
  if (statusFilter && ['pending', 'confirmed', 'completed', 'cancelled'].includes(statusFilter)) {
    list = list.filter((b) => b.status === statusFilter);
  }

  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({
    bookings: list,
    count: list.length,
  });
});

/**
 * PATCH /api/admin/bookings/:id
 * Update booking status or notes.
 */
app.patch('/api/admin/bookings/:id', requireOwnerAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const booking = bookingsStore.find((b) => b.id === id);

  if (!booking) {
    return res.status(404).json({ error: 'Booking enquiry not found.' });
  }

  const parsed = UpdateBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid booking update payload.' });
  }

  if (parsed.data.status !== undefined) {
    booking.status = parsed.data.status;
  }

  if (parsed.data.assigned_staff !== undefined) {
    booking.assigned_staff = parsed.data.assigned_staff;
  }

  if (parsed.data.notes !== undefined) {
    booking.notes = parsed.data.notes;
  }

  saveBookingsStore();

  res.json({
    success: true,
    message: 'Booking updated successfully.',
    booking,
  });
});

/**
 * DELETE /api/admin/bookings/:id
 * Delete a booking enquiry.
 */
app.delete('/api/admin/bookings/:id', requireOwnerAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const index = bookingsStore.findIndex((b) => b.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  const deleted = bookingsStore.splice(index, 1)[0];
  saveBookingsStore();

  res.json({
    success: true,
    message: 'Booking enquiry deleted.',
    id: deleted.id,
  });
});

/**
 * GET /api/admin/settings
 * Owner view of website settings.
 */
app.get('/api/admin/settings', requireOwnerAuth, (_req: Request, res: Response) => {
  res.json(settingsStore);
});

/**
 * PATCH /api/admin/settings
 * Update announcement banner message, visibility, or brand styling.
 */
app.patch('/api/admin/settings', requireOwnerAuth, (req: Request, res: Response) => {
  const parseResult = UpdateSettingsSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Invalid settings.' });
  }

  if (parseResult.data.businessName !== undefined) {
    settingsStore.businessName = parseResult.data.businessName;
  }
  if (parseResult.data.tagline !== undefined) {
    settingsStore.tagline = parseResult.data.tagline;
  }
  if (parseResult.data.phone !== undefined) {
    settingsStore.phone = parseResult.data.phone;
  }
  if (parseResult.data.whatsappNumber !== undefined) {
    settingsStore.whatsappNumber = parseResult.data.whatsappNumber;
  }
  if (parseResult.data.address !== undefined) {
    settingsStore.address = parseResult.data.address;
  }
  if (parseResult.data.googleMapsLink !== undefined) {
    settingsStore.googleMapsLink = parseResult.data.googleMapsLink;
  }
  if (parseResult.data.hours !== undefined) {
    settingsStore.hours = parseResult.data.hours;
  }
  if (parseResult.data.instagramLink !== undefined) {
    settingsStore.instagramLink = parseResult.data.instagramLink;
  }
  if (parseResult.data.facebookLink !== undefined) {
    settingsStore.facebookLink = parseResult.data.facebookLink;
  }
  if (parseResult.data.announcement !== undefined) {
    settingsStore.announcement = parseResult.data.announcement;
  }
  if (parseResult.data.showAnnouncement !== undefined) {
    settingsStore.showAnnouncement = parseResult.data.showAnnouncement;
  }
  if (parseResult.data.brandColor !== undefined) {
    settingsStore.brandColor = parseResult.data.brandColor;
  }

  saveSettingsStore();

  res.json({
    success: true,
    message: 'Website settings saved.',
    settings: settingsStore,
  });
});

// ============================================================================
// PROTECTED OWNER MENU MANAGEMENT & VERSION HISTORY APIS
// ============================================================================
const safeAssetOrHttpUrl = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((val) => isSafePublicUrl(val, { allowRelativeAsset: true }), {
    message: 'URL must be a valid https://, http://, or local asset path',
  });

const MenuCategorySchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1, 'Category name is required').max(120),
  group: z.enum(['hair', 'skin', 'nails-bridal']).default('skin'),
  description: z.string().trim().max(400).optional().default(''),
  image: safeAssetOrHttpUrl,
  pdfPage: z.number().int().min(1).max(50).optional(),
  displayOrder: z.number().int().min(0),
  visible: z.boolean().default(true),
});

const MenuServiceSchema = z.object({
  id: z.string().min(1).max(80),
  categoryId: z.string().min(1).max(80),
  name: z.string().trim().min(1, 'Service name is required').max(140),
  price: z.number().min(0).max(500000).nullable(),
  priceDisplay: z.string().optional(),
  note: z.string().trim().max(250).optional(),
  pdfPage: z.number().int().min(1).max(50).optional(),
  displayOrder: z.number().int().min(0),
  active: z.boolean().default(true),
});

const SaveMenuDraftSchema = z.object({
  categories: z.array(MenuCategorySchema).min(1, 'At least one category is required.'),
  services: z.array(MenuServiceSchema),
  pdfUrl: safeAssetOrHttpUrl.optional(),
  pdfFilename: z.string().trim().min(1).max(200).optional(),
});

const PublishMenuSchema = z.object({
  changeSummary: z.string().trim().max(300).optional(),
});

app.get('/api/admin/menu', requireOwnerAuth, (_req: Request, res: Response) => {
  const hasUnpublishedChanges =
    JSON.stringify(menuStore.draft) !== JSON.stringify(menuStore.published);

  res.json({
    draft: menuStore.draft,
    published: menuStore.published,
    versions: [...menuStore.versions].sort((a, b) => b.versionNumber - a.versionNumber),
    currentVersionNumber: menuStore.currentVersionNumber,
    lastPublishedAt: menuStore.lastPublishedAt,
    hasUnpublishedChanges,
  });
});

app.put('/api/admin/menu/draft', requireOwnerAuth, (req: Request, res: Response) => {
  const parsed = SaveMenuDraftSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid menu draft payload.' });
  }

  menuStore.draft = normalizeSnapshot({
    categories: parsed.data.categories,
    services: parsed.data.services.map((s) => ({
      ...s,
      priceDisplay: formatRsPrice(s.price),
    })),
    pdfUrl: parsed.data.pdfUrl || menuStore.draft.pdfUrl,
    pdfFilename: parsed.data.pdfFilename || menuStore.draft.pdfFilename,
  });
  saveMenuStore();

  res.json({
    success: true,
    message: 'Menu changes saved to private Draft.',
    draft: menuStore.draft,
    hasUnpublishedChanges: JSON.stringify(menuStore.draft) !== JSON.stringify(menuStore.published),
  });
});

app.post('/api/admin/menu/discard-draft', requireOwnerAuth, (_req: Request, res: Response) => {
  menuStore.draft = cloneMenuSnapshot(menuStore.published);
  saveMenuStore();

  res.json({
    success: true,
    message: 'Unpublished draft edits discarded.',
    draft: menuStore.draft,
    hasUnpublishedChanges: false,
  });
});

app.post('/api/admin/menu/publish', requireOwnerAuth, (req: Request, res: Response) => {
  const parsed = PublishMenuSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid publish request.' });
  }

  const nextVersionNum = (menuStore.currentVersionNumber || 1) + 1;
  const nowIso = new Date().toISOString();
  const publishedSnapshot = normalizeSnapshot(cloneMenuSnapshot(menuStore.draft));

  const newVersion: MenuVersion = {
    id: `ver-${nextVersionNum}-${Date.now()}`,
    versionNumber: nextVersionNum,
    publishedAt: nowIso,
    publishedBy: (req as Request & { ownerUsername?: string }).ownerUsername || getEffectiveOwnerLabel(),
    changeSummary:
      parsed.data.changeSummary?.trim() ||
      `Menu update v${nextVersionNum} (${publishedSnapshot.categories.length} categories, ${publishedSnapshot.services.length} services)`,
    snapshot: cloneMenuSnapshot(publishedSnapshot),
  };

  menuStore.published = cloneMenuSnapshot(publishedSnapshot);
  menuStore.draft = cloneMenuSnapshot(publishedSnapshot);
  menuStore.currentVersionNumber = nextVersionNum;
  menuStore.lastPublishedAt = nowIso;
  menuStore.versions.unshift(newVersion);
  if (menuStore.versions.length > 30) {
    menuStore.versions = menuStore.versions.slice(0, 30);
  }
  saveMenuStore();

  res.json({
    success: true,
    message: `Menu version v${nextVersionNum} published to live website!`,
    published: menuStore.published,
    draft: menuStore.draft,
    versions: menuStore.versions,
    currentVersionNumber: menuStore.currentVersionNumber,
    lastPublishedAt: menuStore.lastPublishedAt,
    hasUnpublishedChanges: false,
  });
});

app.post('/api/admin/menu/versions/:versionId/restore', requireOwnerAuth, (req: Request, res: Response) => {
  const { versionId } = req.params;
  const publishImmediately = Boolean(req.body?.publishImmediately);

  const target = menuStore.versions.find((v) => v.id === versionId);
  if (!target) {
    return res.status(404).json({ error: 'Menu version not found.' });
  }

  const restoredSnapshot = normalizeSnapshot(cloneMenuSnapshot(target.snapshot));
  menuStore.draft = cloneMenuSnapshot(restoredSnapshot);

  if (publishImmediately) {
    const nextVersionNum = (menuStore.currentVersionNumber || 1) + 1;
    const nowIso = new Date().toISOString();
    const newVersion: MenuVersion = {
      id: `ver-${nextVersionNum}-${Date.now()}`,
      versionNumber: nextVersionNum,
      publishedAt: nowIso,
      publishedBy: (req as Request & { ownerUsername?: string }).ownerUsername || getEffectiveOwnerLabel(),
      changeSummary: `Restored from v${target.versionNumber}`,
      snapshot: cloneMenuSnapshot(restoredSnapshot),
    };
    menuStore.published = cloneMenuSnapshot(restoredSnapshot);
    menuStore.currentVersionNumber = nextVersionNum;
    menuStore.lastPublishedAt = nowIso;
    menuStore.versions.unshift(newVersion);
    saveMenuStore();

    return res.json({
      success: true,
      message: `Restored v${target.versionNumber} and published as v${nextVersionNum}.`,
      draft: menuStore.draft,
      published: menuStore.published,
      versions: menuStore.versions,
      currentVersionNumber: menuStore.currentVersionNumber,
      lastPublishedAt: menuStore.lastPublishedAt,
      hasUnpublishedChanges: false,
    });
  }

  saveMenuStore();
  res.json({
    success: true,
    message: `Loaded v${target.versionNumber} into Draft for review before publishing.`,
    draft: menuStore.draft,
    published: menuStore.published,
    versions: menuStore.versions,
    currentVersionNumber: menuStore.currentVersionNumber,
    lastPublishedAt: menuStore.lastPublishedAt,
    hasUnpublishedChanges: JSON.stringify(menuStore.draft) !== JSON.stringify(menuStore.published),
  });
});

/**
 * POST /api/admin/menu/upload-pdf
 * Accepts JSON { filename, contentBase64 } (max 15 MB PDF).
 * Attaches uploaded PDF ONLY to Draft for manual review & editing before publishing.
 */
app.post('/api/admin/menu/upload-pdf', requireOwnerAuth, (req: Request, res: Response) => {
  const filenameRaw = String(req.body?.filename || 'menu.pdf').trim();
  const base64Raw = String(req.body?.contentBase64 || '');

  if (!base64Raw) {
    return res.status(400).json({ error: 'PDF file data is missing.' });
  }

  const base64Payload = base64Raw.includes(',') ? base64Raw.split(',')[1] : base64Raw;
  const buffer = Buffer.from(base64Payload, 'base64');

  if (buffer.length === 0 || buffer.length > 15 * 1024 * 1024) {
    return res.status(400).json({ error: 'PDF file must be between 1 byte and 15 MB.' });
  }

  // Validate PDF magic header %PDF-
  if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    return res.status(400).json({ error: 'Uploaded file is not a valid PDF document.' });
  }

  const baseName = sanitizeSafeSlug(filenameRaw.replace(/\.pdf$/i, ''));
  const storedName = `menu-${Date.now()}-${baseName}.pdf`;
  const targetPath = path.resolve(MENU_UPLOADS_DIR, storedName);
  if (!targetPath.startsWith(MENU_UPLOADS_DIR + path.sep)) {
    return res.status(400).json({ error: 'Invalid upload file path.' });
  }

  try {
    fs.writeFileSync(targetPath, buffer);
    const publicUrl = `/uploads/menus/${storedName}`;
    menuStore.draft.pdfUrl = publicUrl;
    menuStore.draft.pdfFilename = `${baseName}.pdf`;
    saveMenuStore();

    res.status(201).json({
      success: true,
      message: 'Menu PDF uploaded to Draft. Review categories and prices below, then click Publish when ready.',
      pdfUrl: menuStore.draft.pdfUrl,
      pdfFilename: menuStore.draft.pdfFilename,
      draft: menuStore.draft,
      hasUnpublishedChanges: true,
    });
  } catch (err) {
    console.error('Failed to save uploaded menu PDF:', err);
    res.status(500).json({ error: 'Could not store uploaded PDF file.' });
  }
});

// ============================================================================
// PROTECTED OWNER CERTIFICATE MANAGEMENT APIS
// ============================================================================
const CertificateInputSchema = z.object({
  title: z.string().trim().min(2, 'Certificate title is required').max(200),
  recipient: z.string().trim().max(120).optional().default(''),
  issuingOrganization: z.string().trim().min(2, 'Institution/issuer name is required').max(220),
  centre: z.string().trim().max(100).optional().default(''),
  issueDate: z.string().trim().max(60).optional().default(''),
  certificateRef: z.string().trim().max(80).optional().default(''),
  category: z.string().trim().max(80).optional().default('Accreditation'),
  description: z.string().trim().max(500).optional().default(''),
  fileUrl: safeAssetOrHttpUrl,
  fileType: z.enum(['image', 'pdf']).default('image'),
  published: z.boolean().default(true),
});

app.get('/api/admin/certificates', requireOwnerAuth, (_req: Request, res: Response) => {
  const sorted = [...certificatesStore].sort((a, b) => a.displayOrder - b.displayOrder);
  res.json({ certificates: sorted });
});

app.post('/api/admin/certificates/upload', requireOwnerAuth, (req: Request, res: Response) => {
  const filenameRaw = String(req.body?.filename || 'certificate').trim();
  const base64Raw = String(req.body?.contentBase64 || '');

  if (!base64Raw) {
    return res.status(400).json({ error: 'File content is missing.' });
  }

  const mimeMatch = base64Raw.match(/^data:([^;]+);base64,/i);
  const declaredMime = mimeMatch?.[1]?.toLowerCase() || '';
  const base64Payload = base64Raw.includes(',') ? base64Raw.split(',')[1] : base64Raw;
  const buffer = Buffer.from(base64Payload, 'base64');

  if (buffer.length === 0 || buffer.length > 12 * 1024 * 1024) {
    return res.status(400).json({ error: 'Certificate file must be under 12 MB.' });
  }

  // Detect real magic bytes for PNG, JPEG, WebP, PDF
  const isPdf = buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  const isPng =
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isWebp =
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';

  let ext = '';
  let fileType: 'image' | 'pdf' = 'image';

  if (isPdf) {
    ext = 'pdf';
    fileType = 'pdf';
  } else if (isPng) {
    ext = 'png';
  } else if (isJpeg) {
    ext = 'jpg';
  } else if (isWebp) {
    ext = 'webp';
  } else {
    return res.status(400).json({
      error: `Unsupported file format${declaredMime ? ` (${declaredMime})` : ''}. Please upload PNG, JPG, WebP, or PDF.`,
    });
  }

  const slug = sanitizeSafeSlug(filenameRaw.replace(/\.[a-z0-9]+$/i, ''));
  const storedName = `cert-${Date.now()}-${slug}.${ext}`;
  const targetPath = path.resolve(CERT_UPLOADS_DIR, storedName);
  if (!targetPath.startsWith(CERT_UPLOADS_DIR + path.sep)) {
    return res.status(400).json({ error: 'Invalid upload file path.' });
  }

  try {
    fs.writeFileSync(targetPath, buffer);
    res.status(201).json({
      success: true,
      url: `/uploads/certificates/${storedName}`,
      fileType,
      filename: storedName,
    });
  } catch (err) {
    console.error('Failed to save certificate file:', err);
    res.status(500).json({ error: 'Failed to store certificate document.' });
  }
});

app.post('/api/admin/certificates', requireOwnerAuth, (req: Request, res: Response) => {
  const parsed = CertificateInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid certificate details.' });
  }

  const maxOrder = certificatesStore.reduce((m, c) => Math.max(m, c.displayOrder), -1);
  const newCert: CertificateItem = {
    id: `GW-CERT-${Date.now()}`,
    ...parsed.data,
    displayOrder: maxOrder + 1,
    createdAt: new Date().toISOString(),
  };

  certificatesStore.push(newCert);
  saveCertificatesStore();

  res.status(201).json({
    success: true,
    message: 'Certificate added.',
    certificate: newCert,
  });
});

const CertificatePatchSchema = CertificateInputSchema.partial().extend({
  displayOrder: z.number().int().min(0).optional(),
});

app.patch('/api/admin/certificates/:id', requireOwnerAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = certificatesStore.findIndex((c) => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Certificate not found.' });
  }

  const parsed = CertificatePatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid certificate update details.' });
  }

  const current = certificatesStore[idx];
  const merged = {
    ...current,
    ...parsed.data,
  };

  certificatesStore[idx] = merged;
  saveCertificatesStore();

  res.json({
    success: true,
    message: 'Certificate updated.',
    certificate: merged,
  });
});

app.post('/api/admin/certificates/reorder', requireOwnerAuth, (req: Request, res: Response) => {
  const orderedIds = Array.isArray(req.body?.orderedIds) ? (req.body.orderedIds as string[]) : [];
  if (orderedIds.length === 0) {
    return res.status(400).json({ error: 'orderedIds array is required.' });
  }

  const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
  certificatesStore = certificatesStore
    .map((cert, idx) => ({
      ...cert,
      displayOrder: orderMap.has(cert.id) ? orderMap.get(cert.id)! : orderedIds.length + idx,
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  saveCertificatesStore();
  res.json({ success: true, certificates: certificatesStore });
});

app.delete('/api/admin/certificates/:id', requireOwnerAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = certificatesStore.findIndex((c) => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Certificate not found.' });
  }

  const [removed] = certificatesStore.splice(idx, 1);
  certificatesStore = certificatesStore.map((c, i) => ({ ...c, displayOrder: i }));
  saveCertificatesStore();

  res.json({
    success: true,
    message: 'Certificate deleted.',
    id: removed.id,
  });
});

// ============================================================================
// PROTECTED SALON OPERATIONS APIS (CUSTOMERS & DAILY REGISTER VISITS)
// ============================================================================
const CreateSalonCustomerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters.').max(120),
  mobile: z.string().trim().min(10, 'Mobile number must contain at least 10 digits.').max(20),
  whatsapp: z.string().trim().max(20).optional(),
  email: z.string().trim().max(120).optional(),
  appointmentType: z.enum(['walk-in', 'phone-booking', 'online-enquiry', 'referral']).optional(),
  selectedService: z.string().trim().max(120).optional(),
  assignedStaff: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
  consentMarketing: z.boolean().optional(),
});

const CreateSalonVisitSchema = z.object({
  customerId: z.string().trim().min(1).max(60),
  customerName: z.string().trim().min(1).max(120),
  mobile: z.string().trim().min(6).max(20),
  visitDate: z.string().trim().min(4).max(20),
  visitTime: z.string().trim().min(1).max(40),
  serviceName: z.string().trim().min(1).max(120),
  assignedStaff: z.string().trim().max(100).default('Floor Stylist'),
  status: z.enum(['New', 'Confirmed', 'Arrived', 'In Progress', 'Completed', 'Cancelled', 'No Show']).optional(),
  paymentStatus: z.enum(['Paid', 'Pending', 'Partial']).optional(),
  staffNotes: z.string().trim().max(500).optional(),
  amount: z.number().min(0).max(500000).optional(),
});

const UpdateSalonVisitSchema = z.object({
  status: z.enum(['New', 'Confirmed', 'Arrived', 'In Progress', 'Completed', 'Cancelled', 'No Show']).optional(),
  paymentStatus: z.enum(['Paid', 'Pending', 'Partial']).optional(),
});

app.get('/api/admin/salon-ops', requireOwnerAuth, (req: Request, res: Response) => {
  const includeArchived = req.query.includeArchived === 'true';
  res.json(getSalonOpsSnapshot(includeArchived));
});

app.post('/api/admin/salon-ops/sync', requireOwnerAuth, (req: Request, res: Response) => {
  const customers = Array.isArray(req.body?.customers) ? (req.body.customers as CustomerOpsRecord[]) : [];
  const visits = Array.isArray(req.body?.visits) ? (req.body.visits as VisitOpsRecord[]) : [];
  const snapshot = syncClientSalonOpsIfServerEmpty(customers, visits);
  res.json(snapshot);
});

app.post('/api/admin/salon-ops/customers', requireOwnerAuth, (req: Request, res: Response) => {
  const parsed = CreateSalonCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid customer details.' });
  }
  const result = createCustomerAndInitialVisit(parsed.data);
  if (!result.success) {
    return res.status(409).json({ error: result.error || 'Could not register customer.' });
  }
  res.status(201).json({
    success: true,
    customer: result.customer,
    visit: result.visit,
  });
});

app.delete('/api/admin/salon-ops/customers/:id', requireOwnerAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const result = deleteOrArchiveCustomerRecord(id);
  if (!result) {
    return res.status(404).json({ error: 'Customer record not found.' });
  }
  res.json({
    success: true,
    ...result,
    message:
      result.action === 'archived'
        ? `Customer archived from active directory while preserving ${result.linkedVisitsCount} historical Daily Register record(s).`
        : 'Customer record deleted permanently.',
  });
});

app.post('/api/admin/salon-ops/visits', requireOwnerAuth, (req: Request, res: Response) => {
  const parsed = CreateSalonVisitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid visit details.' });
  }
  const visit = createVisitEntry(parsed.data);
  res.status(201).json({
    success: true,
    visit,
  });
});

app.patch('/api/admin/salon-ops/visits/:id', requireOwnerAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = UpdateSalonVisitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid visit update.' });
  }
  const updated = updateVisitEntry(id, parsed.data);
  if (!updated) {
    return res.status(404).json({ error: 'Daily Register entry not found.' });
  }
  res.json({ success: true, visit: updated });
});

app.delete('/api/admin/salon-ops/visits/:id', requireOwnerAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const result = deleteVisitEntry(id);
  if (!result) {
    return res.status(404).json({ error: 'Daily Register entry not found.' });
  }
  res.json({
    success: true,
    id,
    updatedCustomer: result.updatedCustomer || null,
    message: 'Daily Register entry deleted.',
  });
});

app.post('/api/admin/salon-ops/restore', requireOwnerAuth, (req: Request, res: Response) => {
  const customers = Array.isArray(req.body?.customers) ? (req.body.customers as CustomerOpsRecord[]) : null;
  const visits = Array.isArray(req.body?.visits) ? (req.body.visits as VisitOpsRecord[]) : null;
  if (!customers || !visits) {
    return res.status(400).json({ error: 'Invalid backup payload: missing customers or visits array.' });
  }
  const snapshot = restoreSalonOpsBackup(customers, visits);
  res.json({
    success: true,
    ...snapshot,
    message: 'Backup records restored successfully.',
  });
});

// ============================================================================
// SEO: SITEMAP & ROBOTS
// ============================================================================
app.get('/robots.txt', (req: Request, res: Response) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/login
Disallow: /api/admin/

Sitemap: ${APP_URL}/sitemap.xml
`);
});

app.get('/sitemap.xml', (req: Request, res: Response) => {
  res.type('application/xml');
  const now = new Date().toISOString().split('T')[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${APP_URL}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
  res.send(xml);
});

// ============================================================================
// Health check endpoint for container / supervisor readiness
app.get('/api/health', async (_req: Request, res: Response) => {
  const supabaseStatus = await checkSupabaseQuestionsHealth();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    storageBackend: supabaseStatus === 'ready' ? 'supabase' : 'local-file',
    supabaseStatus,
    supabaseAdminReady: hasSupabaseAdminKey(),
  });
});

// ============================================================================
// VITE SPA DEV MIDDLEWARE MOUNT
// ============================================================================
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production if dist exists
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  const handleShutdown = (signal: string) => {
    console.log(`Received ${signal}, closing server on port ${PORT}...`);
    server.close(() => {
      console.log('Server closed successfully.');
      process.exit(0);
    });
    // Force exit after 3 seconds if connections linger
    setTimeout(() => {
      process.exit(0);
    }, 3000).unref();
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
