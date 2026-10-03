-- =========================================================
-- NubHub Production Supabase PostgreSQL Schema
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- =========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Businesses Table
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  socials JSONB DEFAULT '{"instagram": "", "whatsapp": "", "facebook": "", "website": ""}'::jsonb,
  is_open BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Multi-Criteria Service Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  overall_rating NUMERIC(2,1) NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  service_ratings JSONB NOT NULL, -- e.g. {"food_quality": 5, "speed": 4, "cleanliness": 5, "value": 4}
  service_type TEXT NOT NULL, -- e.g. "Dine-in", "Takeaway", "On-site Service"
  comment TEXT NOT NULL,
  submitter_ip INET,
  is_flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  owner_reply TEXT,
  owner_replied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Security, Audit Logs & Access Control
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_phone TEXT,
  event_type TEXT NOT NULL, -- 'OTP_SENT', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'FLAG_REVIEW'
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.security_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL, -- 'BLOCKED_IP', 'BLOCKED_PHONE', 'SHADOWBANNED'
  target_value TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Sessions Table
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  role TEXT DEFAULT 'merchant',
  ip_address INET,
  user_agent TEXT,
  is_revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. OTP Requests Table
CREATE TABLE IF NOT EXISTS public.otp_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  ip_address INET NOT NULL,
  expires_at BIGINT NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at BIGINT NOT NULL
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_businesses_category ON public.businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_phone ON public.businesses(owner_phone);
CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON public.reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- Enable Supabase Realtime for instant synchronization across connected clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.businesses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;

-- Row Level Security (RLS)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_requests ENABLE ROW LEVEL SECURITY;

-- Permissive public discovery read policies
CREATE POLICY "Public Read Businesses" ON public.businesses FOR SELECT USING (true);
CREATE POLICY "Public Read Reviews" ON public.reviews FOR SELECT USING (is_flagged IS NOT TRUE OR is_flagged = false);
CREATE POLICY "Public Submit Reviews" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Insert Businesses" ON public.businesses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Businesses" ON public.businesses FOR UPDATE USING (true);
CREATE POLICY "Public Update Reviews" ON public.reviews FOR UPDATE USING (true);
CREATE POLICY "Public Audit Logs" ON public.audit_logs FOR ALL USING (true);
CREATE POLICY "Public Security Rules" ON public.security_rules FOR ALL USING (true);
CREATE POLICY "Public Sessions" ON public.sessions FOR ALL USING (true);
CREATE POLICY "Public OTP" ON public.otp_requests FOR ALL USING (true);
