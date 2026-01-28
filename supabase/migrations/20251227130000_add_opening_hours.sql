-- Dodanie kolumny opening_hours do organization_settings
-- Format JSONB: { "monday": { "enabled": true, "open": "09:00", "close": "21:00" }, ... }

ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{
  "monday": { "enabled": true, "open": "09:00", "close": "21:00" },
  "tuesday": { "enabled": true, "open": "09:00", "close": "21:00" },
  "wednesday": { "enabled": true, "open": "09:00", "close": "21:00" },
  "thursday": { "enabled": true, "open": "09:00", "close": "21:00" },
  "friday": { "enabled": true, "open": "09:00", "close": "21:00" },
  "saturday": { "enabled": true, "open": "09:00", "close": "21:00" },
  "sunday": { "enabled": false, "open": "10:00", "close": "18:00" }
}'::jsonb;

COMMENT ON COLUMN organization_settings.opening_hours IS 'Godziny otwarcia dla każdego dnia tygodnia';
