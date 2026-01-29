-- Migration: Fix max_employees constraint
-- Date: 2026-01-29
-- Description: Ensure max_employees is never 0 - must be NULL (unlimited) or >= 1

-- Update existing records where max_employees = 0 to NULL (unlimited)
UPDATE shift_templates
SET max_employees = NULL
WHERE max_employees = 0;

-- Add check constraint to prevent max_employees = 0
ALTER TABLE shift_templates
ADD CONSTRAINT check_max_employees_not_zero
CHECK (max_employees IS NULL OR max_employees >= 1);

-- Add comment to document the constraint
COMMENT ON COLUMN shift_templates.max_employees IS 'Maximum number of employees for this shift template. NULL means unlimited, must be >= 1 if set.';
