# Golden Wizard Salon — Implementation Plan

> Generated after full codebase inspection. This plan is ready for implementation once you reply with **PLAN APPROVED**.

---

## Section 1: Existing System Inventory

### Frontend Framework & Stack

- **React 19.0.1** with TypeScript 7.0.2 and Vite 8.3.0
- Styling: **Tailwind CSS 4.3.3** via `@tailwindcss/vite`
- Animations: **motion 12.23.24** (Framer Motion successor)
- Icons: **lucide-react 0.546.0** and **@hugeicons/react 1.1.10**
- Validation: **Zod 4.6.7** (shared server and client)
- Build output goes to `dist/` via `npm run build`

### Backend Server

The backend is **Express 4.21.2**, not Bun. The dev command `npm run dev` launches `tsx server.ts`, which uses the `tsx` TypeScript runner to execute `server.ts` directly with Node.js. There is no Bun runtime involved. The server runs on port 3000 and serves the Vite-built frontend as a SPA.

### Authentication System

The authentication is entirely **server-side, file-based, with scrypt hashing**. Here is how it works step by step:

1. **Three credential layers** (in priority order):
   - **Persisted credentials**: username + scrypt-hashed password stored in `.data-admin-auth.json`. This is the most common case once the owner runs the first-time setup.
   - **Environment credentials**: `OWNER_USERNAME` and `OWNER_PASSWORD` from `.env`. Used as a fallback when no `.data-admin-auth.json` exists. The raw password in the env variable is compared using `crypto.timingSafeEqual` (not hashed), which is less secure but provides a bootstrap path.
   - **PIN login**: A separate scrypt-hashed 6–12 digit PIN stored in `.data-admin-auth.json`. This provides quick re-entry without typing the full password.

2. **What scrypt is**: scrypt is a cryptographic password hashing function that is intentionally slow to compute, making it very hard to brute-force even if the hash file is stolen. Node.js has this built in via `crypto.scryptSync`.

3. **What the honeypot is**: The question submission form contains a hidden `website` field (invisible to real users). Bots that fill in every form field will populate it. The server checks whether that field has content and rejects the submission silently if so.

4. **Sessions**: 32-byte random hex tokens stored in memory (`activeSessions` Map) and persisted to `.data-sessions.json`. Sessions expire after 30 days. An interval cleans expired ones every hour. A `LEGACY_MASTER_TOKENS` set causes old hardcoded tokens to be automatically purged from the sessions file on startup.

### Current Data Persistence

All six `.data-*.json` files exist and are actively used:

| File | Contents |
|---|---|
| `.data-admin-auth.json` | Owner scrypt PIN hash (no username/password hash yet — only PIN is set so far) |
| `.data-sessions.json` | Active session tokens with expiry timestamps |
| `.data-questions.json` | Customer questions array (currently empty `[]`) |
| `.data-bookings.json` | Appointment booking enquiries (currently empty `[]`) |
| `.data-salon-ops.json` | Salon CRM: customers and visit records |
| `.data-settings.json` | Website settings (announcement text, brand color, `showAnnouncement` flag) |

**Important**: `.data-admin-auth.json` currently only contains a PIN hash (`pinSalt` + `pinHash`), with no username or password hash. This means the owner has set a PIN but has never claimed/set a username+password via `/api/admin/setup`. The auth service's `getAuthMode()` will therefore return `'unconfigured'` unless `OWNER_PASSWORD` is set in the environment.

### Current Supabase Integration Status

Supabase is **not yet configured** (no real values in `.env`). The integration code exists and is complete, but it is dormant.

The function `hasSupabaseQuestionsConfig()` in `supabaseService.ts` returns `true` only when:
- `SUPABASE_URL` is a valid HTTP/HTTPS URL, **AND**
- Either `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY` is non-empty.

Right now all three variables are empty strings, so the check returns `false`. Every question service function (`listPublicQuestions`, `createPendingQuestion`, etc.) calls `tryWithSupabase()` first, which calls `isSupabaseQuestionsTableReady()`. That immediately returns `false` when Supabase is not configured, so all operations transparently fall through to the local `.data-questions.json` file. **The fallback is working correctly right now**.

### API Routes: server.ts vs netlify/functions/api.ts

