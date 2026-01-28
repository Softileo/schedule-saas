-- ============================================
-- Migration: Add new employment types and max_employees
-- Date: 2026-01-06
-- ============================================

-- 1. Add new employment types to the enum
-- PostgreSQL doesn't allow easy modification of enums, so we recreate it

-- First, add new values to existing enum (safest approach)
ALTER TYPE employment_type ADD VALUE IF NOT EXISTS 'three_quarter';
ALTER TYPE employment_type ADD VALUE IF NOT EXISTS 'one_third';

-- 2. Add max_employees column to shift_templates
ALTER TABLE shift_templates 
ADD COLUMN IF NOT EXISTS max_employees INTEGER DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN shift_templates.max_employees IS 'Maximum number of employees for this shift. NULL means unlimited.';
COMMENT ON COLUMN employees.employment_type IS 'Employment type: full (8h), three_quarter (6h), half (4h), one_third (2.67h), custom';
