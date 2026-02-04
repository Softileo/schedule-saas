-- =============================================================================
-- Migration: Add is_supervisor field to employees table
-- Date: 2026-02-04
-- Description: Adds supervisor/manager flag for employees who must always
--              be present on shifts (e.g., store managers, shift supervisors)
-- =============================================================================

-- Add is_supervisor column to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS is_supervisor BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN employees.is_supervisor IS 
'Indicates if the employee is a supervisor/manager who must be present on each shift. When enabled, the scheduler ensures at least one supervisor is assigned to every shift.';

-- Create index for quick filtering of supervisors
CREATE INDEX IF NOT EXISTS idx_employees_is_supervisor 
ON employees(organization_id, is_supervisor) 
WHERE is_supervisor = true;