**`server.ts` (the real, production-quality server)** has these routes:

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/questions` | None | Public paginated + searchable answered questions |
| POST | `/api/questions` | None | Submit question (rate limit, honeypot, Zod validation) |
| GET | `/api/settings` | None | Public website settings |
| POST | `/api/bookings` | None | Submit booking enquiry |
| GET | `/api/menu` | None | Published menu categories/services |
| GET | `/api/certificates` | None | Published certificates |
| GET | `/api/admin/auth/status` | None | Whether owner is configured |
| POST | `/api/admin/setup` | None | First-run owner claim |
| POST | `/api/admin/login` | None | Username+password login |
| POST | `/api/admin/login-pin` | None | PIN login |
| GET | `/api/admin/me` | Bearer | Session check |
| POST | `/api/admin/logout` | None | Invalidate session token |
| GET | `/api/admin/stats` | Bearer | Dashboard numbers |
| GET | `/api/admin/questions` | Bearer | All questions (filterable) |
| POST | `/api/admin/questions/:id/publish` | Bearer | Publish answer |
| PATCH | `/api/admin/questions/:id` | Bearer | Edit/unpublish answer |
| DELETE | `/api/admin/questions/:id` | Bearer | Delete question |
| GET | `/api/admin/bookings` | Bearer | All bookings |
| PATCH | `/api/admin/bookings/:id` | Bearer | Update booking status |
| DELETE | `/api/admin/bookings/:id` | Bearer | Delete booking |
| GET | `/api/admin/settings` | Bearer | Owner view of settings |
| PATCH | `/api/admin/settings` | Bearer | Update settings |
| PATCH | `/api/admin/security/username` | Bearer | Change username |
| PATCH | `/api/admin/security/password` | Bearer | Change password |
| PATCH | `/api/admin/security/pin` | Bearer | Change/set PIN |

**`netlify/functions/api.ts` (the Netlify serverless function)** is a completely separate implementation that is **severely out of date and insecure**. It is covered in detail in Section 2 and 6.

### Frontend Components — What They Currently Call

| Component | API Calls |
|---|---|
| `AskQuestionForm` | `POST /api/questions` via `submitCustomerQuestion()` in `src/services/questionApi.ts` ✅ Already wired to real backend |
| `PublicQASection` | `GET /api/questions` ✅ Already wired to real backend |
| `AdminLoginPage` | `GET /api/admin/auth/status`, `POST /api/admin/setup`, `POST /api/admin/login`, `POST /api/admin/login-pin` ✅ Already wired |
| `AdminDashboardPage` | All admin API endpoints ✅ Already wired |
| `OwnerSecuritySettingsPanel` | `/api/admin/me`, PATCH security endpoints ✅ Already wired |
| `App.tsx` | `GET /api/settings` ✅ Already wired |
| `src/services/db.ts` | **localStorage only** — This is the legacy CRM service for the Salon Operations view. It still reads/writes to `localStorage` for customers, visits, appointments. This is the `AdminDashboard` component (salon operations mode), NOT the main `AdminDashboardPage` (Q&A/bookings mode). |

### Legacy Hardcoded Credentials Found

**In `netlify/functions/api.ts`** — multiple critical security problems:

1. **Hardcoded default password**: `const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'goldenwizard_secure_pass_2026'` — this fallback plaintext password is committed to source code.
2. **Hardcoded master session token**: `activeSessions.set('gw_master_session_token_2026', ...)` — anyone with this string has permanent admin access.
3. **Dozens of accepted usernames/passwords in the login handler**: `allowedUsernames` includes `'admin'`, `'owner'`, `'kotagiri'`, `'kotagirichanti@gmail.com'`. `allowedPasswords` includes `'1234'`, `'admin'`, `'admin123'`.
4. **A second hardcoded token accepted in `isAuthorized()`**: `'goldenwizard_secure_session_token'` grants admin access with no expiry.

---

## Section 2: Gap Analysis

### What is Missing or Broken in `netlify/functions/api.ts`

The Netlify function is a completely independent implementation written separately from `server.ts`. It does not share any code with the service layer. Here are the specific problems:

1. **In-memory data only**: `memoryQuestions`, `memoryBookings`, `memorySettings` are plain JavaScript arrays/objects. Because Netlify functions are serverless (each invocation can be a fresh cold start), these arrays reset to empty on every new instance. Any question submitted may disappear seconds later.

2. **No Supabase integration**: The function has no Supabase code at all. Even if you configure Supabase credentials in Netlify's environment, this function will never use them.

3. **No scrypt authentication**: The login handler accepts any of a dozen hardcoded usernames and passwords. It never reads `.data-admin-auth.json`.

4. **Hardcoded master session token and credentials**: Described above in Section 1. These are a critical security vulnerability.

5. **Missing routes**: The Netlify function does not implement `/api/admin/auth/status`, `/api/admin/setup`, `/api/admin/login-pin`, `/api/admin/me`, `/api/admin/logout`, or any of the security PATCH endpoints. The `AdminLoginPage` calls these and will fail on Netlify.

6. **Missing `/api/menu` and `/api/certificates` routes**: The public site uses these but the Netlify function returns 404 for them.

### Does the Netlify Function Share the Service Layer?

No. The Netlify function duplicates everything. The fix is to have it import and call the same service layer that `server.ts` uses.

### Is `supabase/schema.sql` Sufficient?

The file `supabase/schema.sql` covers the `questions` table with RLS policies. However, `supabase-schema.sql` (the root-level version, which is more complete) also adds `bookings`, `settings`, `menu_categories`, `menu_services`, `menu_versions`, `certificates`, and storage bucket policies.

**What is needed for the Q&A feature specifically**: Only the `questions` table from either schema file. The `questionService.ts` only queries `public.questions`. The service-role key bypasses RLS entirely, so the RLS policies in the schema are relevant only if you later use the anon key from the browser directly.

**The gap**: Neither schema file is currently applied to your Supabase project because Supabase is not configured. The migration plan in Section 5 covers applying it safely.

### Are Any Frontend Components Still Reading from localStorage When They Should Read from the API?

Yes, one component: `src/services/db.ts` is a localStorage-based CRM. It is used by `AdminDashboard.tsx` (the Salon Operations view accessed via the "Salon Register & Customers" button in the admin sidebar). The main question management, bookings, and settings in `AdminDashboardPage.tsx` already read from real API endpoints.

The `src/services/db.ts` localStorage usage is **not broken** — it is intentionally a local-first CRM for in-salon walk-in customer tracking. It does have a backend counterpart in `salonOpsService.ts` that handles sync, but the frontend `AdminDashboard` component does not currently call those endpoints. This is noted but is a separate concern from the Q&A workflow.

**`App.tsx`** fetches from `/api/settings` and uses the result to override `salonDb.getSettings()` for the announcement banner. This is already correct behavior.

### What Env Variables Are Currently Undefined / Causing JSON Fallback?

The following are blank in `.env.example` and presumably blank in your actual `.env`:

- `SUPABASE_URL` — blank → Supabase is off, all question data goes to `.data-questions.json`
- `SUPABASE_ANON_KEY` — blank → same
- `SUPABASE_SERVICE_ROLE_KEY` — blank → same
- `OWNER_USERNAME` — blank → server defaults to `'goldenwizard_admin'` as the expected username
- `OWNER_PASSWORD` — blank → `getAuthMode()` returns `'unconfigured'` unless a password has been claimed via `/api/admin/setup` and stored in `.data-admin-auth.json`

**Current state**: `.data-admin-auth.json` only has a PIN hash, no username/password hash. This means `isOwnerConfigured()` returns `false` (because `hasPersistedPassword()` is `false` and `envPassword` is empty). The admin login page will show the "setup" form on first visit, which is the correct first-run behavior.

---

## Section 3: Conflict Analysis

### Could the Supabase Migration Conflict with Existing `.data-*.json` Data?

No. The migration plan adds tables and policies to Supabase. It does not touch your local `.data-*.json` files. The fallback mechanism in `questionService.ts` works like this:

1. On every API call, it first checks `isSupabaseQuestionsTableReady()`.
2. That function calls `hasSupabaseQuestionsConfig()` — if `SUPABASE_URL` and a key are blank, it immediately returns `false`.
3. If `false`, the function falls through to the local JSON file.
4. If Supabase is configured but the table does not exist yet, the function catches a `'table_missing'` error, calls `markSupabaseTableMissing()` (which blocks Supabase retries for 30 seconds), and falls through to the local JSON file.
5. Only once Supabase is configured AND the table exists AND a probe query succeeds does the system switch to Supabase.

**This means**: You can configure Supabase credentials, run the migration in Supabase, and the system will seamlessly upgrade from JSON to Supabase on the next request. Your existing `.data-questions.json` data (currently `[]` — empty) will simply remain unused once Supabase takes over.

**One important note**: Data in `.data-questions.json` is NOT automatically copied to Supabase. Since it is currently empty, this is not a concern. If it were not empty, you would need to manually insert those records into Supabase before switching.

### Could Any Planned Change Break the Existing Owner Login or PIN System?

The plan modifies `netlify/functions/api.ts` to remove hardcoded credentials and import the real service layer. This change affects only the Netlify deployment path. The local `server.ts` and its auth service (`ownerAuthService.ts`) are not modified.

The only risk is if someone was relying on the hardcoded credentials in `netlify/functions/api.ts` to log in. Those credentials must be replaced with real secure authentication. That is the purpose of the fix.

The existing `.data-admin-auth.json` file (which has the owner's PIN hash) is preserved as-is.

### Is the Existing `supabase/schema.sql` RLS Compatible With How `supabaseService.ts` Uses the Service-Role Key?

Yes, and here is why:

**What RLS (Row Level Security) is**: RLS is a PostgreSQL feature that lets you define per-row access rules. For example: "anonymous users can only SELECT rows where `status = 'answered'`." Without RLS, any user with any key could read all data.

**What the service-role key is**: The Supabase service-role key (also called the secret key) completely bypasses RLS. It is equivalent to a PostgreSQL superuser for data access purposes. Any query made with the service-role key ignores all RLS policies and can read/write any row.

**What the anon key is**: The Supabase anon key is the public key. Requests using it are subject to RLS policies. It is safe to use in browser code if the RLS policies are correct — but the anon key alone should never grant access to pending questions or admin operations.

**How `supabaseService.ts` uses the keys**:
- `keyMode: 'public'` → uses `serviceRoleKey || anonKey`. Prefers the service-role key. If only the service-role key is configured (no anon key), this still works because the service-role key bypasses RLS anyway.
- `keyMode: 'service'` → uses `serviceRoleKey` only. Throws an error if it is missing.

This design is correct and safe as long as the service-role key is never exposed to the browser. It is only ever used in `server.ts` and the fixed Netlify function — both server-side.

---

## Section 4: File Plan

| File Path | Action | Reason |
|---|---|---|
| `netlify/functions/api.ts` | **MODIFY** ⚠️ AUTH TOUCH | Remove all hardcoded credentials, master tokens, and in-memory stores; import and call the existing service layer; add all missing routes |
| `supabase/migrations/001_verify_schema.sql` | **CREATE** | Safe idempotent SQL to apply the questions table, indexes, and RLS policies to Supabase without destroying data |
| `.env.example` | **MODIFY** | Add `PORT` variable; add a comment explaining `.data-*.json` files are not committed |
| `.gitignore` | **MODIFY** | Add `.data-*.json` to gitignore so local data files are never committed to source control |
| `server.ts` | **LEAVE UNTOUCHED** | Already complete, production-ready, and correctly implemented |
| `server/middleware/rateLimit.ts` | **LEAVE UNTOUCHED** | Complete and correct |
| `server/services/ownerAuthService.ts` | **LEAVE UNTOUCHED** | Complete and correct |
| `server/services/questionService.ts` | **LEAVE UNTOUCHED** | Complete and correct |
| `server/services/supabaseService.ts` | **LEAVE UNTOUCHED** | Complete and correct |
| `server/services/salonOpsService.ts` | **LEAVE UNTOUCHED** | Complete and correct |
| `server/validation/questionSchema.ts` | **LEAVE UNTOUCHED** | Complete and correct |
| `src/App.tsx` | **LEAVE UNTOUCHED** | Already calls `/api/settings` and manages auth in memory correctly |
| `src/components/AskQuestionForm.tsx` | **LEAVE UNTOUCHED** | Already wired to real backend via `questionApi.ts` |
| `src/components/PublicQASection.tsx` | **LEAVE UNTOUCHED** | Already wired to real backend |
| `src/pages/AdminLoginPage.tsx` | **LEAVE UNTOUCHED** | Already calls real backend auth endpoints |
| `src/pages/AdminDashboardPage.tsx` | **LEAVE UNTOUCHED** | Already calls real backend admin endpoints |
| `src/components/admin/OwnerSecuritySettingsPanel.tsx` | **LEAVE UNTOUCHED** | Already wired to real backend |
| `src/components/admin/AdminLogin.tsx` | **LEAVE UNTOUCHED** | Legacy PIN-only component, used by `AdminDashboard` (salon ops mode); functional |
| `src/components/admin/AdminDashboard.tsx` | **LEAVE UNTOUCHED** | Salon CRM view; uses `salonDb` localStorage intentionally |
| `src/services/questionApi.ts` | **LEAVE UNTOUCHED** | Complete and correct |
| `src/services/db.ts` | **LEAVE UNTOUCHED** | localStorage-based salon CRM; not part of Q&A scope |
| `src/validation/questionValidation.ts` | **LEAVE UNTOUCHED** | Complete and correct |
| `supabase/schema.sql` | **LEAVE UNTOUCHED** | Already correct; kept as documentation |
| `supabase-schema.sql` | **LEAVE UNTOUCHED** | Complete extended schema; kept as documentation |
| `vite.config.ts` | **LEAVE UNTOUCHED** | No changes needed |
| `tsconfig.json` | **LEAVE UNTOUCHED** | No changes needed |
| `netlify.toml` | **LEAVE UNTOUCHED** | Redirect rules are correct |
| `package.json` | **LEAVE UNTOUCHED** | All dependencies present |
| `.data-*.json` files | **LEAVE UNTOUCHED** (data) | Active runtime data; only their gitignore status changes |

**Files that touch authentication logic**: `netlify/functions/api.ts` (the fix removes insecure auth and replaces with the real service layer).

**SQL commands that could affect existing data**: None. The migration uses `CREATE TABLE IF NOT EXISTS` and `CREATE POLICY` — if the table or policy already exists, the statement is a no-op.

---

## Section 5: SQL Migration Plan

### File: `supabase/migrations/001_verify_schema.sql`

This file is safe to run against your live Supabase project. It will not drop, delete, or truncate anything.

**Does it DROP anything? NO.**
**Does it DELETE anything? NO.**
**Does it TRUNCATE anything? NO.**

#### What it contains (outline):

```sql
-- Step 1: Enable uuid-ossp extension (safe to run repeatedly)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Plain English: Makes the uuid_generate_v4() function available.
-- PostgreSQL needs this extension to generate UUIDs (unique IDs like 
-- "123e4567-e89b-12d3-a456-426614174000") automatically for new rows.
-- IF NOT EXISTS means it does nothing if already installed.

