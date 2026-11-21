-- ==============================================================================
-- GOLDEN WIZARD PROFESSIONAL SALON & Q&A SYSTEM
-- SUPABASE POSTGRESQL SCHEMA WITH ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Questions Table
-- Statuses: 'pending' (initial submission), 'answered' (published to public)
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL CHECK (char_length(trim(question)) >= 10 AND char_length(question) <= 500),
    asker_name TEXT CHECK (asker_name IS NULL OR char_length(trim(asker_name)) <= 100),
    answer TEXT CHECK (answer IS NULL OR char_length(trim(answer)) > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    answered_at TIMESTAMPTZ NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_status_answered_at ON public.questions (status, answered_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON public.questions (created_at DESC);

-- 3. Create Protected Owner Table
-- References the authenticated Supabase user ID.
-- Only user IDs existing in this table have administrative access.
CREATE TABLE IF NOT EXISTS public.owner (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_owner_user_id UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_owner_user_id ON public.owner (user_id);

-- 4. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner ENABLE ROW LEVEL SECURITY;

-- 5. Helper function to check if current authenticated session is an owner
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.owner
    WHERE user_id = auth.uid()
  );
$$;

-- 6. Row Level Security Policies for `questions` Table

-- Policy A: Public users can read ONLY answered questions
CREATE POLICY "Public can view answered questions only"
ON public.questions
FOR SELECT
TO public, anon, authenticated
USING (
    status = 'answered' OR public.is_owner()
);

-- Policy B: Anyone (public/anon) can submit a question, but:
-- - status MUST be 'pending'
-- - answer MUST be NULL
-- - answered_at MUST be NULL
CREATE POLICY "Public can insert pending questions"
ON public.questions
FOR INSERT
TO public, anon, authenticated
WITH CHECK (
    status = 'pending'
    AND answer IS NULL
    AND answered_at IS NULL
);

-- Policy C: Only the authenticated owner can update questions (publish/edit/unpublish)
CREATE POLICY "Owner can update questions"
ON public.questions
FOR UPDATE
TO authenticated
USING (public.is_owner())
WITH CHECK (public.is_owner());

-- Policy D: Only the authenticated owner can delete questions
CREATE POLICY "Owner can delete questions"
ON public.questions
FOR DELETE
TO authenticated
USING (public.is_owner());

-- 7. Row Level Security Policies for `owner` Table
-- Prevent unauthorized users from viewing or modifying owner records

CREATE POLICY "Owner can read own record"
ON public.owner
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Nobody can modify owner records through public client"
ON public.owner
FOR ALL
TO public, anon
USING (false);

-- 8. Table Grants
GRANT SELECT, INSERT ON public.questions TO anon, authenticated;
GRANT UPDATE, DELETE ON public.questions TO authenticated;
GRANT SELECT ON public.owner TO authenticated;
