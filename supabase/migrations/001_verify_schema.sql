-- ==============================================================================
-- GOLDEN WIZARD PROFESSIONAL SALON
-- Migration 001: Verify / Create Questions Schema
--
-- SAFE TO RUN ON AN EXISTING DATABASE.
-- This script uses IF NOT EXISTS and exception-safe policy creation throughout.
-- It will NOT DROP, DELETE, or TRUNCATE anything.
--
-- Apply this in: Supabase Dashboard → SQL Editor → paste and Run.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Step 1: Enable uuid-ossp extension
-- Makes uuid_generate_v4() available for auto-generating unique row IDs.
-- IF NOT EXISTS means this is a no-op if the extension is already installed.
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- Step 2: Create the questions table
--
-- Stores customer-submitted questions and the owner's published answers.
-- Status values:
--   'pending'  → submitted by customer, awaiting owner review (not public)
--   'answered' → owner has published an answer (visible on the public website)
--
-- IF NOT EXISTS means this is a no-op if the table already exists.
-- The CHECK constraints enforce the same 10–500 character rule as the backend
-- Zod schema (server/validation/questionSchema.ts), preventing invalid data
-- even if someone bypasses the API and writes to Supabase directly.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.questions (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    question    TEXT        NOT NULL
                            CHECK (char_length(trim(question)) >= 10
                                   AND char_length(question) <= 500),
    asker_name  TEXT        CHECK (asker_name IS NULL
                                   OR char_length(trim(asker_name)) <= 100),
    answer      TEXT        CHECK (answer IS NULL
                                   OR (char_length(trim(answer)) >= 5
                                       AND char_length(answer) <= 2000)),
    status      TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'answered')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    answered_at TIMESTAMPTZ NULL
);

-- ------------------------------------------------------------------------------
-- Step 3: Create performance indexes
--
-- idx_questions_status_answered_at:
--   Speeds up the public FAQ query "give me all answered questions sorted by
--   answered_at descending." Without this index, the database scans every row.
--
-- idx_questions_created_at:
--   Speeds up the admin dashboard query "give me all questions sorted by
--   created_at descending."
--
-- IF NOT EXISTS means these are no-ops if the indexes already exist.
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_questions_status_answered_at
    ON public.questions (status, answered_at DESC);

CREATE INDEX IF NOT EXISTS idx_questions_created_at
    ON public.questions (created_at DESC);

-- ------------------------------------------------------------------------------
-- Step 4: Enable Row Level Security (RLS)
--
-- RLS controls which rows each database user (role) can read or write.
-- Without RLS, any request using the public anon key could read ALL questions,
-- including pending ones that the owner has not reviewed yet.
-- With RLS enabled, only the policies defined below determine access.
--
-- Note: The service-role key (used by the backend server) BYPASSES RLS entirely.
-- RLS policies only restrict the anon key and authenticated Supabase users.
-- Enabling already-enabled RLS is a no-op.
-- ------------------------------------------------------------------------------
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Step 5: RLS Policy — public read (answered questions only)
--
-- Allows anonymous website visitors (using the anon key) to SELECT rows,
-- but ONLY rows where status = 'answered'. Pending questions are invisible
-- to the public even if someone queries the Supabase REST API directly.
--
-- The DO $$ ... EXCEPTION WHEN duplicate_object THEN NULL END $$ wrapper
-- makes this a no-op if the policy already exists (idempotent).
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    CREATE POLICY "public_read_answered_questions"
    ON public.questions
    FOR SELECT
    TO anon
    USING (status = 'answered');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- Step 6: RLS Policy — public insert (pending questions only)
--
-- Allows anonymous website visitors to INSERT new questions, but enforces:
--   - status must be 'pending'  (cannot pre-mark a submission as answered)
--   - answer must be NULL       (cannot pre-fill an answer)
--   - answered_at must be NULL  (cannot pre-fill the answered timestamp)
-- This prevents a malicious person from inserting fake published answers
-- by posting directly to the Supabase REST endpoint.
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    CREATE POLICY "public_insert_pending_questions"
    ON public.questions
    FOR INSERT
    TO anon
    WITH CHECK (
        status = 'pending'
        AND answer IS NULL
        AND answered_at IS NULL
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- Step 7: Grant table-level permissions to Supabase roles
--
-- anon role:
--   Used by requests made with the public anon key.
--   SELECT + INSERT lets it read answered questions and submit new pending ones.
--   The RLS policies above further restrict what rows it can actually see/write.
--
-- service_role:
--   Used by the backend server (never exposed to the browser).
--   ALL permissions because the server needs to read all questions, publish
--   answers (UPDATE), and delete questions (DELETE).
--   The service_role key already bypasses RLS, so these grants are supplementary.
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT ON public.questions TO anon;
GRANT ALL ON public.questions TO service_role;

-- ==============================================================================
-- Migration complete.
-- After running this, set your Supabase credentials in .env (or Netlify
-- environment variables) and restart the server:
--   SUPABASE_URL=https://your-project.supabase.co
--   SUPABASE_ANON_KEY=your-anon-key
--   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
-- The server will automatically detect the configured table and switch from
-- local .data-questions.json storage to Supabase on the next request.
-- ==============================================================================
