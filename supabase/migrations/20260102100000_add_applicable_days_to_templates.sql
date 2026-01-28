-- Migration: Add applicable_days to shift_templates
-- Allows specifying which days of week a template can be used
-- NULL or empty array means template is available all days

-- First create the enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE day_of_week AS ENUM ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE shift_templates 
ADD COLUMN IF NOT EXISTS applicable_days day_of_week[] DEFAULT NULL;

COMMENT ON COLUMN shift_templates.applicable_days IS 'Days of week when template can be used. NULL means all days.';
