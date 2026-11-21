-- ============================================================================
-- GOLDEN WIZARD PROFESSIONAL SALON — PRODUCTION SUPABASE POSTGRESQL SCHEMA
-- Database: PostgreSQL 14+ / Supabase
-- Features:
-- - Questions & Answers table with strict RLS (Anonymous public read-only for answered,
--   anonymous write with status=pending, owner full management)
-- - Appointment Bookings table with owner management
-- - Website Settings table
-- - Owner authorization profile checks
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE question_status AS ENUM ('pending', 'answered');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. CUSTOMER QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL CHECK (char_length(trim(question)) >= 10 AND char_length(question) <= 500),
    asker_name TEXT CHECK (char_length(asker_name) <= 100),
    answer TEXT CHECK (answer IS NULL OR (char_length(trim(answer)) >= 5 AND char_length(answer) <= 2000)),
    status question_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    answered_at TIMESTAMPTZ
);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_answered_at ON public.questions(answered_at DESC) WHERE status = 'answered';
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON public.questions(created_at DESC);

-- 4. APPOINTMENT BOOKING ENQUIRIES TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name TEXT NOT NULL CHECK (char_length(trim(customer_name)) >= 2 AND char_length(customer_name) <= 100),
    customer_phone TEXT NOT NULL CHECK (char_length(trim(customer_phone)) >= 10 AND char_length(customer_phone) <= 20),
    service_name TEXT NOT NULL CHECK (char_length(service_name) >= 2),
    preferred_date DATE NOT NULL,
    preferred_time TEXT NOT NULL,
    notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),
    status booking_status NOT NULL DEFAULT 'pending',
    assigned_staff TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(preferred_date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at DESC);

-- 5. WEBSITE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed initial default settings if empty
INSERT INTO public.settings (key, value)
VALUES (
    'general',
    jsonb_build_object(
        'announcement', '✨ Welcome to Golden Wizard Professional Salon. Experience world-class hair & beauty care in Gandi Maisamma.',
        'showAnnouncement', true,
        'brandColor', '#C6A15B'
    )
)
ON CONFLICT (key) DO NOTHING;

-- 6. SALON OWNERS AUTHORIZATION TABLE
CREATE TABLE IF NOT EXISTS public.owners (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Helper function to check if current user is an authorized owner
CREATE OR REPLACE FUNCTION public.is_salon_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.owners
    WHERE id = auth.uid()
  );
$$;

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- QUESTIONS TABLE POLICIES
-- ----------------------------------------------------------------------------
-- Anonymous visitors can READ ONLY answered questions
CREATE POLICY "Public visitors can read published answered questions"
ON public.questions
FOR SELECT
TO public
USING (status = 'answered');

-- Anonymous visitors can INSERT questions with status 'pending' and NULL answer
CREATE POLICY "Public visitors can submit new questions as pending"
ON public.questions
FOR INSERT
TO public
WITH CHECK (
    status = 'pending' AND
    answer IS NULL AND
    answered_at IS NULL
);

-- Authorized salon owner can read all questions (pending and answered)
CREATE POLICY "Owner can read all questions"
ON public.questions
FOR SELECT
TO authenticated
USING (public.is_salon_owner());

-- Authorized salon owner can update questions (write answer, publish, unpublish)
CREATE POLICY "Owner can update questions and publish answers"
ON public.questions
FOR UPDATE
TO authenticated
USING (public.is_salon_owner())
WITH CHECK (public.is_salon_owner());

-- Authorized salon owner can delete questions
CREATE POLICY "Owner can delete questions"
ON public.questions
FOR DELETE
TO authenticated
USING (public.is_salon_owner());

-- ----------------------------------------------------------------------------
-- BOOKINGS TABLE POLICIES
-- ----------------------------------------------------------------------------
-- Public visitors can submit appointment bookings (status must be 'pending')
CREATE POLICY "Public visitors can submit appointment requests"
ON public.bookings
FOR INSERT
TO public
WITH CHECK (status = 'pending');

-- Only authorized salon owner can view all bookings
CREATE POLICY "Owner can view all appointment bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (public.is_salon_owner());

-- Only authorized salon owner can update booking status
CREATE POLICY "Owner can update appointment bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (public.is_salon_owner())
WITH CHECK (public.is_salon_owner());

-- Only authorized salon owner can delete bookings
CREATE POLICY "Owner can delete appointment bookings"
ON public.bookings
FOR DELETE
TO authenticated
USING (public.is_salon_owner());

-- ----------------------------------------------------------------------------
-- SETTINGS TABLE POLICIES
-- ----------------------------------------------------------------------------
-- Public visitors can read settings
CREATE POLICY "Public visitors can read general settings"
ON public.settings
FOR SELECT
TO public
USING (true);

-- Only authorized salon owner can modify settings
CREATE POLICY "Owner can update settings"
ON public.settings
FOR ALL
TO authenticated
USING (public.is_salon_owner())
WITH CHECK (public.is_salon_owner());

