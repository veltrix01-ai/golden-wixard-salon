-- ==============================================================================
-- GOLDEN WIZARD PROFESSIONAL SALON
-- Migration 002: Owner Credentials Table
--
-- Stores the salon owner's hashed credentials in Supabase so they persist
-- across Vercel serverless cold starts and deployments.
--
-- SAFE TO RUN ON AN EXISTING DATABASE.
-- Uses IF NOT EXISTS — no DROP, no DELETE, no TRUNCATE.
--
-- Apply in: Supabase Dashboard → SQL Editor → paste and Run.
-- ==============================================================================

-- The owner_credentials table holds exactly ONE row (the salon owner).
-- Credentials are scrypt-hashed server-side before storing — plaintext
-- passwords are never written here.
CREATE TABLE IF NOT EXISTS public.owner_credentials (
    id            INTEGER     PRIMARY KEY DEFAULT 1
                              CHECK (id = 1),  -- enforces single-row constraint
    username      TEXT        NOT NULL,
    password_salt TEXT        NOT NULL,
    password_hash TEXT        NOT NULL,
    pin_salt      TEXT,
    pin_hash      TEXT,
    pin_enabled   BOOLEAN     NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup (always a single row, but good practice)
CREATE INDEX IF NOT EXISTS idx_owner_credentials_id ON public.owner_credentials (id);

-- Enable Row Level Security
ALTER TABLE public.owner_credentials ENABLE ROW LEVEL SECURITY;

-- NO public access at all — this table is only accessible via the service-role key
-- (used server-side in api/index.ts). The anon key cannot read or write this table.
-- Do not add any policy for anon or authenticated roles.

-- Grant full access to service_role only (service_role bypasses RLS anyway,
-- but this makes the intent explicit)
GRANT ALL ON public.owner_credentials TO service_role;

-- Revoke all access from anon and authenticated roles explicitly
REVOKE ALL ON public.owner_credentials FROM anon;
REVOKE ALL ON public.owner_credentials FROM authenticated;

-- ==============================================================================
-- Migration complete.
-- After running this migration, the owner can change their username/password
-- directly from the Owner Dashboard. Changes are saved to this table and
-- persist across Vercel deployments without needing to update environment
-- variables.
-- ==============================================================================