-- Step 2: Create the questions table (safe to run repeatedly)
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL CHECK (char_length(trim(question)) >= 10 AND char_length(question) <= 500),
    asker_name TEXT CHECK (asker_name IS NULL OR char_length(trim(asker_name)) <= 100),
    answer TEXT CHECK (answer IS NULL OR (char_length(trim(answer)) >= 5 AND char_length(answer) <= 2000)),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    answered_at TIMESTAMPTZ NULL
);
-- Plain English: Creates the table that stores customer questions.
-- Each row is one question. The id column auto-generates a unique ID.
-- The CHECK constraints enforce the same 10–500 character rule as the backend.
-- IF NOT EXISTS means it does nothing if the table already exists.

-- Step 3: Create performance indexes (safe to run repeatedly)
CREATE INDEX IF NOT EXISTS idx_questions_status_answered_at ON public.questions (status, answered_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON public.questions (created_at DESC);
-- Plain English: Indexes are like a book's table of contents.
-- Without them, finding "all answered questions sorted by date" requires scanning 
-- every row in the table. With the index, the database jumps directly to the right rows.
-- This matters once you have hundreds of questions.

-- Step 4: Enable Row Level Security
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
-- Plain English: Turns on the RLS feature for this table.
-- Without this, the anon key would let anyone read all questions including 
-- private pending ones. With RLS enabled, access is controlled by the policies below.

-- Step 5: RLS Policy — public read (answered questions only)
DO $$ BEGIN
  CREATE POLICY "public_read_answered" ON public.questions
  FOR SELECT TO anon
  USING (status = 'answered');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Plain English: "Anyone (including website visitors) can read questions,
-- but only if the status is 'answered'." Pending questions (waiting for 
-- the owner to respond) are invisible to the public.