-- ============================================================================
-- 8. MENU CATEGORIES, SERVICES, VERSION HISTORY & CERTIFICATES TABLES
-- ============================================================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- A. MENU CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK (char_length(trim(name)) >= 1 AND char_length(name) <= 120),
    category_group TEXT NOT NULL DEFAULT 'skin' CHECK (category_group IN ('hair', 'skin', 'nails-bridal')),
    description TEXT,
    image_url TEXT NOT NULL,
    pdf_page INTEGER,
    display_order INTEGER NOT NULL DEFAULT 0,
    visible BOOLEAN NOT NULL DEFAULT true,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_menu_categories_order ON public.menu_categories(display_order ASC);
CREATE INDEX IF NOT EXISTS idx_menu_categories_pub ON public.menu_categories(is_published, visible);

DROP TRIGGER IF EXISTS trg_menu_categories_updated ON public.menu_categories;
CREATE TRIGGER trg_menu_categories_updated
BEFORE UPDATE ON public.menu_categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- B. MENU SERVICES TABLE
CREATE TABLE IF NOT EXISTS public.menu_services (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(trim(name)) >= 1 AND char_length(name) <= 140),
    price NUMERIC(10, 2) CHECK (price IS NULL OR price >= 0),
    note TEXT,
    pdf_page INTEGER,
    display_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_menu_services_category ON public.menu_services(category_id, display_order ASC);
CREATE INDEX IF NOT EXISTS idx_menu_services_pub ON public.menu_services(is_published, active);

DROP TRIGGER IF EXISTS trg_menu_services_updated ON public.menu_services;
CREATE TRIGGER trg_menu_services_updated
BEFORE UPDATE ON public.menu_services
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- C. MENU VERSIONS SNAPSHOT HISTORY (Draft vs Published & Restore Support)
CREATE TABLE IF NOT EXISTS public.menu_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    change_summary TEXT,
    pdf_url TEXT,
    pdf_filename TEXT,
    snapshot_json JSONB NOT NULL,
    published_by TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_menu_versions_status ON public.menu_versions(status, version_number DESC);

-- D. CERTIFICATES TABLE (Extracted real credentials + owner uploads)
CREATE TABLE IF NOT EXISTS public.certificates (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL CHECK (char_length(trim(title)) >= 2 AND char_length(title) <= 200),
    recipient TEXT,
    issuing_organization TEXT NOT NULL,
    centre TEXT,
    issue_date TEXT,
    certificate_ref TEXT,
    category TEXT NOT NULL DEFAULT 'Accreditation',
    description TEXT,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'image' CHECK (file_type IN ('image', 'pdf')),
    display_order INTEGER NOT NULL DEFAULT 0,
    published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_certificates_pub_order ON public.certificates(published, display_order ASC);

DROP TRIGGER IF EXISTS trg_certificates_updated ON public.certificates;
CREATE TRIGGER trg_certificates_updated
BEFORE UPDATE ON public.certificates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS on Menu & Certificate tables
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- MENU CATEGORIES POLICIES
CREATE POLICY "Public visitors can view published visible menu categories"
ON public.menu_categories FOR SELECT TO public
USING (is_published = true AND visible = true);

CREATE POLICY "Owner can manage all menu categories"
ON public.menu_categories FOR ALL TO authenticated
USING (public.is_salon_owner())
WITH CHECK (public.is_salon_owner());

-- MENU SERVICES POLICIES
CREATE POLICY "Public visitors can view published active menu services"
ON public.menu_services FOR SELECT TO public
USING (is_published = true AND active = true);

CREATE POLICY "Owner can manage all menu services"
ON public.menu_services FOR ALL TO authenticated
USING (public.is_salon_owner())
WITH CHECK (public.is_salon_owner());

-- MENU VERSIONS POLICIES (Public can only read currently published version metadata; drafts stay private!)
CREATE POLICY "Public visitors can read published menu versions only"
ON public.menu_versions FOR SELECT TO public
USING (status = 'published');

CREATE POLICY "Owner can manage all menu versions including drafts"
ON public.menu_versions FOR ALL TO authenticated
USING (public.is_salon_owner())
WITH CHECK (public.is_salon_owner());

-- CERTIFICATES POLICIES (Public can read published only)
CREATE POLICY "Public visitors can read published certificates only"
ON public.certificates FOR SELECT TO public
USING (published = true);

CREATE POLICY "Owner can manage all certificates"
ON public.certificates FOR ALL TO authenticated
USING (public.is_salon_owner())
WITH CHECK (public.is_salon_owner());

-- ============================================================================
-- 9. SUPABASE STORAGE BUCKET & RLS POLICIES FOR MENU PDFS & CERTIFICATES
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'salon-documents',
    'salon-documents',
    true,
    15728640, -- 15 MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access for published documents in salon-documents bucket (excluding private drafts folder)
CREATE POLICY "Public can view non-draft salon documents"
ON storage.objects FOR SELECT TO public
USING (
    bucket_id = 'salon-documents'
    AND (storage.foldername(name))[1] <> 'drafts'
);

-- Only authenticated salon owner can upload/update/delete documents in salon-documents
CREATE POLICY "Owner can upload salon documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'salon-documents'
    AND public.is_salon_owner()
);

CREATE POLICY "Owner can update salon documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'salon-documents' AND public.is_salon_owner())
WITH CHECK (bucket_id = 'salon-documents' AND public.is_salon_owner());

CREATE POLICY "Owner can delete salon documents"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'salon-documents'
    AND public.is_salon_owner()
);

