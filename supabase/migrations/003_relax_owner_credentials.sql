-- ==============================================================================
-- GOLDEN WIZARD — Migration 003: Relax owner_credentials constraints
--
-- The original table required username/password_salt/password_hash as NOT NULL.
-- Since we now use PIN-only auth, these columns are not needed and their
-- NOT NULL constraint prevents the row from being created with just a PIN.
--
-- SAFE: only alters column constraints, no data is deleted.
-- Apply in: Supabase Dashboard → SQL Editor → Run.
-- ==============================================================================

ALTER TABLE public.owner_credentials
  ALTER COLUMN username      DROP NOT NULL,
  ALTER COLUMN password_salt DROP NOT NULL,
  ALTER COLUMN password_hash DROP NOT NULL;

-- Set defaults so existing rows with empty values are still valid
ALTER TABLE public.owner_credentials
  ALTER COLUMN username      SET DEFAULT '',
  ALTER COLUMN password_salt SET DEFAULT '',
  ALTER COLUMN password_hash SET DEFAULT '';
