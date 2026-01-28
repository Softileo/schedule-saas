-- Migration: Add type column to verification_codes table
-- Description: Add type column to distinguish between different verification code types (email_verification, password_reset)
-- Date: 2026-01-09

-- Add type column to verification_codes table
ALTER TABLE verification_codes 
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'email_verification';

-- Create index for faster lookups by type and email
CREATE INDEX IF NOT EXISTS idx_verification_codes_type_email 
ON verification_codes(type, email);

-- Update the cleanup function to handle all types
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM verification_codes WHERE expires_at < NOW();
END;
$$;

COMMENT ON COLUMN verification_codes.type IS 'Type of verification code: email_verification or password_reset';