-- Step 6: RLS Policy — public insert (pending questions only)
DO $$ BEGIN
  CREATE POLICY "public_insert_pending" ON public.questions
  FOR INSERT TO anon
  WITH CHECK (status = 'pending' AND answer IS NULL AND answered_at IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Plain English: "Anyone can submit a new question, but only if:
--   - The status is 'pending' (not pre-marking it as answered)
--   - The answer field is empty (they can't pre-fill an answer)
--   - The answered_at timestamp is empty"
-- This prevents a malicious person from directly inserting fake answered questions.

-- Step 7: Grant table-level permissions to Supabase roles
GRANT SELECT, INSERT ON public.questions TO anon;
GRANT ALL ON public.questions TO service_role;
-- Plain English:
-- "anon" is the role Supabase uses for requests made with the public anon key.
-- Giving it SELECT and INSERT lets it read answered questions and submit new ones.
-- "service_role" is the role used with the service-role key (server-side only).
-- Giving it ALL permissions lets the backend do everything: read all questions,
-- publish answers, delete questions, etc.
-- Note: The service-role key BYPASSES RLS, so the policies above don't restrict it.
-- The policies only restrict the anon role and authenticated Supabase users.
```

---

## Section 6: Netlify Function Fix Plan

### What the Current `netlify/functions/api.ts` Does Wrong

The current Netlify function is a completely separate implementation written at an earlier point in the project. It does not know about the service layer, Supabase, or secure authentication. Its problems:

1. **Data vanishes on cold starts.** All questions and bookings are stored in JavaScript arrays (`memoryQuestions`, `memoryBookings`). Netlify functions are stateless — each invocation may run in a fresh container. Any data not saved to a database is lost when the container is recycled.

2. **Hardcoded backdoor credentials.** The login route accepts usernames like `'admin'`, `'owner'`, passwords like `'1234'`, and permanently accepts the token `'gw_master_session_token_2026'`. Anyone who finds this code can log into your admin dashboard with `admin / 1234`.

3. **No real authentication.** The PIN login route does not exist. The `/api/admin/auth/status` route does not exist. The `AdminLoginPage` calls these on load and will fail or fall into incorrect states.

4. **Missing routes the frontend needs.** `/api/admin/setup`, `/api/admin/login-pin`, `/api/admin/me`, `/api/admin/logout`, security PATCH endpoints, `/api/menu`, `/api/certificates` all return 404.

5. **No validation quality.** Login validation is a simple string comparison. There is no Zod schema, no scrypt comparison, no lockout protection.

### What the Fixed Version Will Do Instead

The fixed `netlify/functions/api.ts` will:

1. **Import the existing service layer**: `questionService`, `ownerAuthService`, `supabaseService`, `rateLimit` middleware, and `questionSchema` Zod validators — the exact same modules that `server.ts` uses.

2. **Route requests** using the same path-matching logic, but adapted from Express middleware to Netlify's event-handler pattern.

3. **Use Supabase for persistent data** when configured. The `questionService` already handles fallback to JSON files automatically. For Netlify, the JSON file fallback is irrelevant (the serverless filesystem is ephemeral), so configuring Supabase is required for Netlify deployments to work at all.

4. **Remove all hardcoded credentials and tokens** completely.

5. **Implement all routes** that the frontend calls, in exact parity with `server.ts`.

### How Session Persistence Works in a Serverless Environment

This is the most important architectural point for Netlify:

**The problem**: `server.ts` stores sessions in a `Map<string, session>` in Node.js memory, persisted to `.data-sessions.json`. This works because the Express server is a long-running process. Netlify functions are not — they are short-lived and may run in different containers.

**The solution (already designed into the codebase)**: `ownerAuthService.ts` works statelessly. The login functions (`verifyOwnerPasswordLogin`, `verifyOwnerPinLogin`) read from `.data-admin-auth.json` on disk. But on Netlify, there is no persistent disk either.

**What this means in practice**: For the Netlify deployment to work correctly, the owner must set `OWNER_USERNAME` and `OWNER_PASSWORD` as Netlify environment variables. The `ownerAuthService` will then verify credentials against those env variables (the `envPassword` path) rather than needing a `.data-admin-auth.json` file.

**Session tokens on Netlify**: The fixed function will generate a session token on login and return it to the frontend (same as `server.ts`). However, since there is no persistent session store in a serverless function, the approach is to verify the session token by re-checking the credentials on each request — or more practically, to issue a **signed, self-verifying token**. 

The practical solution (what the fixed function will implement) is to store the session token in a **Supabase table** called `admin_sessions`, or alternatively, use a simple **HMAC-signed token** that encodes the username and expiry and can be verified without a session store. The HMAC approach requires only one additional env variable (`SESSION_SECRET`). This is stateless — no database lookup needed to verify a session, only a cryptographic check.

**Why sharing the service layer is correct**: It eliminates the possibility of behavior differences between local development and Netlify. The rate limiter, honeypot, Zod validation, Supabase integration, and fallback logic all exist once in one place. The Netlify function becomes a thin routing adapter around that shared logic.

---

## Section 7: Environment Variables

### Public Variables (safe for `VITE_` prefix, used in browser)

None required. The frontend makes all calls to `/api/*` endpoints on the same origin. No Supabase URL or key should be exposed to the browser. The design is correct — the browser never talks to Supabase directly.

### Private Server-Side Only (must NEVER be `VITE_` prefixed)

These are secret values. If you prefix any of these with `VITE_`, Vite will embed them in the browser JavaScript bundle where anyone can find them in DevTools.

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Supabase public key — safe to use server-side; subject to RLS if used directly |
| `SUPABASE_SERVICE_ROLE_KEY` | **Most sensitive.** Bypasses all RLS. Used for admin operations. Never expose to browser. |
| `OWNER_USERNAME` | Fallback owner username when no `.data-admin-auth.json` exists |
| `OWNER_PASSWORD` | Fallback owner password (plaintext in env — used only as bootstrap before `setup` is run) |
| `OWNER_EMAIL` | Email for Resend notification recipient |
| `RESEND_API_KEY` | Resend email service API key for question notifications |
| `APP_URL` | Full site URL for email links (e.g. `https://goldenwizardsalon.com`) |
| `SESSION_SECRET` | **(New — for Netlify only)** 32+ byte random secret for HMAC-signed session tokens |
| `PORT` | **(Optional)** Defaults to 3000 for local server |

### Which Are Already in `.env.example`

Already present: `GEMINI_API_KEY`, `APP_URL`, `OWNER_USERNAME`, `OWNER_PASSWORD`, `OWNER_EMAIL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`.

**Missing from `.env.example`**: `SESSION_SECRET`, `PORT`.

---

## Section 8: Security Audit

### Critical Issues (must fix)

**1. `netlify/functions/api.ts` — Hardcoded backdoor password** ⚠️ CRITICAL

```typescript
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'goldenwizard_secure_pass_2026';
```
If `OWNER_PASSWORD` is not set in Netlify's environment, the password defaults to this string, which is now in the git history.

**2. `netlify/functions/api.ts` — Hardcoded permanent master session token** ⚠️ CRITICAL

```typescript
activeSessions.set('gw_master_session_token_2026', {
  username: OWNER_USERNAME,
  expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
});
```
And in `isAuthorized()`:
```typescript
if (token === 'gw_master_session_token_2026' || token === 'goldenwizard_secure_session_token') {
  return true;
}
```
Any HTTP request with `Authorization: Bearer gw_master_session_token_2026` gains full admin access on the Netlify deployment.

**3. `netlify/functions/api.ts` — Login accepts trivial credentials** ⚠️ CRITICAL

The login handler accepts: username `'admin'`/`'owner'`/`'kotagiri'`, password `'1234'`/`'admin'`/`'admin123'`.

### Existing Mitigations (already correct in `server.ts`)

- `server.ts` correctly has `LEGACY_MASTER_TOKENS` to detect and purge these old tokens from `.data-sessions.json` on startup. This protects the Express server.
- Sessions in `server.ts` are 32-byte cryptographically random hex tokens. No predictable pattern.
- Login lockout: 5 failed attempts → 15-minute lockout (implemented in `ownerAuthService.ts`).
- Auth rate limit: 15 auth requests per 15 minutes per IP (implemented in `server.ts`).
- Question rate limit: 5 questions per hour per IP (implemented in `rateLimit.ts`).
- Honeypot field checked server-side (implemented in `rateLimit.ts`).
- Supabase service-role key only used server-side.
- Admin session token stored in memory only (explicitly cleared from localStorage on `App.tsx` load).
- `.env*` is in `.gitignore` (secrets never committed).

### Medium Issues

**4. `.data-*.json` files are not in `.gitignore`**

The `.gitignore` excludes `.env*` but not `.data-*.json`. These files contain the owner's PIN hash (`.data-admin-auth.json`), active session tokens (`.data-sessions.json`), and customer data (`.data-salon-ops.json`). If this repository is pushed to GitHub, those files will be public. Add `.data-*.json` to `.gitignore`.

**5. The `src/services/db.ts` localStorage service stores customer PII in the browser**

Customer names, mobile numbers, and service history are stored in `localStorage`, which persists across browser sessions and is accessible to any JavaScript running on the same origin (including browser extensions). This is an architectural limitation of the localStorage-based CRM. It is out of scope for the current task but worth noting.

---

## Section 9: Testing Plan

After implementation, run the following manual tests in order. Use your browser's Network tab (F12 → Network) to observe API calls and responses.

### Test 1: Question Submission (AskQuestionForm → Backend → Supabase)

1. Open the public website homepage.
2. Scroll to the "Ask Our Stylists" section.
3. Leave the name blank (it is optional).
4. Type a question fewer than 10 characters. Click Submit. **Expected**: error message "must be at least 10 characters".
5. Type a valid question (e.g. "What is the best treatment for frizzy hair in Hyderabad humidity?").
6. Do NOT tick the "I'm human" checkbox. Click Submit. **Expected**: error message about the verification checkbox.
7. Tick the "I'm human" checkbox. Click Submit. **Expected**: green success message. The form resets.
8. Check Network tab. You should see `POST /api/questions` returning HTTP 201 with `{ success: true }`.
9. If Supabase is configured: open your Supabase dashboard → Table Editor → questions table. The new row should appear with `status = 'pending'`.

### Test 2: Admin Login (PIN and Username+Password)

**First-time setup (if no password has been claimed yet):**
1. Navigate to `/admin/login`.
2. The page should show "First-Run Owner Portal Setup" with username and password fields.
3. Enter a username (e.g. `goldenwizard_admin`) and a strong password (8+ chars).
4. Click "Create Owner Account & Sign In". **Expected**: logged into the dashboard.
5. Check `.data-admin-auth.json` — it should now contain `username`, `passwordSalt`, `passwordHash` fields.

**PIN login (after a PIN is configured in Settings):**
1. Log in with username+password.
2. Go to Settings → Owner Security → Section C "Set up Owner PIN".
3. Enter your current password, a new 6+ digit PIN, and confirm it. Save.
4. Log out.
5. On the login page, switch to "Owner PIN" tab.
6. Enter your PIN. **Expected**: logged in successfully.

### Test 3: Admin Question Management

1. Log into the admin dashboard.
2. Click "Pending Questions" in the sidebar.
3. Find the question from Test 1. It should appear here.
4. Type an answer (at least 5 characters) in the answer text area.
5. Click "Publish Answer". **Expected**: success toast. Question moves to "Published Answers" tab.
6. Navigate to "Published Answers". The question should appear there with its answer.
7. Click "Edit Answer". Modify the answer text. Save. **Expected**: answer updated.
8. Click "Unpublish". **Expected**: question returns to Pending.
9. Click "Delete". Confirm deletion. **Expected**: question removed from both tabs.

### Test 4: Public Q&A Visibility

1. Submit a question via the public form (Test 1).
2. Log into admin and publish an answer for it.
3. Log out and return to the public homepage.
4. Scroll to the FAQ section. **Expected**: the answered question appears with the gold "A" accordion.
5. Try searching for a word from the question. **Expected**: the question filters correctly.
6. Submit another question but do NOT publish an answer for it in admin.
7. Return to public site FAQ. **Expected**: the unanswered question does NOT appear in the public list.

### Test 5: Rate Limiting

1. Submit 5 questions from the public form (you can use the browser directly or a tool like curl).
2. Try to submit a 6th question. **Expected**: HTTP 429 response with error message "Rate limit exceeded: You can only submit up to 5 questions per hour."
3. Wait 1 hour (or test by temporarily changing `MAX_QUESTIONS_PER_HOUR` to 1 in `rateLimit.ts` during testing).

### Test 6: RLS Enforcement (Supabase configured only)

1. Find your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
2. Submit a question via the form so there is a pending question in Supabase.
3. Run this curl command (replacing the values):
   ```
   curl "https://YOUR_PROJECT.supabase.co/rest/v1/questions?select=*" \
     -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```
4. **Expected result**: Only answered questions are returned. Pending questions do NOT appear. If there are no answered questions, the response is `[]`.
5. Now try without any key:
   ```
   curl "https://YOUR_PROJECT.supabase.co/rest/v1/questions?select=*"
   ```
   **Expected**: 401 Unauthorized error.

### Test 7: Build Verification

Run from the project root:
```
npm run build
```
**Expected**: The command completes without errors. A `dist/` folder is created containing `index.html` and the built JavaScript/CSS assets.

Also run the TypeScript check:
```
npm run lint
```
**Expected**: No type errors reported.

### Test 8: Failure Handling (Supabase Unconfigured Fallback)

1. Remove or empty out `SUPABASE_URL` in your `.env` file (or simply leave it blank).
2. Restart the server: `npm run dev`.
3. Submit a question via the public form.
4. **Expected**: The form shows a success message. The question appears in `.data-questions.json` (check the file — it should have the new record).
5. Log into the admin dashboard. The question should appear in "Pending Questions".
6. Publish an answer. The question should appear in the public FAQ section.
7. This confirms the entire Q&A workflow works without Supabase, using local JSON file storage as a fallback.

---

## Summary of Changes Required

Only **three files** need to be changed, plus one new file created:

1. **MODIFY** `netlify/functions/api.ts` — Replace the entire file with a clean implementation that imports the real service layer, removes all hardcoded credentials, and implements all routes in parity with `server.ts`.

2. **CREATE** `supabase/migrations/001_verify_schema.sql` — Safe, idempotent SQL to apply to your Supabase project once you have the credentials.

3. **MODIFY** `.gitignore` — Add `.data-*.json` to protect local runtime data from being committed.

4. **MODIFY** `.env.example` — Add `SESSION_SECRET` and `PORT` variable documentation.

---

Awaiting user approval. Reply with PLAN APPROVED to proceed with implementation, or reply with your changes.
