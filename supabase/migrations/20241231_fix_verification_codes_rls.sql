-- Migration: Fix verification_codes RLS policy
-- Description: Remove overly permissive RLS policy for verification_codes
-- This table should only be accessible via service_role key (admin operations)

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage verification codes" ON verification_codes;

-- Create a more restrictive policy
-- Note: Service role bypasses RLS by default, so we don't need a permissive policy
-- This policy ensures no regular users can access verification codes
CREATE POLICY "No direct access to verification codes" ON verification_codes
  FOR ALL USING (false);

-- Fix SECURITY DEFINER functions by setting search_path
-- This prevents potential security issues with schema manipulation

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add automatic cleanup of expired verification codes
-- This runs every hour via pg_cron (if available) or can be called manually

-- Create index for faster cleanup queries
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

-- Update cleanup function with search_path
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_codes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
