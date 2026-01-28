-- Add onboarding_completed field to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Update existing users with organizations as completed
UPDATE profiles p
SET onboarding_completed = TRUE
WHERE EXISTS (
    SELECT 1 FROM organization_members om WHERE om.user_id = p.id
);
